import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";

interface LogResultItem {
  id: string;
  label: string;
  status: "success" | "error" | "skipped";
  error?: string;
  store_name?: string;
  source?: string;
  descriptions_generated?: boolean;
}

interface LogRequest {
  storeId: string | null;
  scope: string;
  items_processed: number;
  items_updated: number;
  items_skipped: number;
  message: string;
  results?: LogResultItem[];
  elapsed_ms?: number;
}

export async function POST(req: Request) {
  try {
    const { role, permissions, user, isDevBypass } = await getAuthContext();
    if (!user && !isDevBypass) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canAccessAdmin({ role, permissions })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: LogRequest = await req.json();
    const { storeId, scope, items_processed, items_updated, items_skipped, message, results, elapsed_ms } = body;

    const status = items_skipped > 0 && items_updated === 0
      ? "error"
      : items_skipped > 0
        ? "skipped"
        : "success";

    // Cap results at 50 items to avoid bloated metadata
    const cappedResults = results?.slice(0, 50);

    const supabase = createAdminClient();
    const { error } = await supabase.from("ai_activity_logs").insert({
      store_id: storeId,
      event_type: scope,
      scope,
      status,
      message,
      metadata: {
        items_processed,
        items_updated,
        items_skipped,
        ...(cappedResults && { results: cappedResults, truncated: results!.length > 50 }),
        ...(elapsed_ms != null && { elapsed_ms }),
      },
    });

    if (error) {
      console.error("Activity log insert error:", error);
      return NextResponse.json({ error: "Failed to write log" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Clean log API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
