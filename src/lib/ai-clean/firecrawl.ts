import FirecrawlApp from "@mendable/firecrawl-js";
import * as Sentry from "@sentry/nextjs";

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

const SHIPPING_FALLBACK_PATHS = [
  "/policies/shipping-policy",
  "/pages/shipping",
  "/shipping",
  "/versand",
  "/pages/versand",
  "/pages/lieferung",
  "/pages/delivery",
];

const ABOUT_URL_KEYWORDS = [
  "about",
  "ueber-uns",
  "uber-uns",
  "story",
  "unsere-geschichte",
  "philosophie",
  "mission",
  "wer-wir-sind",
];

const ABOUT_FALLBACK_PATHS = [
  "/pages/about",
  "/pages/ueber-uns",
  "/about",
  "/pages/story",
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

// ─── Shared map() cache ───
// Both scrapeShippingPolicy and scrapeStoreDescription call map() on the same
// store URL in the same cleaning flow. Cache the result to avoid duplicate requests.
type MapLink = { url: string };
const _mapCache = new Map<string, MapLink[]>();

async function mapSiteUrls(storeUrl: string): Promise<MapLink[]> {
  const base = storeUrl.replace(/\/+$/, "");
  const cached = _mapCache.get(base);
  if (cached) return cached;

  const client = getClient();
  if (!client) return [];

  try {
    const mapResult = await client.map(base, { limit: 100 });
    const links = (mapResult.links ?? []) as MapLink[];
    _mapCache.set(base, links);
    return links;
  } catch (err) {
    Sentry.captureException(err, { tags: { service: "firecrawl", operation: "mapSiteUrls" }, extra: { storeUrl } });
    _mapCache.set(base, []);
    return [];
  }
}

/** Clear cached map results for a store URL (call after cleaning flow). */
export function clearMapCache(storeUrl: string): void {
  const base = storeUrl.replace(/\/+$/, "");
  _mapCache.delete(base);
}

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

    const base = storeUrl.replace(/\/+$/, "");

    // 1. Map the site to find shipping-related URLs
    let targetUrls: string[] = [];
    const links = await mapSiteUrls(storeUrl);

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

    // 2. Try common fallback paths if map didn't find anything
    if (targetUrls.length === 0) {
      for (const path of SHIPPING_FALLBACK_PATHS) {
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
    Sentry.captureException(err, { tags: { service: "firecrawl", operation: "scrapeShippingPolicy" }, extra: { storeUrl } });
    return null;
  }
}

/**
 * Scrape about/homepage content from a store's website using Firecrawl.
 * Used to generate store descriptions. Returns markdown text or null.
 */
export async function scrapeStoreDescription(
  storeUrl: string
): Promise<string | null> {
  try {
    const client = getClient();
    if (!client) return null;

    const base = storeUrl.replace(/\/+$/, "");

    // 1. Search mapped URLs for about-like pages
    let targetUrl: string | null = null;
    const links = await mapSiteUrls(storeUrl);

    for (const link of links) {
      const lower = link.url.toLowerCase();
      if (ABOUT_URL_KEYWORDS.some((kw) => lower.includes(kw))) {
        targetUrl = link.url;
        break;
      }
    }

    // 2. Try fallback paths if map didn't find anything
    if (!targetUrl) {
      for (const path of ABOUT_FALLBACK_PATHS) {
        try {
          const candidate = `${base}${path}`;
          const result = await client.scrape(candidate, {
            formats: ["markdown"],
          });
          const md = result?.markdown ?? "";
          if (md.length >= MIN_CHARS && !isParkedPage(md)) {
            return md.slice(0, MAX_CHARS_PER_PAGE);
          }
        } catch {
          // This path didn't work, try next
        }
      }
    }

    // 3. Scrape the found about page, or fall back to homepage
    const urlToScrape = targetUrl || base;
    try {
      const result = await client.scrape(urlToScrape, {
        formats: ["markdown"],
      });
      const md = result?.markdown ?? "";
      if (md.length >= MIN_CHARS && !isParkedPage(md)) {
        return md.slice(0, MAX_CHARS_PER_PAGE);
      }
    } catch {
      // Scrape failed
    }

    return null;
  } catch (err) {
    console.warn("Firecrawl scrapeStoreDescription failed:", err);
    Sentry.captureException(err, { tags: { service: "firecrawl", operation: "scrapeStoreDescription" }, extra: { storeUrl } });
    return null;
  }
}

function isParkedPage(text: string): boolean {
  const lower = text.toLowerCase();
  return PARKING_MARKERS.some((marker) => lower.includes(marker));
}
