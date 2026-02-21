import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth/session";
import { canGenerateAIContent } from "@/lib/auth/roles";

const N8N_URLS = {
  deal_post: process.env.N8N_DEALS_WEBHOOK_URL!,
  social_post: process.env.N8N_POSTS_WEBHOOK_URL!,
} as const;

const N8N_TIMEOUT = 120_000; // 120 seconds

// ─── n8n response parsing (ported from v1 ai-content.js) ───

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseN8nResponse(raw: any): string {
  // 1. Array with .text entries
  if (Array.isArray(raw) && raw.length > 0 && raw[0]?.text) {
    return raw.map((item: { text: string }) => item.text).join("\n\n");
  }

  // 2. Array with .raw object containing German fields
  if (Array.isArray(raw) && raw.length > 0 && raw[0]?.raw) {
    return flattenGermanFields(raw[0].raw);
  }

  // 3. Object with body_text/subject (email-style)
  if (raw && typeof raw === "object" && !Array.isArray(raw) && raw.body_text) {
    const parts: string[] = [];
    if (raw.subject) parts.push(raw.subject);
    if (raw.body_text) parts.push(raw.body_text);
    return parts.join("\n\n");
  }

  // 4. Object with direct German fields
  if (raw && typeof raw === "object" && !Array.isArray(raw) && (raw.h1 || raw.einleitung)) {
    return flattenGermanFields(raw);
  }

  // 5. String
  if (typeof raw === "string") {
    return raw;
  }

  // Fallback: stringify
  return JSON.stringify(raw);
}

const GERMAN_FIELD_ORDER = [
  "h1", "einleitung", "problem", "produkt", "inhalt",
  "vorteile", "rabatt", "countdown", "abschluss", "link",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenGermanFields(obj: Record<string, any>): string {
  const parts: string[] = [];
  for (const key of GERMAN_FIELD_ORDER) {
    if (obj[key] && typeof obj[key] === "string") {
      parts.push(obj[key]);
    }
  }
  // Include any remaining fields not in the known list
  for (const [key, value] of Object.entries(obj)) {
    if (!GERMAN_FIELD_ORDER.includes(key) && typeof value === "string" && value.trim()) {
      parts.push(value);
    }
  }
  return parts.join("\n\n");
}

export async function POST(req: Request) {
  try {
    const { user, role, permissions, isDevBypass } = await getAuthContext();
    if (!user && !isDevBypass) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canGenerateAIContent({ role, permissions })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { productId, contentType } = body as {
      productId?: string;
      contentType?: string;
    };

    if (!productId || typeof productId !== "string") {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }
    if (contentType !== "deal_post" && contentType !== "social_post") {
      return NextResponse.json(
        { error: "contentType must be 'deal_post' or 'social_post'" },
        { status: 400 }
      );
    }

    const webhookUrl = N8N_URLS[contentType];
    if (!webhookUrl) {
      return NextResponse.json(
        { error: "Webhook URL not configured" },
        { status: 500 }
      );
    }

    const supabase = createAdminClient();

    // Fetch product (full row for hash_id etc.)
    const { data: product, error: productErr } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .is("deleted_at", null)
      .single();

    if (productErr || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Fetch store
    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select("*")
      .eq("id", product.store_id)
      .is("deleted_at", null)
      .single();

    if (storeErr || !store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Map v2 fields to v1 payload format (what n8n expects)
    const payload = {
      product: {
        id: product.id,
        hash_id: product.hash_id,
        title: product.cleaned_title || product.title,
        description: product.description,
        image: product.image_url,
        link: product.product_url,
        price: product.price,
        sale_price: product.original_price,
        discount: product.discount_percentage,
        brand: product.brand,
        currency: product.currency,
        in_stock: product.in_stock,
        stores: {
          id: store.id,
          name: store.name,
          url: store.url,
          platform: store.platform,
          status: store.status,
          created_at: store.created_at,
        },
      },
    };

    // Call n8n webhook
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), N8N_TIMEOUT);

    let n8nResponse;
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "Unknown error");
        console.error("n8n webhook error:", res.status, errText);
        return NextResponse.json(
          { error: `n8n returned ${res.status}` },
          { status: 502 }
        );
      }

      n8nResponse = await res.json();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return NextResponse.json(
          { error: "n8n webhook timed out" },
          { status: 504 }
        );
      }
      console.error("n8n fetch error:", err);
      return NextResponse.json(
        { error: "Failed to reach n8n webhook" },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeout);
    }

    // Parse response
    const content = parseN8nResponse(n8nResponse);

    // Delete existing content of same type for this product (upsert behavior)
    await supabase
      .from("ai_content")
      .delete()
      .eq("product_id", productId)
      .eq("content_type", contentType);

    // Insert new content
    const { data: inserted, error: insertErr } = await supabase
      .from("ai_content")
      .insert({
        product_id: product.id,
        store_id: product.store_id,
        content_type: contentType,
        content,
        status: "generated",
        webhook_response: n8nResponse,
      })
      .select("*")
      .single();

    if (insertErr || !inserted) {
      console.error("AI content insert error:", insertErr);
      if (insertErr) Sentry.captureException(new Error(insertErr.message), { tags: { route: "ai-content/generate", query: "insertAIContent" }, extra: { productId, contentType } });
      return NextResponse.json(
        { error: "Failed to save generated content" },
        { status: 500 }
      );
    }

    // Map to AIGeneratedContent shape for the client
    const result = {
      id: inserted.id,
      store_id: inserted.store_id,
      store_name: store.name,
      product_id: inserted.product_id,
      product_title: product.cleaned_title || product.title,
      content_type: inserted.content_type,
      content: inserted.content,
      webhook_sent_at: inserted.webhook_sent_at ?? null,
      webhook_status: inserted.webhook_status ?? null,
      created_at: inserted.created_at,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("AI content generate error:", err);
    Sentry.captureException(err, { tags: { route: "ai-content/generate" } });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
