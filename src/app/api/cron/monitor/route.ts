import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createMonitoringLog,
  updateMonitoringConfigTimestamps,
} from "@/lib/monitoring-helpers";

const APIFY_TOKEN = process.env.APIFY_API_KEY!;
const APIFY_ACTOR_ID = process.env.APIFY_ACTOR_ID!;
const APIFY_WOO_ACTOR_ID = process.env.APIFY_WOO_ACTOR_ID;
const CRON_SECRET = process.env.CRON_SECRET;

const MAX_STORES_PER_RUN = 5;

export async function GET(req: Request) {
  try {
    // Verify cron secret
    if (!CRON_SECRET) {
      console.error("CRON_SECRET is not configured");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Find stores due for monitoring check
    const now = new Date().toISOString();
    const { data: dueConfigs, error: configErr } = await supabase
      .from("monitoring_configs")
      .select("store_id, check_interval_hours")
      .eq("enabled", true)
      .lte("next_check_at", now)
      .limit(MAX_STORES_PER_RUN);

    if (configErr || !dueConfigs || dueConfigs.length === 0) {
      return NextResponse.json({ triggered: 0 });
    }

    // Verify stores are active and not deleted
    const storeIds = dueConfigs.map((c) => c.store_id);
    const { data: activeStores } = await supabase
      .from("stores")
      .select("id, url, platform")
      .in("id", storeIds)
      .eq("status", "active")
      .is("deleted_at", null);

    if (!activeStores || activeStores.length === 0) {
      return NextResponse.json({ triggered: 0 });
    }

    const activeStoreMap = new Map(activeStores.map((s) => [s.id, s]));
    let triggered = 0;

    for (const config of dueConfigs) {
      const store = activeStoreMap.get(config.store_id);
      if (!store) continue;

      try {
        // Create monitoring log
        const logId = await createMonitoringLog(supabase, store.id);

        // Determine scraper
        const isWooCommerce = store.platform === "woocommerce";
        const scraperType = isWooCommerce ? "woocommerce" : "shopify";

        if (isWooCommerce && !APIFY_WOO_ACTOR_ID) continue;

        // Create scrape job
        const { data: job, error: jobErr } = await supabase
          .from("scrape_jobs")
          .insert({
            store_id: store.id,
            status: "running",
            started_at: new Date().toISOString(),
            scraper_type: scraperType,
            ...(logId ? { monitoring_log_id: logId } : {}),
          })
          .select("id")
          .single();

        if (jobErr || !job) continue;

        // Start Apify run
        const actorId = isWooCommerce ? APIFY_WOO_ACTOR_ID! : APIFY_ACTOR_ID;
        const actorInput = isWooCommerce
          ? { url: [store.url], limit: 5000 }
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
          const apifyErrText = await apifyRes.text();
          console.error(`Cron: Apify start failed for store ${store.id}:`, apifyErrText);
          Sentry.captureMessage(`Cron: Apify start failed for store ${store.id}`, { level: "error", tags: { service: "apify", storeId: store.id }, extra: { status: apifyRes.status, body: apifyErrText } });
          await supabase
            .from("scrape_jobs")
            .update({ status: "failed", error_message: "Failed to start scraper" })
            .eq("id", job.id);
          continue;
        }

        const apifyData = await apifyRes.json();
        const runId = apifyData.data?.id;
        const datasetId = apifyData.data?.defaultDatasetId;

        // Save Apify IDs
        await supabase
          .from("scrape_jobs")
          .update({ apify_run_id: runId, apify_dataset_id: datasetId })
          .eq("id", job.id);

        // Update monitoring timestamps with jitter (0-5 min)
        await updateMonitoringConfigTimestamps(supabase, store.id);

        triggered++;
      } catch (err) {
        console.error(`Cron: failed to trigger store ${store.id}:`, err);
        Sentry.captureException(err, { tags: { route: "cron/monitor", storeId: store.id } });
      }
    }

    return NextResponse.json({ triggered });
  } catch (err) {
    console.error("Cron monitor error:", err);
    Sentry.captureException(err, { tags: { route: "cron/monitor" } });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
