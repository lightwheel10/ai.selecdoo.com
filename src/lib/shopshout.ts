/**
 * Public storefront URL generation for published products.
 *
 * Each workspace can optionally have a public_site_url configured
 * (e.g., "https://www.shopshout.ai/product.html" for Selecdoo).
 * If set, published products link to that URL with the hash_id.
 * If not set, published products link to the original store URL.
 *
 * This is a temporary solution until per-workspace storefronts are
 * built into the main app. At that point, public_site_url would be
 * set automatically (e.g., "marketforce.revenueworks.ai/ws/{slug}/product").
 */

/**
 * Get the external URL for a product.
 * - Workspace has public_site_url + product is published → storefront URL
 * - Otherwise → original store URL (product_url)
 */
export function getProductExternalUrl(
  product: {
    hash_id?: string | null;
    product_url?: string | null;
    is_published?: boolean;
  },
  publicSiteUrl?: string | null
): string | null {
  // If workspace has a public storefront and product is published, link to it
  if (publicSiteUrl && product.is_published && product.hash_id) {
    return `${publicSiteUrl}?id=${encodeURIComponent(product.hash_id)}`;
  }
  // Otherwise link to the original store URL
  return product.product_url || null;
}
