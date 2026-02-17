import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Allowed fields and their DB column mappings
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function authenticate() {
  if (process.env.NODE_ENV === "development" && process.env.DEV_BYPASS === "true") {
    return { id: "dev-bypass" } as { id: string };
  }
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  return user;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!await authenticate()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Invalid store ID" }, { status: 400 });
    }

    const body = await req.json();

    // Build update object with only allowed fields, mapped to DB columns
    const dbUpdate: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    for (const [field, dbColumn] of Object.entries(FIELD_MAP)) {
      if (field in body) {
        let value = body[field];

        // Validate platform value
        if (field === "platform" && !VALID_PLATFORMS.includes(value)) {
          return NextResponse.json(
            { error: `Invalid platform: ${value}` },
            { status: 400 }
          );
        }

        // Validate status value
        if (field === "status" && !VALID_STATUSES.includes(value)) {
          return NextResponse.json(
            { error: `Invalid status: ${value}` },
            { status: 400 }
          );
        }

        // Validate boolean fields
        if (["is_published", "is_featured"].includes(field)) {
          value = Boolean(value);
        }

        // Validate integer fields
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

        // Sanitize string fields — convert empty strings to null
        if (typeof value === "string" && value.trim() === "") {
          value = null;
        }

        dbUpdate[dbColumn] = value;
      }
    }

    // Must have at least one field to update (besides updated_at)
    if (Object.keys(dbUpdate).length <= 1) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify store exists
    const { data: existing, error: lookupErr } = await supabase
      .from("stores")
      .select("id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (lookupErr || !existing) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Perform update
    const { error: updateErr } = await supabase
      .from("stores")
      .update(dbUpdate)
      .eq("id", id);

    if (updateErr) {
      console.error("Store update error:", updateErr);
      return NextResponse.json(
        { error: "Failed to update store" },
        { status: 500 }
      );
    }

    // Side-effect: sync monitoring_configs.enabled when status changes
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!await authenticate()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Invalid store ID" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify store exists
    const { data: existing, error: lookupErr } = await supabase
      .from("stores")
      .select("id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (lookupErr || !existing) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Soft-delete the store
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

    // Disable monitoring
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
