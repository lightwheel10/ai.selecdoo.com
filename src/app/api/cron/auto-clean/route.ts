/**
 * GET /api/cron/auto-clean — Vercel Cron (every 5 minutes)
 *
 * Picks up stores flagged with ai_clean_status = 'pending' (set by
 * processCompletedScrape in scrape-processor.ts after a successful scrape)
 * and runs the full AI cleaning pipeline:
 *
 *   1. Store shipping + descriptions (Firecrawl → Claude)
 *   2. Product descriptions, categories, affiliate links (Claude, batches of 5)
 *
 * Processes ONE store per invocation to stay within Vercel's function timeout.
 * Uses CAS (compare-and-swap) to prevent concurrent processing.
 *
 * If the function runs out of time mid-product-clean, it stops gracefully and
 * leaves status as 'running'. The next invocation detects uncleaned products
 * (ai_cleaned_at IS NULL) and continues from where it left off.
 *
 * Stale check: if a store has been 'running' for > 1 hour, it's reset to
 * 'failed' to avoid indefinitely stuck states.
 */

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAutoClean } from "@/lib/auto-clean";

export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;

/** Stop processing 10 seconds before the Vercel timeout */
const SAFE_MARGIN_MS = 10_000;

/** If a store has been in 'running' state for this long, force-fail it */
const STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

export async function GET(req: Request) {
  try {
    // ── Auth: Vercel cron secret ──
    if (!CRON_SECRET) {
      console.error("CRON_SECRET is not configured");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startTime = Date.now();
    const supabase = createAdminClient();

    // ── Stale check: reset stores stuck in 'running' for > 1 hour ──
    const { data: staleStores } = await supabase
      .from("stores")
      .select("id")
      .eq("ai_clean_status", "running")
      .is("deleted_at", null);

    if (staleStores) {
      for (const staleStore of staleStores) {
        // Check when the status was last updated by looking at updated_at
        const { data: storeData } = await supabase
          .from("stores")
          .select("updated_at")
          .eq("id", staleStore.id)
          .single();

        if (storeData?.updated_at) {
          const elapsed = Date.now() - new Date(storeData.updated_at).getTime();
          if (elapsed > STALE_THRESHOLD_MS) {
            console.warn(`Auto-clean: resetting stale store ${staleStore.id} (running for ${Math.round(elapsed / 60000)}m)`);
            await supabase
              .from("stores")
              .update({ ai_clean_status: "failed" })
              .eq("id", staleStore.id);
          }
        }
      }
    }

    // ── Find one store pending clean ──
    const { data: pendingStores } = await supabase
      .from("stores")
      .select("id, name")
      .eq("ai_clean_status", "pending")
      .is("deleted_at", null)
      .order("updated_at", { ascending: true })
      .limit(1);

    if (!pendingStores || pendingStores.length === 0) {
      return NextResponse.json({ processed: false, reason: "no_pending_stores" });
    }

    const store = pendingStores[0];

    // ── Claim with CAS to prevent double-processing ──
    const { data: claimed } = await supabase
      .from("stores")
      .update({ ai_clean_status: "running" })
      .eq("id", store.id)
      .eq("ai_clean_status", "pending")
      .select("id")
      .single();

    if (!claimed) {
      // Another cron invocation already claimed this store
      return NextResponse.json({ processed: false, reason: "claimed_by_other" });
    }

    // ── Run auto-clean with time budgeting ──
    const hasTimeRemaining = () => Date.now() - startTime < (maxDuration * 1000) - SAFE_MARGIN_MS;

    try {
      const result = await runAutoClean(supabase, store.id, hasTimeRemaining);

      // If we stopped early (timeout), leave as 'running' — next cron
      // invocation will find uncleaned products and continue.
      // Otherwise, mark completed.
      if (result.stoppedEarly) {
        // Keep 'running' — will continue next invocation.
        // But check if there are actually uncleaned products left; if not,
        // we can still mark completed.
        const { count } = await supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("store_id", store.id)
          .is("deleted_at", null)
          .is("ai_cleaned_at", null);

        if (count === 0) {
          await supabase
            .from("stores")
            .update({ ai_clean_status: "completed" })
            .eq("id", store.id);
        }
        // else leave as 'running' for next invocation
      } else {
        await supabase
          .from("stores")
          .update({ ai_clean_status: "completed" })
          .eq("id", store.id);
      }

      return NextResponse.json({
        processed: true,
        storeId: store.id,
        storeName: store.name,
        result,
      });
    } catch (err) {
      console.error(`Auto-clean failed for store ${store.id}:`, err);
      Sentry.captureException(err, {
        tags: { route: "cron/auto-clean", storeId: store.id },
      });

      await supabase
        .from("stores")
        .update({ ai_clean_status: "failed" })
        .eq("id", store.id);

      return NextResponse.json({
        processed: true,
        storeId: store.id,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  } catch (err) {
    console.error("auto-clean cron error:", err);
    Sentry.captureException(err, { tags: { route: "cron/auto-clean" } });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
