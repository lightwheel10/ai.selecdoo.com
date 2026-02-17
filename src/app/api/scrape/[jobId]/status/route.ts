import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMapper } from "@/lib/product-mappers";
import { detectAndLogChanges } from "@/lib/change-detection";
import { completeMonitoringLog } from "@/lib/monitoring-helpers";

const APIFY_TOKEN = process.env.APIFY_API_KEY!;
const APIFY_FALLBACK_ACTOR_ID = process.env.APIFY_FALLBACK_ACTOR_ID;

async function authenticate() {
  if (process.env.NODE_ENV === "development" && process.env.DEV_BYPASS === "true") {
    return { id: "dev-bypass" } as { id: string };
  }
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  return user;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    if (!await authenticate()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await params;
    const supabase = createAdminClient();

    // Get job
    const { data: job, error: jobErr } = await supabase
      .from("scrape_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobErr || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // If already completed/failed, just return status
    if (job.status === "completed" || job.status === "failed") {
      return NextResponse.json({
        status: job.status,
        products_found: job.products_found,
        products_updated: job.products_updated,
        error_message: job.error_message,
      });
    }

    // Check Apify run status
    if (!job.apify_run_id) {
      return NextResponse.json({ status: "running", products_found: 0, products_updated: 0 });
    }

    const runRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${job.apify_run_id}`,
      { headers: { Authorization: `Bearer ${APIFY_TOKEN}` } }
    );

    if (!runRes.ok) {
      return NextResponse.json({ status: "running", products_found: 0, products_updated: 0 });
    }

    const runData = await runRes.json();
    const runStatus = runData.data?.status;

    // Still running — return current count from Apify stats
    if (runStatus === "RUNNING" || runStatus === "READY") {
      const itemCount = runData.data?.stats?.itemCount ?? 0;
      return NextResponse.json({
        status: "running",
        products_found: itemCount,
        products_updated: 0,
      });
    }

    // Failed
    if (runStatus === "FAILED" || runStatus === "ABORTED" || runStatus === "TIMED-OUT") {
      console.error(`Apify run ${job.apify_run_id} ended with status: ${runStatus}`);
      await supabase
        .from("scrape_jobs")
        .update({
          status: "failed",
          error_message: "Scrape failed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      // Update monitoring log if linked
      if (job.monitoring_log_id) {
        await completeMonitoringLog(
          supabase,
          job.monitoring_log_id,
          { newCount: 0, updatedCount: 0, removedCount: 0, totalChanges: 0 },
          "Scrape failed"
        );
      }

      return NextResponse.json({
        status: "failed",
        products_found: 0,
        products_updated: 0,
        error_message: "Scrape failed",
      });
    }

    // Succeeded — fetch dataset and upsert products
    if (runStatus === "SUCCEEDED") {
      const datasetId = job.apify_dataset_id || runData.data?.defaultDatasetId;

      // Fetch all items from dataset
      const itemsRes = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?limit=10000`,
        { headers: { Authorization: `Bearer ${APIFY_TOKEN}` } }
      );

      if (!itemsRes.ok) {
        await supabase
          .from("scrape_jobs")
          .update({
            status: "failed",
            error_message: "Failed to fetch dataset",
            completed_at: new Date().toISOString(),
          })
          .eq("id", jobId);

        return NextResponse.json({
          status: "failed",
          error_message: "Failed to fetch dataset",
          products_found: 0,
          products_updated: 0,
        });
      }

      const items = await itemsRes.json();

      // ── Fallback: if primary Shopify scraper returned 0 products, try the secondary ──
      if (
        items.length === 0 &&
        !job.fallback_attempted &&
        job.scraper_type !== "woocommerce" &&
        APIFY_FALLBACK_ACTOR_ID
      ) {
        // Look up store URL
        const { data: store } = await supabase
          .from("stores")
          .select("url")
          .eq("id", job.store_id)
          .single();

        if (store?.url) {
          const fallbackRes = await fetch(
            `https://api.apify.com/v2/acts/${APIFY_FALLBACK_ACTOR_ID}/runs`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${APIFY_TOKEN}`,
              },
              body: JSON.stringify({
                storeUrls: [{ url: store.url }],
                maxProducts: 5000,
                proxyConfiguration: { useApifyProxy: true },
              }),
            }
          );

          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            const newRunId = fallbackData.data?.id;
            const newDatasetId = fallbackData.data?.defaultDatasetId;

            await supabase
              .from("scrape_jobs")
              .update({
                apify_run_id: newRunId,
                apify_dataset_id: newDatasetId,
                fallback_attempted: true,
                scraper_type: "shopify_fallback",
              })
              .eq("id", jobId);

            return NextResponse.json({
              status: "running",
              products_found: 0,
              products_updated: 0,
              fallback: true,
            });
          }
        }
      }

      // Use the correct mapper based on scraper type
      const mapper = getMapper(job.scraper_type ?? "shopify", job.fallback_attempted ?? false);
      const allProducts = items.map((item: unknown) => mapper(item, job.store_id));

      // Deduplicate by handle — multilingual WooCommerce stores (WPML/Polylang)
      // return the same product under different IDs but the same slug.
      // Keep first occurrence per handle; null handles are kept as-is.
      const seenHandles = new Set<string>();
      const products = allProducts.filter((p: { handle: string | null }) => {
        if (!p.handle) return true;
        if (seenHandles.has(p.handle)) return false;
        seenHandles.add(p.handle);
        return true;
      });

      // ── Change detection ──
      // Compare new products against existing DB records BEFORE upserting.
      // This also handles marking removed products.
      const changeSummary = await detectAndLogChanges(supabase, job.store_id, products);

      // Upsert products in batches of 50
      // Note: we intentionally exclude is_published/is_featured/is_slider
      // so re-scraping doesn't reset user-set publishing flags
      let totalUpserted = 0;
      const batchSize = 50;
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        const { error: upsertErr } = await supabase
          .from("products")
          .upsert(batch, { onConflict: "hash_id" });

        if (upsertErr) {
          // Batch failed — fall back to one-by-one so one bad row
          // doesn't prevent the rest of the batch from being saved
          for (const product of batch) {
            const { error: singleErr } = await supabase
              .from("products")
              .upsert(product, { onConflict: "hash_id" });
            if (singleErr) {
              console.error(`Upsert failed for hash_id=${product.hash_id}:`, singleErr.message);
            } else {
              totalUpserted += 1;
            }
          }
        } else {
          totalUpserted += batch.length;
        }
      }

      // Update store product_count and last_scraped_at
      await supabase
        .from("stores")
        .update({
          product_count: products.length,
          last_scraped_at: new Date().toISOString(),
        })
        .eq("id", job.store_id);

      // Update monitoring log if linked
      if (job.monitoring_log_id) {
        await completeMonitoringLog(supabase, job.monitoring_log_id, changeSummary);
      }

      // Mark job completed
      await supabase
        .from("scrape_jobs")
        .update({
          status: "completed",
          products_found: products.length,
          products_updated: totalUpserted,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      return NextResponse.json({
        status: "completed",
        products_found: products.length,
        products_updated: totalUpserted,
      });
    }

    // Unknown status — keep polling
    return NextResponse.json({
      status: "running",
      products_found: 0,
      products_updated: 0,
    });
  } catch (err) {
    console.error("Status API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
