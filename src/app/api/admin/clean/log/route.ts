import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";

interface LogRequest {
  storeId: string | null;
  scope: string;
  items_processed: number;
  items_updated: number;
  items_skipped: number;
  message: string;
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
    const { storeId, scope, items_processed, items_updated, items_skipped, message } = body;

    const status = items_skipped > 0 && items_updated === 0
      ? "error"
      : items_skipped > 0
        ? "skipped"
        : "success";

    const supabase = createAdminClient();
    const { error } = await supabase.from("ai_activity_logs").insert({
      store_id: storeId,
      event_type: scope,
      scope,
      status,
      message,
      metadata: { items_processed, items_updated, items_skipped },
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
