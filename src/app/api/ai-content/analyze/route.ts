/**
 * POST /api/ai-content/analyze — Generate contextual options for ONE question.
 *
 * Part of the Claude-based content generation pipeline. Called 3 times
 * sequentially — once per question step (focus → occasion → tone).
 * Each call receives the user's previous answers so Claude can tailor
 * the next question's options to build on the user's choices.
 *
 * Request body:
 *   { productId, contentType, step: "focus"|"occasion"|"tone", previousAnswers: [{id, answer}] }
 *
 * Response:
 *   { question: { id, question, options } }
 *
 * Only available when AI_PROVIDER = "claude" (src/lib/ai-content/config.ts).
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth/session";
import { canGenerateAIContent } from "@/lib/auth/roles";
import { verifyStoreInWorkspace } from "@/lib/auth/workspace";
import { AI_PROVIDER } from "@/lib/ai-content/config";
import { generateQuestionOptions } from "@/lib/ai-content/client";
import {
  buildOptionsSystemPrompt,
  buildOptionsUserPrompt,
  QUESTION_STEPS,
  type QuestionStep,
  type QuestionOptionsResponse,
  type QuestionAnswer,
} from "@/lib/ai-content/prompts";
import { scrapeClientWebsite } from "@/lib/ai-clean";

const VALID_CONTENT_TYPES = ["deal_post", "social_post", "website_text", "facebook_ad"];

export async function POST(req: Request) {
  try {
    // ── Auth ──
    const { user, role, permissions, isDevBypass, workspaceId } = await getAuthContext();
    if (!user && !isDevBypass) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canGenerateAIContent({ role, permissions })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Provider check ──
    if (AI_PROVIDER !== "claude") {
      return NextResponse.json(
        { error: "Analysis is only available when AI provider is set to Claude" },
        { status: 400 }
      );
    }

    // ── Validate input ──
    const body = await req.json();
    const { productId, contentType, step, previousAnswers, clientWebsiteContent: passedContent } = body as {
      productId?: string;
      contentType?: string;
      step?: string;
      previousAnswers?: QuestionAnswer[];
      /** Scraped client website content — passed from frontend state on
       *  steps 2 & 3 to avoid re-scraping. Null on step 1 (will be scraped). */
      clientWebsiteContent?: string;
    };

    if (!productId || typeof productId !== "string") {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }
    if (!contentType || !VALID_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: `contentType must be one of: ${VALID_CONTENT_TYPES.join(", ")}` },
        { status: 400 }
      );
    }
    if (!step || !QUESTION_STEPS.includes(step as QuestionStep)) {
      return NextResponse.json(
        { error: `step must be one of: ${QUESTION_STEPS.join(", ")}` },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // ── Fetch product (full row — includes variants, descriptions, shipping, etc.) ──
    const { data: product, error: productErr } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .is("deleted_at", null)
      .single();

    if (productErr || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // ── Workspace isolation ──
    if (!workspaceId || !(await verifyStoreInWorkspace(product.store_id, workspaceId))) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // ── Fetch store (full row — includes descriptions, shipping, coupons) ──
    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select("*")
      .eq("id", product.store_id)
      .is("deleted_at", null)
      .single();

    if (storeErr || !store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // ── Client website scraping (brand voice context) ──
    // On step 1: scrape the client's public website via Firecrawl to capture
    // brand voice and deal formatting style. The result is returned in the
    // response so the frontend can pass it to subsequent steps and generate.
    // On steps 2 & 3: use the content passed from the frontend (already scraped).
    let clientWebsiteContent: string | null = passedContent ?? null;
    if (!clientWebsiteContent && step === "focus") {
      // First step — scrape the client website if configured
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("public_site_url")
        .eq("id", workspaceId)
        .single();

      if (workspace?.public_site_url) {
        clientWebsiteContent = await scrapeClientWebsite(workspace.public_site_url);
      }
    }

    // ── Read user's locale so questions appear in their language ──
    const cookieStore = await cookies();
    const locale = cookieStore.get("locale")?.value || "en";

    // ── Call Claude to generate options for this step ──
    const question = await generateQuestionOptions<QuestionOptionsResponse>(
      buildOptionsSystemPrompt(locale),
      buildOptionsUserPrompt(
        product,
        store,
        contentType,
        step as QuestionStep,
        previousAnswers ?? [],
        clientWebsiteContent
      )
    );

    // Return the question + scraped client website content.
    // The frontend stores clientWebsiteContent and passes it back on
    // subsequent steps and the final generate call to avoid re-scraping.
    return NextResponse.json({ question, clientWebsiteContent });
  } catch (err) {
    console.error("Analyze API error:", err);
    Sentry.captureException(err, { tags: { route: "ai-content/analyze" } });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
