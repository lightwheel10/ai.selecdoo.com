import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  checkApifyRunStatus,
  processCompletedScrape,
  handleFailedScrape,
  type ProcessResult,
} from "@/lib/scrape-processor";

export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;
const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

export async function GET(req: Request) {
  try {
    if (!CRON_SECRET) {
      console.error("CRON_SECRET is not configured");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Find running jobs with an Apify run ID, oldest first
    const { data: jobs, error: jobsErr } = await supabase
      .from("scrape_jobs")
      .select("*")
      .eq("status", "running")
      .not("apify_run_id", "is", null)
      .order("started_at", { ascending: true })
      .limit(10);

    if (jobsErr) {
      console.error("poll-scrapes: failed to query jobs:", jobsErr.message);
      Sentry.captureException(new Error(jobsErr.message), { tags: { route: "cron/poll-scrapes" } });
      return NextResponse.json({ error: "Failed to query jobs" }, { status: 500 });
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ processed: 0, results: [] });
    }

    const results: Array<{ jobId: string; storeId: string; result: ProcessResult }> = [];

    // Process sequentially to stay within Vercel timeout and memory limits
    for (const job of jobs) {
      try {
        // Stale check: if started more than 2 hours ago, force-fail
        const startedAt = new Date(job.started_at).getTime();
        if (Date.now() - startedAt > STALE_THRESHOLD_MS) {
          const result = await handleFailedScrape(supabase, job, "STALE");
          results.push({ jobId: job.id, storeId: job.store_id, result });
          continue;
        }

        const { runStatus, datasetId } = await checkApifyRunStatus(job.apify_run_id);

        // API failure or still running — skip
        if (!runStatus || runStatus === "RUNNING" || runStatus === "READY") {
          continue;
        }

        // Failed
        if (runStatus === "FAILED" || runStatus === "ABORTED" || runStatus === "TIMED-OUT") {
          const result = await handleFailedScrape(supabase, job, runStatus);
          results.push({ jobId: job.id, storeId: job.store_id, result });
          continue;
        }

        // Succeeded
        if (runStatus === "SUCCEEDED") {
          const resolvedDatasetId = job.apify_dataset_id || datasetId;
          if (!resolvedDatasetId) {
            const result = await handleFailedScrape(supabase, job, "NO_DATASET");
            results.push({ jobId: job.id, storeId: job.store_id, result });
            continue;
          }
          const result = await processCompletedScrape(supabase, job, resolvedDatasetId);
          results.push({ jobId: job.id, storeId: job.store_id, result });
        }
      } catch (err) {
        console.error(`poll-scrapes: error processing job ${job.id}:`, err);
        Sentry.captureException(err, {
          tags: { route: "cron/poll-scrapes", jobId: job.id, storeId: job.store_id },
        });
      }
    }

    return NextResponse.json({ processed: results.length, results });
  } catch (err) {
    console.error("poll-scrapes error:", err);
    Sentry.captureException(err, { tags: { route: "cron/poll-scrapes" } });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
