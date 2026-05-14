/**
 * Google Merchant Center product feed renderer.
 *
 * 2026-05-14 (paras): Initial version. Renders a list of Marketforce products
 * into the Google Shopping XML feed format (RSS 2.0 + g: namespace). The same
 * format is accepted by Meta Catalog and most major affiliate networks, so
 * a single renderer covers the common cases. Schema reference:
 *   https://support.google.com/merchants/answer/7052112
 *
 * This file is purely additive — it doesn't read from the existing query
 * library directly. The caller (the /feed route) is responsible for fetching
 * products and passing them in. Keeping the renderer pure makes it trivial to
 * unit-test and trivial to swap for a different feed format later (Meta,
 * Awin, etc.) without touching the route.
 */
import type { Product } from "@/types";

interface FeedChannelMeta {
  /** Human-readable title shown in the feed root, e.g. workspace name. */
  title: string;
  /** Public link back to the storefront, e.g. workspace public site URL or marketforce homepage. */
  link: string;
  /** Short description shown in the feed root. */
  description: string;
}

// Google Merchant feed accepts a small enum of condition values. We default
// to "new" since Marketforce currently doesn't expose a per-product condition.
const DEFAULT_CONDITION = "new";

// Google Merchant requires a 3-letter ISO currency code in prices. If a product
// row is missing currency (shouldn't happen, but be defensive), fall back to EUR
// — Marketforce's primary market is Europe.
const DEFAULT_CURRENCY = "EUR";

/**
 * XML escape — handles the 5 special characters defined by the XML spec.
 * Conservative on purpose. Anything else (quotes inside attributes, weird
 * unicode) is fine in element text content.
 */
function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Format a price as Google Merchant expects: "<amount> <ISO_CURRENCY>",
 * e.g. "29.99 EUR". Two-decimal precision per Google's spec.
 */
function formatPrice(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
}

/**
 * Convert a single product row into a Google Merchant <item> element.
 * Returns null if the product is missing required fields — Google rejects the
 * entire feed if even one item is malformed, so we drop those items entirely
 * rather than risk a rejection. The route should log how many were skipped.
 */
function renderItem(product: Product): string | null {
  // Required: id, title, description, link, image_link, availability, price, condition.
  // We drop any product missing one of those.
  //
  // Link preference: prefer the affiliate-tagged URL when set (Marketforce is
  // for affiliate marketing — that's the URL David's customers actually want
  // ad clicks to land on). Fall back to the raw store URL otherwise.
  const link = product.affiliate_link || product.product_url;
  if (!link) return null;
  if (!product.image_url) return null;
  if (!product.title || product.title.trim() === "") return null;
  if (typeof product.price !== "number" || product.price <= 0) return null;

  const id = product.sku || product.id;
  const currency = (product.currency || DEFAULT_CURRENCY).trim();
  const availability = product.in_stock ? "in_stock" : "out_of_stock";

  // Description: prefer English, fall back to the raw description.
  const description =
    product.description_en?.trim() ||
    product.description?.trim() ||
    product.title; // worst case, reuse the title

  const lines: string[] = [];
  lines.push("    <item>");
  lines.push(`      <g:id>${escapeXml(id)}</g:id>`);
  lines.push(`      <title>${escapeXml(product.title)}</title>`);
  lines.push(`      <description>${escapeXml(description)}</description>`);
  lines.push(`      <link>${escapeXml(link)}</link>`);
  lines.push(`      <g:image_link>${escapeXml(product.image_url)}</g:image_link>`);
  lines.push(`      <g:availability>${availability}</g:availability>`);
  lines.push(`      <g:price>${escapeXml(formatPrice(product.price, currency))}</g:price>`);
  lines.push(`      <g:condition>${DEFAULT_CONDITION}</g:condition>`);

  // Optional fields — only emit when populated.
  if (product.brand) {
    lines.push(`      <g:brand>${escapeXml(product.brand)}</g:brand>`);
  }
  if (
    typeof product.original_price === "number" &&
    product.original_price > product.price
  ) {
    // Sale price logic: Google wants <g:price> = original, <g:sale_price> = current.
    // We invert what we wrote above so the math matches Google's expectation.
    const priceLineIdx = lines.findIndex((l) => l.includes("<g:price>"));
    if (priceLineIdx !== -1) {
      lines[priceLineIdx] = `      <g:price>${escapeXml(formatPrice(product.original_price, currency))}</g:price>`;
      lines.push(`      <g:sale_price>${escapeXml(formatPrice(product.price, currency))}</g:sale_price>`);
    }
  }

  lines.push("    </item>");
  return lines.join("\n");
}

/**
 * Render an array of products + feed metadata as a complete Google Merchant
 * XML document. Returns the full XML as a string ready to be sent as the
 * HTTP response body.
 */
export function renderGoogleMerchantFeed(
  products: Product[],
  meta: FeedChannelMeta
): { xml: string; itemCount: number; skippedCount: number } {
  const items: string[] = [];
  let skippedCount = 0;

  for (const product of products) {
    const rendered = renderItem(product);
    if (rendered === null) {
      skippedCount++;
      continue;
    }
    items.push(rendered);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(meta.title)}</title>
    <link>${escapeXml(meta.link)}</link>
    <description>${escapeXml(meta.description)}</description>
${items.join("\n")}
  </channel>
</rss>
`;

  return { xml, itemCount: items.length, skippedCount };
}
