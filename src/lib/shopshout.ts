/**
 * ShopShout URL generation for published products.
 *
 * Published products link to shopshout.ai instead of the store directly.
 * ShopShout acts as a redirect wrapper — it shows the product page with
 * price comparison, then redirects to the store with affiliate tracking.
 *
 * URL format: https://www.shopshout.ai/product.html?id={hash_id}
 * The shopshout website looks up the product by hash_id in the v2 schema.
 */

const SHOPSHOUT_BASE = "https://www.shopshout.ai/product.html";

/**
 * Get the external URL for a product.
 * - Published products → shopshout.ai URL (via hash_id)
 * - Unpublished products → original store URL (product_url)
 */
export function getProductExternalUrl(product: {
  hash_id?: string | null;
  product_url?: string | null;
  is_published?: boolean;
}): string | null {
  if (product.is_published && product.hash_id) {
    return `${SHOPSHOUT_BASE}?id=${encodeURIComponent(product.hash_id)}`;
  }
  return product.product_url || null;
}

/**
 * Check if a product should show the shopshout link (published)
 * or the direct store link (unpublished).
 */
export function isShopshoutLink(product: {
  hash_id?: string | null;
  is_published?: boolean;
}): boolean {
  return !!product.is_published && !!product.hash_id;
}
