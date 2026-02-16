import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const APIFY_TOKEN = process.env.APIFY_API_KEY!;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApifyProduct(item: any, storeId: string) {
  const firstVariant = item.variants?.[0];
  const priceCents = firstVariant?.price?.current ?? 0;
  const previousCents = firstVariant?.price?.previous ?? 0;
  const price = priceCents / 100;
  const originalPrice = previousCents > 0 ? previousCents / 100 : null;
  const discountPct =
    originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : null;

  const canonicalUrl = item.source?.canonicalUrl ?? "";
  const handle = canonicalUrl.split("/products/")[1]?.split("?")[0] ?? null;

  // Convert epoch ms timestamps to ISO strings
  const toISO = (ms: number | undefined | null) =>
    ms ? new Date(ms).toISOString() : null;

  return {
    store_id: storeId,
    hash_id: String(item.source?.id ?? `${Date.now()}_${Math.random()}`),
    title: item.title ?? "Untitled",
    handle,
    sku: firstVariant?.sku ?? null,
    brand: item.brand ?? null,
    description: item.description ?? null,
    price,
    original_price: originalPrice,
    discount_percentage: discountPct,
    currency: item.source?.currency ?? "EUR",
    in_stock: firstVariant?.price?.stockStatus === "InStock",
    image_url: item.medias?.[0]?.url ?? null,
    product_url: canonicalUrl || null,
    variants: item.variants ?? null,
    categories: item.categories ?? null,
    tags: item.tags ?? null,
    medias: item.medias ?? null,
    recommend_products: item.recommendProducts ?? null,
    options: item.options ?? null,
    source_retailer: item.source?.retailer ?? null,
    source_language: item.source?.language ?? null,
    source_created_at: toISO(item.source?.createdUTC),
    source_updated_at: toISO(item.source?.updatedUTC),
    source_published_at: toISO(item.source?.publishedUTC),
    status: "active",
    updated_at: new Date().toISOString(),
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
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
      `https://api.apify.com/v2/actor-runs/${job.apify_run_id}?token=${APIFY_TOKEN}`
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
        apify_status: runStatus,
      });
    }

    // Failed
    if (runStatus === "FAILED" || runStatus === "ABORTED" || runStatus === "TIMED-OUT") {
      await supabase
        .from("scrape_jobs")
        .update({
          status: "failed",
          error_message: `Apify run ${runStatus}`,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      return NextResponse.json({
        status: "failed",
        products_found: 0,
        products_updated: 0,
        error_message: `Apify run ${runStatus}`,
      });
    }

    // Succeeded — fetch dataset and upsert products
    if (runStatus === "SUCCEEDED") {
      const datasetId = job.apify_dataset_id || runData.data?.defaultDatasetId;

      // Fetch all items from dataset
      const itemsRes = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=10000`
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
      const products = items.map((item: unknown) => mapApifyProduct(item, job.store_id));
      const scrapedHashIds = products.map((p: { hash_id: string }) => p.hash_id);

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
          console.error(`Upsert batch ${i} error:`, upsertErr);
        } else {
          totalUpserted += batch.length;
        }
      }

      // Mark products NOT in this scrape as removed
      // (they were in our DB but no longer on the store)
      if (scrapedHashIds.length > 0) {
        const { data: existing } = await supabase
          .from("products")
          .select("hash_id")
          .eq("store_id", job.store_id)
          .eq("status", "active")
          .is("deleted_at", null);

        const removedHashIds = (existing ?? [])
          .map((p) => p.hash_id)
          .filter((hid: string) => !scrapedHashIds.includes(hid));

        if (removedHashIds.length > 0) {
          await supabase
            .from("products")
            .update({ status: "removed", updated_at: new Date().toISOString() })
            .eq("store_id", job.store_id)
            .in("hash_id", removedHashIds);
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

    // Unknown status
    return NextResponse.json({
      status: "running",
      products_found: 0,
      products_updated: 0,
      apify_status: runStatus,
    });
  } catch (err) {
    console.error("Status API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
