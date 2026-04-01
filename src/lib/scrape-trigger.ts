/**
 * Shared scrape trigger logic.
 *
 * Extracted from /api/scrape/route.ts so that both the manual scrape
 * endpoint and the auto-scrape (triggered on store creation) can reuse
 * the same platform-detection → job-creation → Apify-start pipeline.
 *
 * This module contains NO auth checks — the caller is responsible for
 * verifying permissions before invoking these functions.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = import("@supabase/supabase-js").SupabaseClient<any, any, any>;

const APIFY_TOKEN = process.env.APIFY_API_KEY!;
const APIFY_ACTOR_ID = process.env.APIFY_ACTOR_ID!;
const APIFY_WOO_ACTOR_ID = process.env.APIFY_WOO_ACTOR_ID;

type Platform = "shopify" | "woocommerce";

// ─── URL Safety Check ───

const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
];

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!["https:", "http:"].includes(parsed.protocol)) return false;
    const hostname = parsed.hostname;
    if (hostname === "localhost" || hostname === "[::1]") return false;
    if (PRIVATE_IP_RANGES.some((r) => r.test(hostname))) return false;
    if (!hostname.includes(".")) return false;
    return true;
  } catch {
    return false;
  }
}

// ─── Platform Detection ───
// Probes the store URL to determine if it's Shopify or WooCommerce.
// Only runs on first scrape (when the store hasn't been scraped before).

export async function detectPlatform(storeUrl: string): Promise<Platform> {
  const base = storeUrl.replace(/\/+$/, "");
  if (!isSafeUrl(base)) return "shopify";

  // Check Shopify: /products.json is a Shopify-only endpoint
  try {
    const res = await fetch(`${base}/products.json?limit=1`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.products) return "shopify";
    }
  } catch {
    // not Shopify
  }

  // Check WooCommerce: /wp-json/wc/store/products is WooCommerce Store API
  try {
    const res = await fetch(`${base}/wp-json/wc/store/products?per_page=1`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return "woocommerce";
    }
  } catch {
    // not WooCommerce
  }

  return "shopify"; // default fallback
}

// ─── Trigger Scrape ───
// Creates a scrape_job record and starts the appropriate Apify actor.
// Returns the job metadata so the caller can poll for status.

export interface ScrapeJobResult {
  job_id: string;
  apify_run_id: string;
  dataset_id: string;
  store_name: string;
}

interface TriggerScrapeOptions {
  /** If true, also create a monitoring log and update monitoring timestamps */
  updateMonitoring?: boolean;
}

export async function triggerScrape(
  supabase: AnySupabaseClient,
  store: { id: string; url: string; name: string; platform: string | null; last_scraped_at: string | null },
  options?: TriggerScrapeOptions
): Promise<ScrapeJobResult> {
  // Auto-detect platform on first scrape (when never scraped before)
  let platform: Platform = (store.platform as Platform) ?? "shopify";
  if (!store.last_scraped_at) {
    const detected = await detectPlatform(store.url);
    platform = detected;
    if (detected !== store.platform) {
      await supabase
        .from("stores")
        .update({ platform: detected })
        .eq("id", store.id);
    }
  }

  const isWooCommerce = platform === "woocommerce";
  const scraperType = isWooCommerce ? "woocommerce" : "shopify";

  if (isWooCommerce && !APIFY_WOO_ACTOR_ID) {
    throw new Error("WooCommerce scraper not configured");
  }

  // If monitoring update requested, create monitoring log and update timestamps
  let monitoringLogId: string | null = null;
  if (options?.updateMonitoring) {
    const { createMonitoringLog, updateMonitoringConfigTimestamps } = await import("@/lib/monitoring-helpers");
    monitoringLogId = await createMonitoringLog(supabase, store.id);
    await updateMonitoringConfigTimestamps(supabase, store.id);
  }

  // Create scrape_job record
  const { data: job, error: jobErr } = await supabase
    .from("scrape_jobs")
    .insert({
      store_id: store.id,
      status: "running",
      started_at: new Date().toISOString(),
      scraper_type: scraperType,
      ...(monitoringLogId ? { monitoring_log_id: monitoringLogId } : {}),
    })
    .select("id")
    .single();

  if (jobErr || !job) {
    throw new Error(`Failed to create scrape job: ${jobErr?.message ?? "unknown error"}`);
  }

  // Start Apify run — different actor + input format per platform
  const actorId = isWooCommerce ? APIFY_WOO_ACTOR_ID! : APIFY_ACTOR_ID;
  const actorInput = isWooCommerce
    ? {
        url: [store.url],
        limit: 5000,
      }
    : {
        startUrls: [{ url: store.url }],
        maxRequestsPerCrawl: 0,
        maxRecommendationsPerProduct: 5,
        proxy: { useApifyProxy: true },
      };

  const apifyRes = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/runs`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${APIFY_TOKEN}`,
      },
      body: JSON.stringify(actorInput),
    }
  );

  if (!apifyRes.ok) {
    const errorText = await apifyRes.text();
    console.error("Apify start failed:", errorText);
    await supabase
      .from("scrape_jobs")
      .update({ status: "failed", error_message: "Failed to start scraper" })
      .eq("id", job.id);
    throw new Error("Failed to start scraper");
  }

  const apifyData = await apifyRes.json();
  const runId = apifyData.data?.id;
  const datasetId = apifyData.data?.defaultDatasetId;

  // Save Apify IDs to job
  await supabase
    .from("scrape_jobs")
    .update({ apify_run_id: runId, apify_dataset_id: datasetId })
    .eq("id", job.id);

  return {
    job_id: job.id,
    apify_run_id: runId,
    dataset_id: datasetId,
    store_name: store.name,
  };
}
