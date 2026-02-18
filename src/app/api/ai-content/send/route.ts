import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth/session";
import { canGenerateAIContent } from "@/lib/auth/roles";

const N8N_SEND_WEBHOOK_URL = process.env.N8N_SEND_WEBHOOK_URL!;
const SEND_TIMEOUT = 40_000; // 40 seconds

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
    const { contentId, productId, contentType } = body as {
      contentId?: string;
      productId?: string;
      contentType?: string;
    };

    if (!contentId || typeof contentId !== "string") {
      return NextResponse.json({ error: "contentId is required" }, { status: 400 });
    }
    if (!productId || typeof productId !== "string") {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }
    if (contentType !== "deal_post" && contentType !== "social_post") {
      return NextResponse.json(
        { error: "contentType must be 'deal_post' or 'social_post'" },
        { status: 400 }
      );
    }

    if (!N8N_SEND_WEBHOOK_URL) {
      return NextResponse.json(
        { error: "Send webhook URL not configured" },
        { status: 500 }
      );
    }

    const supabase = createAdminClient();

    // Fetch the ai_content row
    const { data: aiContent, error: contentErr } = await supabase
      .from("ai_content")
      .select("*")
      .eq("id", contentId)
      .single();

    if (contentErr || !aiContent) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    // Fetch product (full row for hash_id, details)
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

    // Build payload matching v1 format (sal-dashboard/ai-content.js:5305-5356)
    const payload = {
      contentType: contentType === "deal_post" ? "deal" : "post",
      productId: product.id,
      hashId: product.hash_id || null,
      content: aiContent.content,
      product: {
        id: product.id,
        hashId: product.hash_id || null,
        title: product.cleaned_title || product.title || "Untitled Product",
        price: product.price || null,
        salePrice: product.original_price || null,
        currency: product.currency || "EUR",
        discount: product.discount_percentage || 0,
        image: product.image_url || null,
        link: product.product_url || null,
        brand: product.brand || "Unknown Brand",
        condition: product.condition || "new",
        availability: product.in_stock ? "in stock" : "out of stock",
        gtin: product.gtin || null,
        mpn: product.mpn || null,
        description: product.description || null,
      },
      store: {
        id: store.id,
        name: store.name,
        platform: store.platform || "unknown",
        url: store.url,
        programId: store.program_id || null,
        affiliateLink: store.affiliate_link_base || null,
        couponCode: store.coupon_code || null,
        status: store.status,
      },
      metadata: {
        contentStatus: aiContent.status || "generated",
        createdAt: aiContent.created_at,
        sentAt: new Date().toISOString(),
        source: "v2-dashboard",
        version: "2.0",
      },
    };

    // Fire-and-forget: 5s timeout per v1 pattern
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SEND_TIMEOUT);

    let sendSuccess = false;
    try {
      const res = await fetch(N8N_SEND_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Webhook returned ${res.status}`);
      }
      sendSuccess = true;
    } catch (err) {
      const isTimeout = err instanceof DOMException && err.name === "AbortError";
      console.error(
        "Send webhook error:",
        isTimeout ? "Connection timeout" : err
      );

      // Track failure in DB
      await supabase
        .from("ai_content")
        .update({ webhook_status: "failed" })
        .eq("id", contentId);

      return NextResponse.json(
        {
          error: isTimeout
            ? "Webhook connection timeout"
            : "Failed to send to webhook",
        },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeout);
    }

    if (sendSuccess) {
      // Track success in DB
      const now = new Date().toISOString();
      await supabase
        .from("ai_content")
        .update({
          webhook_sent_at: now,
          webhook_status: "sent",
        })
        .eq("id", contentId);

      return NextResponse.json({
        success: true,
        webhook_sent_at: now,
        webhook_status: "sent",
      });
    }

    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  } catch (err) {
    console.error("AI content send error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
