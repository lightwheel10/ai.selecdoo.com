import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/auth/roles";
import {
  DEFAULT_WEBHOOK_FIELDS,
  DEFAULT_SEND_WEBHOOK_FIELDS,
  PRODUCT_FIELD_GROUPS,
  STORE_FIELD_GROUPS,
  validateFieldConfig,
} from "@/lib/webhook-payload";

// DB keys for each webhook type
const SETTINGS_KEYS = {
  generate: "webhook_fields",       // backward compatible with existing key
  send: "webhook_fields_send",
} as const;

const DEFAULTS = {
  generate: DEFAULT_WEBHOOK_FIELDS,
  send: DEFAULT_SEND_WEBHOOK_FIELDS,
} as const;

type WebhookType = keyof typeof SETTINGS_KEYS;

function parseWebhookType(value: string | null): WebhookType {
  return value === "send" ? "send" : "generate";
}

export async function GET(req: NextRequest) {
  try {
    const { user, role, permissions, isDevBypass } = await getAuthContext();
    if (!user && !isDevBypass) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canAccessAdmin({ role, permissions })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const type = parseWebhookType(req.nextUrl.searchParams.get("type"));
    const requestedProductId = req.nextUrl.searchParams.get("productId");
    const dbKey = SETTINGS_KEYS[type];
    const defaults = DEFAULTS[type];

    const supabase = createAdminClient();
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", dbKey)
      .single();

    const config =
      data?.value &&
      typeof data.value === "object" &&
      Array.isArray((data.value as Record<string, unknown>).product)
        ? (data.value as { product: string[]; store: string[] })
        : defaults;

    // ── Fetch sample product + store for live preview ──
    // Priority: user-selected productId > send-tab auto-pick (product with content) > random
    let sampleProduct = null;
    let sampleStore = null;
    let sampleContent = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function fetchStoreForProduct(product: any) {
      const { data: store } = await supabase
        .from("stores")
        .select("*")
        .eq("id", product.store_id)
        .is("deleted_at", null)
        .single();
      return store;
    }

    async function fetchContentForProduct(productId: string) {
      const { data: rows } = await supabase
        .from("ai_content")
        .select("content, content_type, status, created_at")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(1);
      return rows?.[0] ?? null;
    }

    if (requestedProductId) {
      // User selected a specific product via the product picker
      const { data: products } = await supabase
        .from("products")
        .select("*")
        .eq("id", requestedProductId)
        .limit(1);

      if (products?.[0]) {
        sampleProduct = products[0];
        sampleStore = await fetchStoreForProduct(products[0]);
        // For send tab, also fetch the product's AI content
        if (type === "send") {
          sampleContent = await fetchContentForProduct(requestedProductId);
        }
      }
    } else if (type === "send") {
      // Send tab without specific product: pick one that has AI content
      const { data: contentRows } = await supabase
        .from("ai_content")
        .select("product_id, content, content_type, status, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (contentRows && contentRows.length > 0) {
        const randomRow = contentRows[Math.floor(Math.random() * contentRows.length)];
        sampleContent = {
          content: randomRow.content,
          content_type: randomRow.content_type,
          status: randomRow.status,
          created_at: randomRow.created_at,
        };

        const { data: products } = await supabase
          .from("products")
          .select("*")
          .eq("id", randomRow.product_id)
          .limit(1);

        if (products?.[0]) {
          sampleProduct = products[0];
          sampleStore = await fetchStoreForProduct(products[0]);
        }
      }
    }

    // Fallback: pick any random product
    if (!sampleProduct) {
      const { count } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null);

      if (count && count > 0) {
        const randomOffset = Math.floor(Math.random() * count);
        const { data: products } = await supabase
          .from("products")
          .select("*")
          .is("deleted_at", null)
          .range(randomOffset, randomOffset);

        if (products?.[0]) {
          sampleProduct = products[0];
          sampleStore = await fetchStoreForProduct(products[0]);
        }
      }
    }

    return NextResponse.json({
      type,
      config,
      defaults,
      productFieldGroups: PRODUCT_FIELD_GROUPS,
      storeFieldGroups: STORE_FIELD_GROUPS,
      sampleProduct,
      sampleStore,
      sampleContent,
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

    // Body must include `type` ("generate" or "send") to know which config to save
    const type = parseWebhookType(body.type ?? null);
    const dbKey = SETTINGS_KEYS[type];

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
      .eq("key", dbKey)
      .single();

    if (existing) {
      const { error } = await supabase
        .from("app_settings")
        .update({
          value: validated,
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        })
        .eq("key", dbKey);

      if (error) {
        console.error("Update webhook-fields error:", error);
        return NextResponse.json(
          { error: "Failed to update config" },
          { status: 500 }
        );
      }
    } else {
      const { error } = await supabase.from("app_settings").insert({
        key: dbKey,
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
