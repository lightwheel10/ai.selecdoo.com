import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const APIFY_TOKEN = process.env.APIFY_API_KEY!;
const APIFY_ACTOR_ID = process.env.APIFY_ACTOR_ID!;
const APIFY_WOO_ACTOR_ID = process.env.APIFY_WOO_ACTOR_ID;

type Platform = "shopify" | "woocommerce";

async function detectPlatform(storeUrl: string): Promise<Platform> {
  const base = storeUrl.replace(/\/+$/, "");

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
    const { store_id } = await req.json();
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

    // Create scrape_job record
    const { data: job, error: jobErr } = await supabase
      .from("scrape_jobs")
      .insert({
        store_id: store.id,
        status: "running",
        started_at: new Date().toISOString(),
        scraper_type: scraperType,
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
      `https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(actorInput),
      }
    );

    if (!apifyRes.ok) {
      const errText = await apifyRes.text();
      console.error("Apify start failed:", errText);
      await supabase
        .from("scrape_jobs")
        .update({ status: "failed", error_message: "Failed to start Apify run" })
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
