import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  canDeleteStore,
  canEditStoreDetails,
  canUpdateStoreStatus,
} from "@/lib/auth/roles";
import { getAuthContext } from "@/lib/auth/session";

const FIELD_MAP: Record<string, string> = {
  name: "name",
  url: "url",
  platform: "platform",
  status: "status",
  is_published: "is_published",
  is_featured: "is_featured",
  affiliate_link_base: "affiliate_link_base",
  program_id: "program_id",
  coupon_code: "coupon_code",
  description_en: "description_en",
  description_de: "description_de",
  description_en_formatted: "description_en_formatted",
  description_de_formatted: "description_de_formatted",
  logo_url: "logo_url",
  shipping_country: "ai_shipping_country",
  shipping_price: "ai_shipping_price",
  shipping_service: "ai_shipping_service",
  shipping_min_handling_days: "ai_shipping_min_handling_time",
  shipping_max_handling_days: "ai_shipping_max_handling_time",
  shipping_min_transit_days: "ai_shipping_min_transit_time",
  shipping_max_transit_days: "ai_shipping_max_transit_time",
};

const VALID_PLATFORMS = ["shopify", "woocommerce", "magento", "custom"];
const VALID_STATUSES = ["active", "paused"];

const MAX_BODY_SIZE = 16_384; // 16 KB
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
    if (contentLength > MAX_BODY_SIZE) {
      return NextResponse.json({ error: "Request body too large" }, { status: 413 });
    }

    const { id } = await params;
    const { user, role, permissions, isDevBypass } = await getAuthContext();

    if (!user && !isDevBypass) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Invalid store ID" }, { status: 400 });
    }

    const body = await req.json();

    const requestedFields = Object.keys(FIELD_MAP).filter((field) => field in body);
    if (requestedFields.length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // Operators can only toggle store status. Any broader payload is admin-only.
    const statusOnlyUpdate = requestedFields.every((field) => field === "status");
    if (statusOnlyUpdate) {
      if (!canUpdateStoreStatus({ role, permissions })) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (!canEditStoreDetails({ role, permissions })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const dbUpdate: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    for (const [field, dbColumn] of Object.entries(FIELD_MAP)) {
      if (field in body) {
        let value = body[field];

        if (field === "platform" && !VALID_PLATFORMS.includes(value)) {
          return NextResponse.json(
            { error: `Invalid platform: ${value}` },
            { status: 400 }
          );
        }

        if (field === "status" && !VALID_STATUSES.includes(value)) {
          return NextResponse.json(
            { error: `Invalid status: ${value}` },
            { status: 400 }
          );
        }

        if (["is_published", "is_featured"].includes(field)) {
          value = Boolean(value);
        }

        if (field.startsWith("shipping_min_") || field.startsWith("shipping_max_")) {
          if (value !== null && value !== undefined && value !== "") {
            const num = parseInt(value, 10);
            if (isNaN(num) || num < 0 || num > 99) {
              return NextResponse.json(
                { error: `Invalid ${field}: must be 0-99` },
                { status: 400 }
              );
            }
            value = num;
          } else {
            value = null;
          }
        }

        if (typeof value === "string" && value.trim() === "") {
          value = null;
        }

        dbUpdate[dbColumn] = value;
      }
    }

    const supabase = createAdminClient();

    const { data: existing, error: lookupErr } = await supabase
      .from("stores")
      .select("id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (lookupErr || !existing) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const { error: updateErr } = await supabase
      .from("stores")
      .update(dbUpdate)
      .eq("id", id);

    if (updateErr) {
      console.error("Store update error:", updateErr);
      return NextResponse.json({ error: "Failed to update store" }, { status: 500 });
    }

    if ("status" in body) {
      const monitoringEnabled = body.status === "active";
      await supabase
        .from("monitoring_configs")
        .update({ enabled: monitoringEnabled, updated_at: new Date().toISOString() })
        .eq("store_id", id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Store PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, role, permissions, isDevBypass } = await getAuthContext();

    if (!user && !isDevBypass) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canDeleteStore({ role, permissions })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Invalid store ID" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: existing, error: lookupErr } = await supabase
      .from("stores")
      .select("id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (lookupErr || !existing) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const { error: deleteErr } = await supabase
      .from("stores")
      .update({
        deleted_at: new Date().toISOString(),
        status: "paused",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (deleteErr) {
      console.error("Store delete error:", deleteErr);
      return NextResponse.json({ error: "Failed to delete store" }, { status: 500 });
    }

    await supabase
      .from("monitoring_configs")
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq("store_id", id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Store DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
