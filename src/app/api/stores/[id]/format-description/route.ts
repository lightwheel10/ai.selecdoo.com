import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canEditStoreDetails } from "@/lib/auth/roles";
import { getAuthContext } from "@/lib/auth/session";

const N8N_FORMAT_DESCRIPTION_WEBHOOK_URL =
  process.env.N8N_FORMAT_DESCRIPTION_WEBHOOK_URL!;
const FORMAT_TIMEOUT = 180_000; // 180 seconds — matching v1

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, role, permissions, isDevBypass } = await getAuthContext();

    if (!user && !isDevBypass) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canEditStoreDetails({ role, permissions })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!UUID_RE.test(id)) {
      return NextResponse.json(
        { error: "Invalid store ID" },
        { status: 400 }
      );
    }
    if (!N8N_FORMAT_DESCRIPTION_WEBHOOK_URL) {
      return NextResponse.json(
        { error: "Format description webhook URL not configured" },
        { status: 500 }
      );
    }

    // Descriptions come from the form (not DB) so we format what the user typed
    const body = await req.json();
    const descDe = typeof body.description_de === "string" ? body.description_de.trim() : "";
    const descEn = typeof body.description_en === "string" ? body.description_en.trim() : "";

    if (!descDe && !descEn) {
      return NextResponse.json(
        { error: "No raw descriptions to format" },
        { status: 400 }
      );
    }

    // Fetch store for context (name, url, platform, shipping, affiliate)
    const supabase = createAdminClient();
    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (storeErr || !store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Build payload matching v1 format (sal-dashboard/webhook-handler.js:240-276)
    const payload = {
      type: "store_description",
      timestamp: new Date().toISOString(),
      store: {
        id: store.id,
        name: store.name,
        url: store.url,
        platform: store.platform || null,
        description_german: descDe,
        description_english: descEn,
        affiliate_link_base: store.affiliate_link_base || null,
        program_id: store.program_id || null,
        coupon_code: store.coupon_code || null,
        is_featured: store.is_featured || false,
        logo_url: store.logo_url || null,
        ai_shipping_country: store.ai_shipping_country || null,
        ai_shipping_price: store.ai_shipping_price || null,
        ai_shipping_service: store.ai_shipping_service || null,
        ai_shipping_min_handling_time:
          store.ai_shipping_min_handling_time || null,
        ai_shipping_max_handling_time:
          store.ai_shipping_max_handling_time || null,
        ai_shipping_min_transit_time:
          store.ai_shipping_min_transit_time || null,
        ai_shipping_max_transit_time:
          store.ai_shipping_max_transit_time || null,
      },
      metadata: {
        source: "v2-dashboard",
        version: "2.0",
      },
    };

    // Call n8n webhook with 180s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FORMAT_TIMEOUT);

    try {
      const res = await fetch(N8N_FORMAT_DESCRIPTION_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Type": "store_description",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Webhook returned ${res.status}`);
      }

      const rawResult = await res.json();

      // n8n returns array — get first item (matching v1 pattern)
      const result = Array.isArray(rawResult) ? rawResult[0] : rawResult;

      if (!result || !result.success) {
        throw new Error(
          result?.error || "Webhook returned unsuccessful response"
        );
      }

      // Only return fields that n8n actually produced — don't blank out
      // existing formatted descriptions for languages that weren't sent
      const response: Record<string, unknown> = { success: true };

      if (descEn && result.description_english_formatted) {
        response.description_en_formatted = result.description_english_formatted;
      }
      if (descDe && result.description_german_formatted) {
        response.description_de_formatted = result.description_german_formatted;
      }

      return NextResponse.json(response);
    } catch (err) {
      const isTimeout =
        err instanceof DOMException && err.name === "AbortError";
      console.error(
        "Format description webhook error:",
        isTimeout ? "Connection timeout (180s)" : err
      );

      return NextResponse.json(
        {
          error: isTimeout
            ? "Formatting timed out (180s). AI processing may be taking too long."
            : "Failed to format descriptions",
        },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    console.error("Store format-description error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
