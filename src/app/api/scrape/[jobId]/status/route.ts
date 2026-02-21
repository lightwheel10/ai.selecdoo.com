import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { canViewScrape } from "@/lib/auth/roles";
import { getAuthContext } from "@/lib/auth/session";
import {
  checkApifyRunStatus,
  processCompletedScrape,
  handleFailedScrape,
} from "@/lib/scrape-processor";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { user, role, permissions, isDevBypass } = await getAuthContext();
    if (!user && !isDevBypass) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canViewScrape({ role, permissions })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    // If being processed by another caller, report as running
    if (job.status === "processing") {
      return NextResponse.json({ status: "running", products_found: 0, products_updated: 0 });
    }

    // Check Apify run status
    if (!job.apify_run_id) {
      return NextResponse.json({ status: "running", products_found: 0, products_updated: 0 });
    }

    const { runStatus, datasetId, itemCount } = await checkApifyRunStatus(job.apify_run_id);

    // API failure — treat as still running
    if (!runStatus) {
      return NextResponse.json({ status: "running", products_found: 0, products_updated: 0 });
    }

    // Still running
    if (runStatus === "RUNNING" || runStatus === "READY") {
      return NextResponse.json({
        status: "running",
        products_found: itemCount,
        products_updated: 0,
      });
    }

    // Failed
    if (runStatus === "FAILED" || runStatus === "ABORTED" || runStatus === "TIMED-OUT") {
      const result = await handleFailedScrape(supabase, job, runStatus);
      return NextResponse.json(result);
    }

    // Succeeded
    if (runStatus === "SUCCEEDED") {
      const resolvedDatasetId = job.apify_dataset_id || datasetId;
      const result = await processCompletedScrape(supabase, job, resolvedDatasetId!);
      return NextResponse.json(result);
    }

    // Unknown status — keep polling
    return NextResponse.json({
      status: "running",
      products_found: 0,
      products_updated: 0,
    });
  } catch (err) {
    console.error("Status API error:", err);
    Sentry.captureException(err, { tags: { route: "scrape/status" } });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
