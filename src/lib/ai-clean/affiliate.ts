import type { Store } from "@/types";

const DEFAULT_PARAMS: Record<string, string> = {
  utm_source: "marketforceone",
  utm_medium: "affiliate",
  a_aid: "4063096d",
};

/**
 * Generate an affiliate link for a product.
 *
 * Full port of v1's generate_affiliate_link() logic:
 * 1. Start with hardcoded default params (utm_source, utm_medium, a_aid)
 * 2. If store has affiliate_link_base, parse its query params and merge
 *    (store-specific params override defaults)
 * 3. Always add a_cid (empty string if no program_id)
 * 4. Shopify + coupon: /discount/{CODE}/?redirect={full_product_path}&{params}
 * 5. Other platforms + coupon: ?discount={CODE}&{params}
 * 6. No coupon: ?{params}
 * 7. Fallback: append basic tracking to original URL on error
 */
export function generateAffiliateLink(
  productUrl: string | null,
  store: Pick<
    Store,
    "url" | "platform" | "affiliate_link_base" | "program_id" | "coupon_code"
  >
): string | null {
  if (!productUrl) return null;

  try {
    const parsed = new URL(productUrl);

    // --- Step 1: Start with hardcoded defaults ---
    const affiliateParams: Record<string, string> = { ...DEFAULT_PARAMS };

    // --- Step 2: Merge store-specific params from affiliate_link_base ---
    const affiliateBase = store.affiliate_link_base || "";
    if (affiliateBase) {
      try {
        const baseParsed = new URL(affiliateBase);
        for (const [key, value] of baseParsed.searchParams) {
          // Store-specific params override defaults
          affiliateParams[key] = value;
        }
      } catch {
        // Invalid affiliate_link_base — continue with defaults only
      }
    }

    // --- Step 3: Always add a_cid (empty if no program_id) ---
    affiliateParams.a_cid = store.program_id || "";

    const platform = (store.platform || "").toLowerCase();
    const couponCode = store.coupon_code || "";

    // --- Step 4: Shopify + coupon → /discount/CODE/?redirect=... ---
    if (couponCode && platform === "shopify") {
      try {
        // Use affiliate_link_base origin if available, otherwise product URL origin
        let origin: string;
        if (affiliateBase) {
          try {
            origin = new URL(affiliateBase).origin;
          } catch {
            origin = parsed.origin;
          }
        } else {
          origin = parsed.origin;
        }

        // Include full path + query string in redirect (v1 behavior)
        let redirectPath = parsed.pathname;
        if (parsed.search) {
          redirectPath += parsed.search;
        }

        // Build params with redirect FIRST (Shopify requirement)
        const queryParts = [`redirect=${encodeURIComponent(redirectPath)}`];
        for (const [key, value] of Object.entries(affiliateParams)) {
          queryParts.push(
            `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
          );
        }

        return `${origin}/discount/${couponCode}/?${queryParts.join("&")}`;
      } catch {
        // Fall through to standard handling
      }
    }

    // --- Step 5 & 6: Standard handling ---
    const existingParams = new URLSearchParams(parsed.search);
    const combined = new URLSearchParams();

    // Add coupon code FIRST if available (non-Shopify platforms like WooCommerce)
    if (couponCode) {
      combined.set("discount", couponCode);
    }

    // Preserve existing product URL params
    for (const [key, value] of existingParams) {
      combined.set(key, value);
    }

    // Add affiliate params (don't override discount)
    for (const [key, value] of Object.entries(affiliateParams)) {
      if (key !== "discount") {
        combined.set(key, value);
      }
    }

    // Rebuild URL with combined params
    return `${parsed.origin}${parsed.pathname}?${combined.toString()}`;
  } catch {
    // --- Step 7: Fallback — append basic tracking to original URL ---
    try {
      const basicParams =
        "utm_source=marketforceone&utm_medium=affiliate&a_aid=4063096d&a_cid=";
      const separator = productUrl.includes("?") ? "&" : "?";
      return `${productUrl}${separator}${basicParams}`;
    } catch {
      // Absolute last resort: return original URL
      return productUrl;
    }
  }
}
