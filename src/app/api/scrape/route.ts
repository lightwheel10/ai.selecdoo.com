import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const APIFY_TOKEN = process.env.APIFY_API_KEY!;
const APIFY_ACTOR_ID = process.env.APIFY_ACTOR_ID!;

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
      .select("id, url, name")
      .eq("id", store_id)
      .single();

    if (storeErr || !store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Create scrape_job record
    const { data: job, error: jobErr } = await supabase
      .from("scrape_jobs")
      .insert({
        store_id: store.id,
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (jobErr || !job) {
      console.error("Failed to create scrape job:", jobErr);
      return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
    }

    // Start Apify run
    const apifyRes = await fetch(
      `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs?token=${APIFY_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startUrls: [{ url: store.url }],
          maxRequestsPerCrawl: 0, // no limit
          maxRecommendationsPerProduct: 0,
          proxy: { useApifyProxy: true },
        }),
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
