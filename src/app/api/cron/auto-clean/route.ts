/**
 * GET /api/cron/auto-clean — Vercel Cron (every 5 minutes)
 *
 * Picks up stores flagged with ai_clean_status = 'pending' (set by
 * processCompletedScrape in scrape-processor.ts after a successful scrape)
 * and runs STORE-LEVEL cleaning:
 *
 *   - Shipping data extraction (Firecrawl → Claude)
 *   - Store descriptions (about page → Claude)
 *   - Affiliate link base auto-generation
 *
 * Product-level cleaning is NOT done here — the AI content generation
 * pipeline works directly with raw scraped product data.
 *
 * Processes ONE store per invocation. Uses CAS (compare-and-swap) to
 * prevent concurrent processing.
 *
 * Stale check: if a store has been 'running' for > 10 minutes, it's
 * reset to 'failed' to avoid blocking the queue.
 */

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAutoClean } from "@/lib/auto-clean";

export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;

/** If a store has been in 'running' state for this long, force-fail it.
 *  Reduced from 1 hour to 10 minutes since we only do store-level clean
 *  now (no product batches), which should complete in under 60 seconds. */
const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

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

    const supabase = createAdminClient();

    // ── Stale check: reset stores stuck in 'running' for > 10 minutes ──
    const { data: staleStores } = await supabase
      .from("stores")
      .select("id, updated_at")
      .eq("ai_clean_status", "running")
      .is("deleted_at", null);

    if (staleStores) {
      for (const staleStore of staleStores) {
        if (staleStore.updated_at) {
          const elapsed = Date.now() - new Date(staleStore.updated_at).getTime();
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

    // ── Run store-level auto-clean ──
    try {
      const result = await runAutoClean(supabase, store.id);

      await supabase
        .from("stores")
        .update({ ai_clean_status: "completed" })
        .eq("id", store.id);

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
