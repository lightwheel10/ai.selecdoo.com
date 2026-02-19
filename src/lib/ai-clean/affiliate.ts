import type { Store } from "@/types";

const DEFAULT_PARAMS = {
  utm_source: "selecdoo",
  utm_medium: "affiliate",
  a_aid: "4063096d",
};

/**
 * Generate an affiliate link for a product.
 *
 * Port of v1's generate_affiliate_link() logic:
 * - Shopify + coupon: /discount/{CODE}/?redirect={product_path}&{params}
 * - Other platforms: append params as query string
 * - Auto-generates affiliate_link_base from store URL if missing
 */
export function generateAffiliateLink(
  productUrl: string | null,
  store: Pick<
    Store,
    "url" | "platform" | "affiliate_link_base" | "program_id" | "coupon_code"
  >
): string | null {
  if (!productUrl) return null;

  let baseUrl: string;
  try {
    baseUrl = store.affiliate_link_base || store.url;
    // Ensure it parses
    new URL(baseUrl);
  } catch {
    return null;
  }

  // Build query params
  const params = new URLSearchParams(DEFAULT_PARAMS);
  if (store.program_id) {
    params.set("a_cid", store.program_id);
  }

  // Shopify with coupon code gets a special redirect URL
  if (store.platform === "shopify" && store.coupon_code) {
    try {
      const productParsed = new URL(productUrl);
      const baseParsed = new URL(baseUrl);
      const redirectPath = productParsed.pathname;
      return `${baseParsed.origin}/discount/${store.coupon_code}/?redirect=${encodeURIComponent(redirectPath)}&${params.toString()}`;
    } catch {
      // Fall through to default behavior
    }
  }

  // Default: append params to the product URL
  try {
    const url = new URL(productUrl);
    for (const [key, value] of params) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  } catch {
    return null;
  }
}
