import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/auth/roles";
import {
  DEFAULT_WEBHOOK_FIELDS,
  PRODUCT_FIELD_GROUPS,
  STORE_FIELD_GROUPS,
  validateFieldConfig,
} from "@/lib/webhook-payload";

export async function GET() {
  try {
    const { user, role, permissions, isDevBypass } = await getAuthContext();
    if (!user && !isDevBypass) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canAccessAdmin({ role, permissions })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "webhook_fields")
      .single();

    const config =
      data?.value &&
      typeof data.value === "object" &&
      Array.isArray((data.value as Record<string, unknown>).product)
        ? (data.value as { product: string[]; store: string[] })
        : DEFAULT_WEBHOOK_FIELDS;

    // Fetch a random real product + its store for the live preview
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null);

    let sampleProduct = null;
    let sampleStore = null;

    if (count && count > 0) {
      const randomOffset = Math.floor(Math.random() * count);
      const { data: products } = await supabase
        .from("products")
        .select("*")
        .is("deleted_at", null)
        .range(randomOffset, randomOffset);

      if (products?.[0]) {
        sampleProduct = products[0];
        const { data: store } = await supabase
          .from("stores")
          .select("*")
          .eq("id", products[0].store_id)
          .is("deleted_at", null)
          .single();
        sampleStore = store;
      }
    }

    return NextResponse.json({
      config,
      defaults: DEFAULT_WEBHOOK_FIELDS,
      productFieldGroups: PRODUCT_FIELD_GROUPS,
      storeFieldGroups: STORE_FIELD_GROUPS,
      sampleProduct,
      sampleStore,
    });
  } catch (err) {
    console.error("GET webhook-fields error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const { user, role, permissions, isDevBypass } = await getAuthContext();
    if (!user && !isDevBypass) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canAccessAdmin({ role, permissions })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validated = validateFieldConfig(body);
    if (!validated) {
      return NextResponse.json(
        { error: "Invalid config: expected { product: string[], store: string[] }" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Upsert: try update first, insert if not exists
    const { data: existing } = await supabase
      .from("app_settings")
      .select("key")
      .eq("key", "webhook_fields")
      .single();

    if (existing) {
      const { error } = await supabase
        .from("app_settings")
        .update({
          value: validated,
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        })
        .eq("key", "webhook_fields");

      if (error) {
        console.error("Update webhook-fields error:", error);
        return NextResponse.json(
          { error: "Failed to update config" },
          { status: 500 }
        );
      }
    } else {
      const { error } = await supabase.from("app_settings").insert({
        key: "webhook_fields",
        value: validated,
        updated_by: user?.id ?? null,
      });

      if (error) {
        console.error("Insert webhook-fields error:", error);
        return NextResponse.json(
          { error: "Failed to save config" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ config: validated });
  } catch (err) {
    console.error("PUT webhook-fields error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
