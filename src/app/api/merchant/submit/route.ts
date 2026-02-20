import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { canSubmitToGoogleMerchant } from "@/lib/auth/roles";
import { getProductById, getStoreById, getMerchantSubmissionByProductId, saveMerchantSubmission } from "@/lib/queries";
import { generateAffiliateLink } from "@/lib/ai-clean/affiliate";
import { enhanceProductData } from "@/lib/google-merchant/enhance";
import { formatProductForGoogle } from "@/lib/google-merchant/format";
import { submitProduct } from "@/lib/google-merchant/client";

const MAX_BATCH_SIZE = 50;

function isValidId(v: unknown): v is string {
  return typeof v === "string" && v.length > 0 && v.length < 256;
}

export async function POST(req: Request) {
  try {
    const { user, role, permissions, isDevBypass } = await getAuthContext();
    if (!user && !isDevBypass) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canSubmitToGoogleMerchant({ role, permissions })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { productIds } = body as { productIds?: unknown[] };

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: "productIds array is required" },
        { status: 400 }
      );
    }

    if (productIds.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Maximum ${MAX_BATCH_SIZE} products per request` },
        { status: 400 }
      );
    }

    if (!productIds.every(isValidId)) {
      return NextResponse.json(
        { error: "All productIds must be non-empty strings" },
        { status: 400 }
      );
    }

    const results: Array<{
      productId: string;
      success: boolean;
      googleProductId?: string;
      error?: string;
    }> = [];

    for (const productId of productIds) {
      try {
        // Check existing submission
        const existing = await getMerchantSubmissionByProductId(productId);
        if (existing && existing.status === "submitted") {
          results.push({
            productId,
            success: true,
            googleProductId: existing.google_product_id ?? undefined,
            error: "already_submitted",
          });
          continue;
        }

        // Fetch product + store
        const product = await getProductById(productId);
        if (!product) {
          results.push({ productId, success: false, error: "Product not found" });
          continue;
        }

        const store = await getStoreById(product.store_id);
        if (!store) {
          results.push({ productId, success: false, error: "Store not found" });
          continue;
        }

        // Generate affiliate link
        const affiliateLink = generateAffiliateLink(product.product_url, store);

        // Enhance with Claude (graceful fallback)
        let enhancement = null;
        try {
          enhancement = await enhanceProductData(store, product.title);
        } catch (err) {
          console.warn(`Enhancement failed for ${productId}, using defaults:`, err);
        }

        // Format for Google
        const googleProduct = formatProductForGoogle({
          product,
          store,
          affiliateLink,
          enhancement,
        });

        // Submit to Google
        const submitResult = await submitProduct(googleProduct);

        // Save to DB — only store googleProductId, not raw response
        const now = new Date().toISOString();
        await saveMerchantSubmission({
          product_id: productId,
          store_id: product.store_id,
          google_product_id: submitResult.googleProductId ?? null,
          merchant_id: process.env.GOOGLE_MERCHANT_ID ?? null,
          status: submitResult.success ? "submitted" : "error",
          error_message: submitResult.success ? null : "Submission failed",
          google_response: null,
          approval_details: null,
          submitted_at: now,
          last_synced_at: null,
        });

        results.push({
          productId,
          success: submitResult.success,
          googleProductId: submitResult.googleProductId,
          error: submitResult.success ? undefined : "Submission failed",
        });
      } catch (err) {
        console.error(`Merchant submit error for ${productId}:`, err);

        // Save error state to DB — generic message only
        await saveMerchantSubmission({
          product_id: productId,
          store_id: "",
          google_product_id: null,
          merchant_id: null,
          status: "error",
          error_message: "Submission failed",
          google_response: null,
          approval_details: null,
          submitted_at: new Date().toISOString(),
          last_synced_at: null,
        });

        results.push({ productId, success: false, error: "Submission failed" });
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error("Merchant submit error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
