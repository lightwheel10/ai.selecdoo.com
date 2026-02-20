import type { Store, MerchantEnhancementResult } from "@/types";
import { callClaudeJSON } from "@/lib/ai-clean/client";
import { scrapeShippingPolicy } from "@/lib/ai-clean/firecrawl";

/**
 * Enhance product data with Claude-extracted shipping, category, and unit pricing.
 *
 * Optimization: if the store already has all ai_shipping_* fields populated,
 * skip the Firecrawl + Claude call and return cached store data directly.
 */
export async function enhanceProductData(
  store: Store,
  productTitle: string
): Promise<MerchantEnhancementResult> {
  // Check if store already has cached shipping data
  if (hasAllShippingFields(store)) {
    return {
      shipping: {
        country: store.shipping_country || "DE",
        price: store.shipping_price || "4.99",
        service: store.shipping_service || "Standard",
        min_handling_time: store.shipping_min_handling_days ?? 1,
        max_handling_time: store.shipping_max_handling_days ?? 3,
        min_transit_time: store.shipping_min_transit_days ?? 2,
        max_transit_time: store.shipping_max_transit_days ?? 5,
      },
      category: null, // Will be determined per-product by Claude if needed
    };
  }

  // Scrape shipping policy
  let shippingText: string | null = null;
  try {
    shippingText = await scrapeShippingPolicy(store.url);
  } catch {
    console.warn(`Failed to scrape shipping for ${store.url}`);
  }

  const system = `You are a data extraction assistant for Google Merchant Center product submissions.
Extract shipping information and product category from the provided context.

IMPORTANT RULES:
- Shipping price must be a number only, NO currency suffix (e.g. "4.99" not "4.99 EUR")
- Country code should be "DE" for Germany
- For Google product category, ONLY use one of these safe categories:
  Health & Beauty, Electronics, Apparel & Accessories, Home & Garden,
  Food, Beverages & Tobacco, Sports & Outdoors, Toys & Games,
  Automotive, Books, Software
- If you're unsure about the category, return null
- For unit pricing, only provide if the product is clearly food, beverages, or beauty (per-unit pricing required)
- Return valid JSON only.`;

  const user = `Store: ${store.name} (${store.url})
Product title: ${productTitle}

${shippingText ? `Shipping policy page content:\n${shippingText}` : "No shipping policy found."}

Extract and return JSON in this exact format:
{
  "shipping": {
    "country": "DE",
    "price": "4.99",
    "service": "Standard",
    "min_handling_time": 1,
    "max_handling_time": 3,
    "min_transit_time": 2,
    "max_transit_time": 5
  },
  "category": "Health & Beauty" or null,
  "unit_pricing": null or {
    "unit_pricing_measure": { "value": 750, "unit": "ml" },
    "unit_pricing_base_measure": { "value": 100, "unit": "ml" }
  }
}`;

  try {
    return await callClaudeJSON<MerchantEnhancementResult>(system, user);
  } catch (err) {
    console.warn("Claude enhancement failed, using defaults:", err);
    return defaultEnhancement();
  }
}

function hasAllShippingFields(store: Store): boolean {
  return (
    store.shipping_price != null &&
    store.shipping_country != null &&
    store.shipping_service != null
  );
}

function defaultEnhancement(): MerchantEnhancementResult {
  return {
    shipping: {
      country: "DE",
      price: "4.99",
      service: "Standard",
      min_handling_time: 1,
      max_handling_time: 3,
      min_transit_time: 2,
      max_transit_time: 5,
    },
    category: null,
  };
}
