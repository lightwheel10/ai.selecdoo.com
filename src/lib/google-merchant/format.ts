import { createHash } from "crypto";
import type { content_v2_1 } from "googleapis";
import type { ProductDetail, Store, MerchantEnhancementResult } from "@/types";

const SAFE_CATEGORIES = [
  "Health & Beauty",
  "Electronics",
  "Apparel & Accessories",
  "Home & Garden",
  "Food, Beverages & Tobacco",
  "Sports & Outdoors",
  "Toys & Games",
  "Automotive",
  "Books",
  "Software",
];

/**
 * Truncate offer ID to meet Google Merchant's 50-character limit.
 * Uses first 40 chars + '_' + 8-char MD5 hash suffix = 49 chars max.
 */
export function truncateOfferId(offerId: string, maxLength = 50): string {
  if (offerId.length <= maxLength) return offerId;
  const hash = createHash("md5").update(offerId).digest("hex").slice(0, 8);
  return offerId.slice(0, 40) + "_" + hash;
}

interface FormatInput {
  product: ProductDetail;
  store: Store;
  affiliateLink: string | null;
  enhancement?: MerchantEnhancementResult | null;
}

export function formatProductForGoogle({
  product,
  store,
  affiliateLink,
  enhancement,
}: FormatInput): content_v2_1.Schema$Product {
  const offerId = truncateOfferId(product.hash_id || product.id);
  const link = affiliateLink || product.product_url || "";
  const description = product.description_de || product.description || product.title;

  const googleProduct: content_v2_1.Schema$Product = {
    offerId,
    title: product.title.slice(0, 150),
    description: (description || product.title).slice(0, 5000),
    link,
    imageLink: product.image_url || "",
    contentLanguage: "de",
    targetCountry: "DE",
    channel: "online",
    availability: product.in_stock ? "in stock" : "out of stock",
    condition: product.condition || "new",
    price: {
      value: String(product.price),
      currency: product.currency || "EUR",
    },
    brand: (product.brand || "Unknown").slice(0, 70),
  };

  // GTIN / MPN
  const gtin = product.gtin?.trim() || "";
  const mpn = product.mpn?.trim() || "";
  if (gtin) googleProduct.gtin = gtin;
  if (mpn) googleProduct.mpn = mpn;
  if (!gtin && !mpn) {
    googleProduct.identifierExists = false;
  }

  // Sale price: when product has discount and original price is higher
  if (
    product.original_price &&
    product.original_price > product.price &&
    product.discount_percentage &&
    product.discount_percentage > 0
  ) {
    // Google expects: price = original, salePrice = current
    googleProduct.price = {
      value: String(product.original_price),
      currency: product.currency || "EUR",
    };
    googleProduct.salePrice = {
      value: String(product.price),
      currency: product.currency || "EUR",
    };
  }

  // Google product category (safe list only)
  const category = enhancement?.category ?? null;
  if (category && SAFE_CATEGORIES.includes(category)) {
    googleProduct.googleProductCategory = category;
  }

  // Shipping
  googleProduct.shipping = [buildShipping(store, enhancement)];

  // Unit pricing
  if (enhancement?.unit_pricing) {
    const { unit_pricing_measure, unit_pricing_base_measure } =
      enhancement.unit_pricing;
    if (unit_pricing_measure && unit_pricing_base_measure) {
      googleProduct.unitPricingMeasure = {
        value: unit_pricing_measure.value,
        unit: unit_pricing_measure.unit,
      };
      googleProduct.unitPricingBaseMeasure = {
        value: String(unit_pricing_base_measure.value),
        unit: unit_pricing_base_measure.unit,
      };
    }
  }

  // Custom attributes
  const customAttributes: Array<{ name: string; value: string }> = [];
  if (store.name) {
    customAttributes.push({ name: "store_name", value: store.name });
  }
  if (product.discount_percentage && product.discount_percentage > 0) {
    customAttributes.push({
      name: "discount_percentage",
      value: String(product.discount_percentage),
    });
  }
  if (customAttributes.length > 0) {
    googleProduct.customAttributes = customAttributes;
  }

  return googleProduct;
}

function buildShipping(
  store: Store,
  enhancement?: MerchantEnhancementResult | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  // Priority: enhancement > store cached shipping > default
  if (enhancement?.shipping) {
    const s = enhancement.shipping;
    const priceValue = String(s.price).replace(/\s*EUR\s*/gi, "").trim();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entry: any = {
      country: s.country || "DE",
      price: { value: priceValue || "4.99", currency: "EUR" },
    };
    if (s.service) entry.service = s.service;
    if (s.min_handling_time != null && s.max_handling_time != null) {
      entry.minHandlingTime = s.min_handling_time;
      entry.maxHandlingTime = s.max_handling_time;
    }
    if (s.min_transit_time != null && s.max_transit_time != null) {
      entry.minTransitTime = s.min_transit_time;
      entry.maxTransitTime = s.max_transit_time;
    }
    return entry;
  }

  // Store cached shipping
  if (store.shipping_price) {
    const priceValue = String(store.shipping_price)
      .replace(/\s*EUR\s*/gi, "")
      .trim();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entry: any = {
      country: store.shipping_country || "DE",
      price: { value: priceValue || "4.99", currency: "EUR" },
    };
    if (store.shipping_service) entry.service = store.shipping_service;
    if (
      store.shipping_min_handling_days != null &&
      store.shipping_max_handling_days != null
    ) {
      entry.minHandlingTime = store.shipping_min_handling_days;
      entry.maxHandlingTime = store.shipping_max_handling_days;
    }
    if (
      store.shipping_min_transit_days != null &&
      store.shipping_max_transit_days != null
    ) {
      entry.minTransitTime = store.shipping_min_transit_days;
      entry.maxTransitTime = store.shipping_max_transit_days;
    }
    return entry;
  }

  // Default fallback
  return {
    country: "DE",
    price: { value: "4.99", currency: "EUR" },
    service: "Standard",
    minHandlingTime: 1,
    maxHandlingTime: 3,
    minTransitTime: 2,
    maxTransitTime: 5,
  };
}
