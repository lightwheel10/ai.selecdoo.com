import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createMonitoringLog, updateMonitoringConfigTimestamps } from "@/lib/monitoring-helpers";

const APIFY_TOKEN = process.env.APIFY_API_KEY!;
const APIFY_ACTOR_ID = process.env.APIFY_ACTOR_ID!;
const APIFY_WOO_ACTOR_ID = process.env.APIFY_WOO_ACTOR_ID;

async function authenticate() {
  if (process.env.NODE_ENV === "development" && process.env.DEV_BYPASS === "true") {
    return { id: "dev-bypass" } as { id: string };
  }
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  return user;
}

type Platform = "shopify" | "woocommerce";

const PRIVATE_IP_RANGES = [
  /^127\./,                         // 127.0.0.0/8 loopback
  /^10\./,                          // 10.0.0.0/8 private
  /^172\.(1[6-9]|2\d|3[01])\./,    // 172.16.0.0/12 private
  /^192\.168\./,                    // 192.168.0.0/16 private
  /^169\.254\./,                    // 169.254.0.0/16 link-local (AWS metadata)
  /^0\./,                           // 0.0.0.0/8
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

async function detectPlatform(storeUrl: string): Promise<Platform> {
  const base = storeUrl.replace(/\/+$/, "");

  // Safety check — don't fetch private/internal URLs
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

export async function POST(req: Request) {
  try {
    if (!await authenticate()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { store_id, update_monitoring } = await req.json();
    if (!store_id) {
      return NextResponse.json({ error: "store_id required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Look up store
    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select("id, url, name, platform, last_scraped_at")
      .eq("id", store_id)
      .single();

    if (storeErr || !store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

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

    // Determine scraper type based on store platform
    const isWooCommerce = platform === "woocommerce";
    const scraperType = isWooCommerce ? "woocommerce" : "shopify";

    if (isWooCommerce && !APIFY_WOO_ACTOR_ID) {
      return NextResponse.json(
        { error: "WooCommerce scraper not configured" },
        { status: 500 }
      );
    }

    // If monitoring update requested, create monitoring log and update timestamps
    let monitoringLogId: string | null = null;
    if (update_monitoring) {
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
      console.error("Failed to create scrape job:", jobErr);
      return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
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
      console.error("Apify start failed:", await apifyRes.text());
      await supabase
        .from("scrape_jobs")
        .update({ status: "failed", error_message: "Failed to start scraper" })
        .eq("id", job.id);
      return NextResponse.json({ error: "Failed to start scraper" }, { status: 500 });
    }

    const apifyData = await apifyRes.json();
    const runId = apifyData.data?.id;
    const datasetId = apifyData.data?.defaultDatasetId;

    // Save Apify IDs to job
    await supabase
      .from("scrape_jobs")
      .update({ apify_run_id: runId, apify_dataset_id: datasetId })
      .eq("id", job.id);

    return NextResponse.json({
      job_id: job.id,
      apify_run_id: runId,
      dataset_id: datasetId,
      store_name: store.name,
    });
  } catch (err) {
    console.error("Scrape API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
