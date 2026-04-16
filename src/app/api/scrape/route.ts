/**
 * POST /api/scrape — Start a product scrape for a store.
 *
 * Refactored: core scrape logic (platform detection, Apify start) is now
 * in src/lib/scrape-trigger.ts so it can be reused by the auto-scrape
 * flow triggered on store creation (POST /api/stores).
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canRunMonitoring, canStartScrape, canUsePaidFeature } from "@/lib/auth/roles";
import { getAuthContext } from "@/lib/auth/session";
import { triggerScrape } from "@/lib/scrape-trigger";

const MAX_BODY_SIZE = 16_384; // 16 KB

export async function POST(req: Request) {
  try {
    const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
    if (contentLength > MAX_BODY_SIZE) {
      return NextResponse.json({ error: "Request body too large" }, { status: 413 });
    }

    const { user, role, permissions, isDevBypass, workspaceId, subscription } = await getAuthContext();
    if (!user && !isDevBypass) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { store_id, update_monitoring } = await req.json();
    if (!store_id) {
      return NextResponse.json({ error: "store_id required" }, { status: 400 });
    }

    // Monitoring "Run now" is a separate permission from manual scraping.
    if (update_monitoring) {
      if (!canRunMonitoring({ role, permissions })) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (!canStartScrape({ role, permissions })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!canUsePaidFeature({ isDevBypass, subscription })) {
      return NextResponse.json({ error: "Active subscription required" }, { status: 402 });
    }

    const supabase = createAdminClient();

    // Look up store
    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select("id, url, name, platform, last_scraped_at")
      .eq("id", store_id)
      .eq("workspace_id", workspaceId)
      .single();

    if (storeErr || !store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Delegate to shared scrape trigger (platform detection + Apify start)
    const result = await triggerScrape(supabase, store, {
      updateMonitoring: !!update_monitoring,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Scrape API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
