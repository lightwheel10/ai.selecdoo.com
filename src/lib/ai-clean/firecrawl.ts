import FirecrawlApp from "@mendable/firecrawl-js";

let _client: FirecrawlApp | null = null;

function getClient(): FirecrawlApp | null {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return null;
  if (!_client) {
    _client = new FirecrawlApp({ apiKey });
  }
  return _client;
}

const SHIPPING_URL_KEYWORDS = [
  "shipping",
  "versand",
  "lieferung",
  "lieferzeit",
  "delivery",
  "versandkosten",
  "shipping-policy",
  "frais-de-port",
  "livraison",
];

const FALLBACK_PATHS = [
  "/policies/shipping-policy",
  "/pages/shipping",
  "/shipping",
  "/versand",
  "/pages/versand",
  "/pages/lieferung",
  "/pages/delivery",
];

const PARKING_MARKERS = [
  "konsoleH",
  "control panel",
  "parked domain",
  "this domain does not",
];

const MAX_CHARS_PER_PAGE = 6000;
const MAX_CHARS_TOTAL = 16000;
const MAX_PAGES = 3;
const MIN_CHARS = 200;

/**
 * Scrape shipping policy pages from a store's website using Firecrawl.
 * Scrapes up to MAX_PAGES matching URLs and combines them.
 * Returns the combined markdown text, or null if unavailable/failed.
 */
export async function scrapeShippingPolicy(
  storeUrl: string
): Promise<string | null> {
  try {
    const client = getClient();
    if (!client) return null;

    // Normalize base URL
    const base = storeUrl.replace(/\/+$/, "");

    // 1. Map the site to find shipping-related URLs
    let targetUrls: string[] = [];

    try {
      const mapResult = await client.map(base, { limit: 100 });
      const links = mapResult.links ?? [];

      // Deduplicate by URL path (some sites list same page with different params)
      const seen = new Set<string>();
      for (const link of links) {
        const lower = link.url.toLowerCase();
        if (
          !seen.has(lower) &&
          SHIPPING_URL_KEYWORDS.some((kw) => lower.includes(kw))
        ) {
          seen.add(lower);
          targetUrls.push(link.url);
        }
      }
      targetUrls = targetUrls.slice(0, MAX_PAGES);
    } catch {
      // Map failed — fall through to fallback paths
    }

    // 2. Try common fallback paths if map didn't find anything
    if (targetUrls.length === 0) {
      for (const path of FALLBACK_PATHS) {
        try {
          const candidate = `${base}${path}`;
          const result = await client.scrape(candidate, {
            formats: ["markdown"],
          });
          const md = result?.markdown ?? "";
          if (md.length >= MIN_CHARS && !isParkedPage(md)) {
            return md.slice(0, MAX_CHARS_TOTAL);
          }
        } catch {
          // This path didn't work, try next
        }
      }
      return null;
    }

    // 3. Scrape all matched URLs in parallel
    const results = await Promise.allSettled(
      targetUrls.map((url) =>
        client.scrape(url, { formats: ["markdown"] })
      )
    );

    const sections: string[] = [];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status !== "fulfilled") continue;
      const md = r.value?.markdown ?? "";
      if (md.length >= MIN_CHARS && !isParkedPage(md)) {
        sections.push(
          `--- Source: ${targetUrls[i]} ---\n${md.slice(0, MAX_CHARS_PER_PAGE)}`
        );
      }
    }

    if (sections.length === 0) return null;

    return sections.join("\n\n").slice(0, MAX_CHARS_TOTAL);
  } catch (err) {
    console.warn("Firecrawl scrapeShippingPolicy failed:", err);
    return null;
  }
}

function isParkedPage(text: string): boolean {
  const lower = text.toLowerCase();
  return PARKING_MARKERS.some((marker) => lower.includes(marker));
}
