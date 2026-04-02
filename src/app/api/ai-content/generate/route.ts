import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth/session";
import { canGenerateAIContent } from "@/lib/auth/roles";
import { verifyStoreInWorkspace } from "@/lib/auth/workspace";
import { getWebhookFieldConfig, buildGeneratePayload } from "@/lib/webhook-payload";
import { AI_PROVIDER } from "@/lib/ai-content/config";
import { generateContent } from "@/lib/ai-content/client";
import {
  buildGenerateSystemPrompt,
  buildGenerateUserPrompt,
  type QuestionAnswer,
  type GeneratedContentResponse,
} from "@/lib/ai-content/prompts";

const N8N_URLS: Record<string, string | undefined> = {
  deal_post: process.env.N8N_DEALS_WEBHOOK_URL,
  social_post: process.env.N8N_POSTS_WEBHOOK_URL,
  website_text: process.env.N8N_WEBSITE_WEBHOOK_URL,
  facebook_ad: process.env.N8N_FACEBOOK_WEBHOOK_URL,
};

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
    return flattenFields(raw[0].raw);
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
    return flattenFields(raw);
  }

  // 5. String
  if (typeof raw === "string") {
    return raw;
  }

  // Fallback: stringify
  return JSON.stringify(raw);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenFields(obj: Record<string, any>): string {
  const parts: string[] = [];
  for (const [, value] of Object.entries(obj)) {
    if (value == null) continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) parts.push(trimmed);
    } else if (Array.isArray(value)) {
      const joined = value.map((v) => String(v).trim()).filter(Boolean).join("\n");
      if (joined) parts.push(joined);
    } else if (typeof value === "object") {
      const nested = flattenFields(value);
      if (nested) parts.push(nested);
    } else {
      const str = String(value).trim();
      if (str) parts.push(str);
    }
  }
  return parts.join("\n\n");
}

export async function POST(req: Request) {
  try {
    const { user, role, permissions, isDevBypass, workspaceId } = await getAuthContext();
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
    const VALID_CONTENT_TYPES = Object.keys(N8N_URLS);
    if (!contentType || !VALID_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: `contentType must be one of: ${VALID_CONTENT_TYPES.join(", ")}` },
        { status: 400 }
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

    // Workspace isolation: reject if no workspace context or resource doesn't belong
    if (!workspaceId || !(await verifyStoreInWorkspace(product.store_id, workspaceId))) {
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

    // ── Route to correct provider ──
    // When AI_PROVIDER is "claude", use the new questionnaire-based pipeline.
    // The frontend sends user's answers from the questionnaire step.
    // When AI_PROVIDER is "n8n", fall through to the existing webhook flow below.
    if (AI_PROVIDER === "claude") {
      const answers: QuestionAnswer[] = body.answers || [];
      // Client website content — scraped once on the first question step,
      // passed through from the frontend to avoid re-scraping.
      const clientWebsiteContent: string | undefined = body.clientWebsiteContent;

      const claudeResponse = await generateContent<GeneratedContentResponse>(
        buildGenerateSystemPrompt(contentType),
        buildGenerateUserPrompt(product, store, contentType, answers, clientWebsiteContent)
      );

      // Store DE and EN in separate columns for the language toggle UI.
      // The combined `content` column is still populated for backward compat
      // (webhook send flow, n8n content, copy-to-clipboard).
      const contentDe = claudeResponse.content_de;
      const contentEn = claudeResponse.content_en;
      const content = contentDe + "\n\n---\n\n" + contentEn;

      // Upsert: delete old content of same type, insert new
      await supabase
        .from("ai_content")
        .delete()
        .eq("product_id", productId)
        .eq("content_type", contentType);

      const { data: inserted, error: insertErr } = await supabase
        .from("ai_content")
        .insert({
          product_id: product.id,
          store_id: product.store_id,
          content_type: contentType,
          content,
          content_de: contentDe,
          content_en: contentEn,
          status: "generated",
          // Store raw Claude response for debugging (same column as n8n response)
          webhook_response: claudeResponse,
        })
        .select("*")
        .single();

      if (insertErr || !inserted) {
        console.error("AI content insert error (Claude):", insertErr);
        if (insertErr) Sentry.captureException(new Error(insertErr.message), { tags: { route: "ai-content/generate", provider: "claude" } });
        return NextResponse.json({ error: "Failed to save generated content" }, { status: 500 });
      }

      return NextResponse.json({
        id: inserted.id,
        store_id: inserted.store_id,
        store_name: store.name,
        product_id: inserted.product_id,
        product_title: product.cleaned_title || product.title,
        content_type: inserted.content_type,
        content: inserted.content,
        content_de: inserted.content_de ?? null,
        content_en: inserted.content_en ?? null,
        webhook_response: inserted.webhook_response ?? null,
        webhook_sent_at: inserted.webhook_sent_at ?? null,
        webhook_status: inserted.webhook_status ?? null,
        created_at: inserted.created_at,
      });
    }

    // ── n8n provider (legacy) ──
    const webhookUrl = N8N_URLS[contentType];
    if (!webhookUrl) {
      return NextResponse.json({ error: "Webhook URL not configured" }, { status: 500 });
    }

    // Build payload from configurable field list
    const config = await getWebhookFieldConfig();
    const payload = buildGeneratePayload(product, store, config);

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
      webhook_response: inserted.webhook_response ?? null,
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
