import { google, type content_v2_1 } from "googleapis";

let _service: content_v2_1.Content | null = null;

function getService(): content_v2_1.Content {
  if (_service) return _service;

  const credentialsJson = process.env.GOOGLE_MERCHANT_CREDENTIALS_JSON;
  if (!credentialsJson) {
    throw new Error("Google Merchant credentials not configured");
  }

  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(credentialsJson);
  } catch {
    throw new Error("Google Merchant credentials not configured");
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/content"],
  });

  _service = google.content({ version: "v2.1", auth });
  return _service;
}

function getMerchantId(): string {
  const id = process.env.GOOGLE_MERCHANT_ID;
  if (!id) throw new Error("Google Merchant ID not configured");
  return id;
}

export interface SubmitResult {
  success: boolean;
  googleProductId?: string;
  error?: string;
}

export async function submitProduct(
  productData: content_v2_1.Schema$Product
): Promise<SubmitResult> {
  try {
    const service = getService();
    const merchantId = getMerchantId();

    const res = await service.products.insert({
      merchantId,
      requestBody: productData,
    });

    return {
      success: true,
      googleProductId: res.data.id ?? undefined,
    };
  } catch (err: unknown) {
    console.error("Google Merchant submitProduct error:", err);
    return { success: false, error: "Google API submission failed" };
  }
}

export interface StatusResult {
  success: boolean;
  overallStatus?: string;
  destinationStatuses?: content_v2_1.Schema$ProductStatusDestinationStatus[];
  itemLevelIssues?: content_v2_1.Schema$ProductStatusItemLevelIssue[];
  error?: string;
}

export async function getProductStatus(
  googleProductId: string
): Promise<StatusResult> {
  try {
    const service = getService();
    const merchantId = getMerchantId();

    const res = await service.productstatuses.get({
      merchantId,
      productId: googleProductId,
    });

    const destinations = res.data.destinationStatuses ?? [];
    const issues = res.data.itemLevelIssues ?? [];

    let overallStatus = "unknown";
    if (destinations.some((d) => d.status === "approved")) {
      overallStatus = "approved";
    } else if (destinations.some((d) => d.status === "disapproved")) {
      overallStatus = "disapproved";
    } else if (destinations.some((d) => d.status === "pending")) {
      overallStatus = "pending";
    }

    return {
      success: true,
      overallStatus,
      destinationStatuses: destinations,
      itemLevelIssues: issues,
    };
  } catch (err: unknown) {
    console.error("Google Merchant getProductStatus error:", err);
    return { success: false, error: "Failed to check product status" };
  }
}

export async function deleteProduct(
  googleProductId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const service = getService();
    const merchantId = getMerchantId();

    await service.products.delete({
      merchantId,
      productId: googleProductId,
    });

    return { success: true };
  } catch (err: unknown) {
    console.error("Google Merchant deleteProduct error:", err);
    return { success: false, error: "Failed to delete product" };
  }
}
