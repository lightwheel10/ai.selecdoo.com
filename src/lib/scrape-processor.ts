// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = import("@supabase/supabase-js").SupabaseClient<any, any, any>;
import * as Sentry from "@sentry/nextjs";
import { getMapper } from "@/lib/product-mappers";
import { detectAndLogChanges } from "@/lib/change-detection";
import { completeMonitoringLog } from "@/lib/monitoring-helpers";

const APIFY_TOKEN = process.env.APIFY_API_KEY!;
const APIFY_FALLBACK_ACTOR_ID = process.env.APIFY_FALLBACK_ACTOR_ID;

// ─── Types ───

interface ScrapeJob {
  id: string;
  store_id: string;
  apify_run_id: string | null;
  apify_dataset_id: string | null;
  scraper_type: string | null;
  fallback_attempted: boolean | null;
  monitoring_log_id: string | null;
  status: string;
}

export interface ApifyRunStatus {
  runStatus: string | null;
  datasetId: string | null;
  itemCount: number;
}

export interface ProcessResult {
  status: string;
  products_found?: number;
  products_updated?: number;
  error_message?: string;
  fallback?: boolean;
}

// ─── Check Apify Run Status ───

export async function checkApifyRunStatus(apifyRunId: string): Promise<ApifyRunStatus> {
  const runRes = await fetch(
    `https://api.apify.com/v2/actor-runs/${apifyRunId}`,
    { headers: { Authorization: `Bearer ${APIFY_TOKEN}` } }
  );

  if (!runRes.ok) {
    Sentry.captureMessage(`Apify API returned ${runRes.status} for run ${apifyRunId}`, {
      level: "warning",
      tags: { service: "apify" },
    });
    return { runStatus: null, datasetId: null, itemCount: 0 };
  }

  const runData = await runRes.json();
  return {
    runStatus: runData.data?.status ?? null,
    datasetId: runData.data?.defaultDatasetId ?? null,
    itemCount: runData.data?.stats?.itemCount ?? 0,
  };
}

// ─── Handle Failed Scrape ───

export async function handleFailedScrape(
  supabase: AnySupabaseClient,
  job: ScrapeJob,
  runStatus: string
): Promise<ProcessResult> {
  console.error(`Apify run ${job.apify_run_id} ended with status: ${runStatus}`);
  Sentry.captureMessage(`Apify run failed: ${runStatus}`, {
    level: "error",
    tags: { service: "apify", jobId: job.id, runStatus },
    extra: { runId: job.apify_run_id, storeId: job.store_id },
  });

  await supabase
    .from("scrape_jobs")
    .update({
      status: "failed",
      error_message: `Scrape failed: ${runStatus}`,
      completed_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  if (job.monitoring_log_id) {
    await completeMonitoringLog(
      supabase,
      job.monitoring_log_id,
      { newCount: 0, updatedCount: 0, removedCount: 0, totalChanges: 0 },
      `Scrape failed: ${runStatus}`
    );
  }

  return {
    status: "failed",
    products_found: 0,
    products_updated: 0,
    error_message: `Scrape failed: ${runStatus}`,
  };
}

// ─── Start Fallback Scraper ───

async function startFallbackScraper(
  supabase: AnySupabaseClient,
  job: ScrapeJob
): Promise<boolean> {
  if (!APIFY_FALLBACK_ACTOR_ID) return false;

  const { data: store } = await supabase
    .from("stores")
    .select("url")
    .eq("id", job.store_id)
    .single();

  if (!store?.url) return false;

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

  if (!fallbackRes.ok) return false;

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
    .eq("id", job.id);

  return true;
}

// ─── Process Completed Scrape ───

export async function processCompletedScrape(
  supabase: AnySupabaseClient,
  job: ScrapeJob,
  datasetId: string
): Promise<ProcessResult> {
  // Optimistic lock: claim the job so concurrent callers don't double-process
  const { data: claimed } = await supabase
    .from("scrape_jobs")
    .update({ status: "processing" })
    .eq("id", job.id)
    .eq("status", "running")
    .select("id")
    .single();

  if (!claimed) {
    // Already being processed or completed by another caller
    return { status: "running", products_found: 0, products_updated: 0 };
  }

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
      .eq("id", job.id);

    return {
      status: "failed",
      error_message: "Failed to fetch dataset",
      products_found: 0,
      products_updated: 0,
    };
  }

  const items = await itemsRes.json();

  // Fallback: if primary Shopify scraper returned 0 products, try the secondary
  if (
    items.length === 0 &&
    !job.fallback_attempted &&
    job.scraper_type !== "woocommerce" &&
    APIFY_FALLBACK_ACTOR_ID
  ) {
    const started = await startFallbackScraper(supabase, job);
    if (started) {
      // Reset status back to running for the fallback run
      await supabase
        .from("scrape_jobs")
        .update({ status: "running" })
        .eq("id", job.id);
      return { status: "running", products_found: 0, products_updated: 0, fallback: true };
    }
  }

  // Use the correct mapper based on scraper type
  const mapper = getMapper(job.scraper_type ?? "shopify", job.fallback_attempted ?? false);
  const allProducts = items.map((item: unknown) => mapper(item, job.store_id));

  // Deduplicate by handle
  const seenHandles = new Set<string>();
  const products = allProducts.filter((p: { handle: string | null }) => {
    if (!p.handle) return true;
    if (seenHandles.has(p.handle)) return false;
    seenHandles.add(p.handle);
    return true;
  });

  // Change detection (before upsert)
  const changeSummary = await detectAndLogChanges(supabase, job.store_id, products);

  // Upsert products in batches of 50
  let totalUpserted = 0;
  const batchSize = 50;
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const { error: upsertErr } = await supabase
      .from("products")
      .upsert(batch, { onConflict: "hash_id" });

    if (upsertErr) {
      for (const product of batch) {
        const { error: singleErr } = await supabase
          .from("products")
          .upsert(product, { onConflict: "hash_id" });
        if (singleErr) {
          console.error(`Upsert failed for hash_id=${product.hash_id}:`, singleErr.message);
          Sentry.captureException(new Error(singleErr.message), {
            tags: { query: "productUpsert", jobId: job.id },
            extra: { hashId: product.hash_id },
          });
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
    .eq("id", job.id);

  return {
    status: "completed",
    products_found: products.length,
    products_updated: totalUpserted,
  };
}
