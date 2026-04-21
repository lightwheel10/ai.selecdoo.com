/**
 * External URL generation for products.
 *
 * Always returns the original store URL (product_url). The
 * `publicSiteUrl` parameter is retained for backwards compatibility
 * with existing call sites but is intentionally ignored — the
 * workspace-level `public_site_url` field is still used elsewhere
 * (brand-voice scraping for AI content generation), so the column
 * isn't being removed, but it no longer redirects product links to
 * an intermediate storefront.
 */

/**
 * Get the external URL for a product — always the original store URL.
 * Returns null when the product has no `product_url` on record.
 */
export function getProductExternalUrl(
  product: {
    hash_id?: string | null;
    product_url?: string | null;
    is_published?: boolean;
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _publicSiteUrl?: string | null
): string | null {
  return product.product_url || null;
}
