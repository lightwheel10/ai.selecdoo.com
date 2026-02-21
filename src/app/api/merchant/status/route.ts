import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { canSubmitToGoogleMerchant } from "@/lib/auth/roles";
import { getMerchantBatchStatus } from "@/lib/queries";

const MAX_BATCH_SIZE = 500;

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

    if (!productIds || !Array.isArray(productIds)) {
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

    // Filter to valid strings only (silently skip invalid entries)
    const validIds = productIds.filter(
      (id): id is string => typeof id === "string" && id.length > 0 && id.length < 256
    );

    const submissions = await getMerchantBatchStatus(validIds);

    // Map to a simpler response for the UI
    const statuses: Record<
      string,
      {
        status: string;
        googleProductId: string | null;
        merchantId: string | null;
        errorMessage: string | null;
        submittedAt: string | null;
        lastSyncedAt: string | null;
      }
    > = {};

    for (const [pid, sub] of Object.entries(submissions)) {
      statuses[pid] = {
        status: sub.status,
        googleProductId: sub.google_product_id,
        merchantId: sub.merchant_id,
        errorMessage: sub.error_message,
        submittedAt: sub.submitted_at,
        lastSyncedAt: sub.last_synced_at,
      };
    }

    return NextResponse.json({ statuses });
  } catch (err) {
    console.error("Merchant status error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
