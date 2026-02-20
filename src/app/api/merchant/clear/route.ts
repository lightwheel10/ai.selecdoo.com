import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { canSubmitToGoogleMerchant } from "@/lib/auth/roles";
import { getMerchantSubmissionByProductId, deleteMerchantSubmission } from "@/lib/queries";
import { deleteProduct } from "@/lib/google-merchant/client";

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
    const { productId } = body as { productId?: unknown };

    if (!productId || typeof productId !== "string") {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 }
      );
    }

    // Get existing submission
    const submission = await getMerchantSubmissionByProductId(productId);
    if (!submission) {
      return NextResponse.json(
        { error: "No submission found" },
        { status: 404 }
      );
    }

    // Delete from Google if we have a google product ID
    if (submission.google_product_id) {
      const result = await deleteProduct(submission.google_product_id);
      if (!result.success) {
        console.warn(
          `Google delete failed for product ${productId}`
        );
        // Continue to delete DB record even if Google delete fails
      }
    }

    // Delete DB row
    await deleteMerchantSubmission(productId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Merchant clear error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
