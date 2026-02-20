import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { canSubmitToGoogleMerchant } from "@/lib/auth/roles";
import { getMerchantSubmissionByProductId, updateMerchantSubmission } from "@/lib/queries";
import { getProductStatus } from "@/lib/google-merchant/client";

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
    if (!submission || !submission.google_product_id) {
      return NextResponse.json(
        { error: "No submission found for this product" },
        { status: 404 }
      );
    }

    // Fetch live status from Google
    const statusResult = await getProductStatus(submission.google_product_id);

    if (!statusResult.success) {
      return NextResponse.json({
        status: submission.status,
        error: "Failed to check status",
      });
    }

    // Update DB with live status
    const newStatus =
      statusResult.overallStatus === "approved"
        ? "approved"
        : statusResult.overallStatus === "disapproved"
        ? "disapproved"
        : submission.status;

    const approvalDetails = {
      overallStatus: statusResult.overallStatus,
      destinationStatuses: statusResult.destinationStatuses,
      itemLevelIssues: statusResult.itemLevelIssues,
    };

    await updateMerchantSubmission(productId, {
      status: newStatus as "submitted" | "approved" | "disapproved",
      approval_details: approvalDetails,
      last_synced_at: new Date().toISOString(),
    });

    return NextResponse.json({
      status: newStatus,
      approvalDetails,
    });
  } catch (err) {
    console.error("Merchant check error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
