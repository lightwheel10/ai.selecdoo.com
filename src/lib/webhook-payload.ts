import { createAdminClient } from "@/lib/supabase/admin";
import type { WebhookFieldConfig, FieldMeta } from "@/types/domain";

// ─── Default config — matches current hardcoded fields exactly ───

export const DEFAULT_WEBHOOK_FIELDS: WebhookFieldConfig = {
  product: [
    "id",
    "hash_id",
    "title",
    "description",
    "image_url",
    "product_url",
    "price",
    "original_price",
    "discount_percentage",
    "brand",
    "currency",
    "in_stock",
  ],
  store: ["id", "name", "url", "platform", "status", "created_at"],
};

// ─── All available fields with groups (used by API + UI) ───

export const PRODUCT_FIELD_GROUPS: FieldMeta[] = [
  // Core
  { key: "id", label: "ID", group: "core" },
  { key: "hash_id", label: "Hash ID", group: "core" },
  { key: "title", label: "Title", group: "core" },
  { key: "cleaned_title", label: "Cleaned Title", group: "core" },
  { key: "description", label: "Description", group: "core" },
  { key: "description_en", label: "Description (EN)", group: "core" },
  // Pricing
  { key: "price", label: "Price", group: "pricing" },
  { key: "original_price", label: "Original Price", group: "pricing" },
  { key: "sale_price", label: "Sale Price", group: "pricing" },
  { key: "discount_percentage", label: "Discount %", group: "pricing" },
  { key: "currency", label: "Currency", group: "pricing" },
  // Availability
  { key: "in_stock", label: "In Stock", group: "availability" },
  { key: "condition", label: "Condition", group: "availability" },
  { key: "sku", label: "SKU", group: "availability" },
  { key: "gtin", label: "GTIN", group: "availability" },
  { key: "mpn", label: "MPN", group: "availability" },
  // Links & Media
  { key: "image_url", label: "Image URL", group: "links" },
  { key: "product_url", label: "Product URL", group: "links" },
  { key: "handle", label: "Handle", group: "links" },
  { key: "affiliate_link", label: "Affiliate Link", group: "links" },
  // Brand & Categories
  { key: "brand", label: "Brand", group: "brand" },
  { key: "ai_category", label: "AI Category", group: "brand" },
  { key: "categories", label: "Categories", group: "brand" },
  { key: "tags", label: "Tags", group: "brand" },
  // Rich Data (JSONB)
  { key: "variants", label: "Variants", group: "rich_data" },
  { key: "medias", label: "Media Gallery", group: "rich_data" },
  { key: "options", label: "Options", group: "rich_data" },
  { key: "recommend_products", label: "Recommended Products", group: "rich_data" },
  // Source Metadata
  { key: "source_retailer", label: "Source Retailer", group: "source" },
  { key: "source_language", label: "Source Language", group: "source" },
  { key: "source_created_at", label: "Source Created At", group: "source" },
  { key: "source_updated_at", label: "Source Updated At", group: "source" },
  { key: "source_published_at", label: "Source Published At", group: "source" },
  // Coupons
  { key: "coupon_code", label: "Coupon Code", group: "coupons" },
  { key: "coupon_value", label: "Coupon Value", group: "coupons" },
];

export const STORE_FIELD_GROUPS: FieldMeta[] = [
  // Core
  { key: "id", label: "ID", group: "core" },
  { key: "name", label: "Name", group: "core" },
  { key: "url", label: "URL", group: "core" },
  { key: "platform", label: "Platform", group: "core" },
  { key: "status", label: "Status", group: "core" },
  { key: "created_at", label: "Created At", group: "core" },
  // Affiliate
  { key: "program_id", label: "Program ID", group: "affiliate" },
  { key: "affiliate_link_base", label: "Affiliate Link Base", group: "affiliate" },
  { key: "coupon_code", label: "Coupon Code", group: "affiliate" },
  // Shipping
  { key: "ai_shipping_country", label: "Shipping Country", group: "shipping" },
  { key: "ai_shipping_price", label: "Shipping Price", group: "shipping" },
  { key: "ai_shipping_service", label: "Shipping Service", group: "shipping" },
  { key: "ai_shipping_min_handling_time", label: "Min Handling Time", group: "shipping" },
  { key: "ai_shipping_max_handling_time", label: "Max Handling Time", group: "shipping" },
  { key: "ai_shipping_min_transit_time", label: "Min Transit Time", group: "shipping" },
  { key: "ai_shipping_max_transit_time", label: "Max Transit Time", group: "shipping" },
  // Content
  { key: "description_de", label: "Description (DE)", group: "content" },
  { key: "description_en", label: "Description (EN)", group: "content" },
  { key: "logo_url", label: "Logo URL", group: "content" },
  // Flags
  { key: "is_published", label: "Published", group: "flags" },
  { key: "is_featured", label: "Featured", group: "flags" },
];

const ALL_PRODUCT_KEYS = new Set(PRODUCT_FIELD_GROUPS.map((f) => f.key));
const ALL_STORE_KEYS = new Set(STORE_FIELD_GROUPS.map((f) => f.key));

// ─── Config reader ───

export async function getWebhookFieldConfig(): Promise<WebhookFieldConfig> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "webhook_fields")
      .single();
    if (data?.value && typeof data.value === "object") {
      const val = data.value as WebhookFieldConfig;
      if (Array.isArray(val.product) && Array.isArray(val.store)) {
        return val;
      }
    }
  } catch {
    // Table may not exist yet or no row — fall through to default
  }
  return DEFAULT_WEBHOOK_FIELDS;
}

// ─── Validation ───

export function validateFieldConfig(
  config: unknown
): { product: string[]; store: string[] } | null {
  if (!config || typeof config !== "object") return null;
  const c = config as Record<string, unknown>;
  if (!Array.isArray(c.product) || !Array.isArray(c.store)) return null;

  const product = (c.product as string[]).filter((k) => ALL_PRODUCT_KEYS.has(k));
  const store = (c.store as string[]).filter((k) => ALL_STORE_KEYS.has(k));

  return { product, store };
}

// ─── Generate payload builder ───
// Preserves the exact field name remapping from generate/route.ts

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickProductFieldForGenerate(key: string, product: any): [string, unknown] | null {
  switch (key) {
    case "id":
      return ["id", product.id];
    case "hash_id":
      return ["hash_id", product.hash_id];
    case "title":
      return ["title", product.cleaned_title || product.title];
    case "cleaned_title":
      return ["cleaned_title", product.cleaned_title];
    case "description":
      return ["description", product.description];
    case "description_en":
      return ["description_en", product.description_en];
    case "image_url":
      return ["image", product.image_url];
    case "product_url":
      return ["link", product.product_url];
    case "price":
      return ["price", product.price];
    case "original_price":
      return ["sale_price", product.original_price];
    case "sale_price":
      return ["sale_price_actual", product.sale_price];
    case "discount_percentage":
      return ["discount", product.discount_percentage];
    case "brand":
      return ["brand", product.brand];
    case "currency":
      return ["currency", product.currency];
    case "in_stock":
      return ["in_stock", product.in_stock];
    default:
      // Pass through with DB column name
      return [key, product[key] ?? null];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickStoreFieldForGenerate(key: string, store: any): [string, unknown] | null {
  return [key, store[key] ?? null];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildGeneratePayload(product: any, store: any, config: WebhookFieldConfig) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const productPayload: Record<string, any> = {};
  for (const key of config.product) {
    const result = pickProductFieldForGenerate(key, product);
    if (result) {
      productPayload[result[0]] = result[1];
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storesPayload: Record<string, any> = {};
  for (const key of config.store) {
    const result = pickStoreFieldForGenerate(key, store);
    if (result) {
      storesPayload[result[0]] = result[1];
    }
  }

  productPayload.stores = storesPayload;

  return { product: productPayload };
}

// ─── Send payload builder ───
// Preserves the exact camelCase remapping from send/route.ts

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickProductFieldForSend(key: string, product: any): [string, unknown] | null {
  switch (key) {
    case "id":
      return ["id", product.id];
    case "hash_id":
      return ["hashId", product.hash_id || null];
    case "title":
      return ["title", product.cleaned_title || product.title || "Untitled Product"];
    case "cleaned_title":
      return ["cleanedTitle", product.cleaned_title || null];
    case "description":
      return ["description", product.description || null];
    case "description_en":
      return ["descriptionEn", product.description_en || null];
    case "price":
      return ["price", product.price || null];
    case "original_price":
      return ["salePrice", product.original_price || null];
    case "sale_price":
      return ["salePriceActual", product.sale_price || null];
    case "discount_percentage":
      return ["discount", product.discount_percentage || 0];
    case "currency":
      return ["currency", product.currency || "EUR"];
    case "image_url":
      return ["image", product.image_url || null];
    case "product_url":
      return ["link", product.product_url || null];
    case "brand":
      return ["brand", product.brand || "Unknown Brand"];
    case "condition":
      return ["condition", product.condition || "new"];
    case "in_stock":
      return ["availability", product.in_stock ? "in stock" : "out of stock"];
    case "gtin":
      return ["gtin", product.gtin || null];
    case "mpn":
      return ["mpn", product.mpn || null];
    default: {
      // camelCase the key
      const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      return [camel, product[key] ?? null];
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickStoreFieldForSend(key: string, store: any): [string, unknown] | null {
  switch (key) {
    case "id":
      return ["id", store.id];
    case "name":
      return ["name", store.name];
    case "platform":
      return ["platform", store.platform || "unknown"];
    case "url":
      return ["url", store.url];
    case "program_id":
      return ["programId", store.program_id || null];
    case "affiliate_link_base":
      return ["affiliateLink", store.affiliate_link_base || null];
    case "coupon_code":
      return ["couponCode", store.coupon_code || null];
    case "status":
      return ["status", store.status];
    default: {
      const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      return [camel, store[key] ?? null];
    }
  }
}

export function buildSendPayload(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  product: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aiContent: any,
  contentType: "deal_post" | "social_post",
  config: WebhookFieldConfig
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const productPayload: Record<string, any> = {};
  for (const key of config.product) {
    const result = pickProductFieldForSend(key, product);
    if (result) {
      productPayload[result[0]] = result[1];
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storePayload: Record<string, any> = {};
  for (const key of config.store) {
    const result = pickStoreFieldForSend(key, store);
    if (result) {
      storePayload[result[0]] = result[1];
    }
  }

  return {
    contentType: contentType === "deal_post" ? "deal" : "post",
    productId: product.id,
    hashId: product.hash_id || null,
    content: aiContent.content,
    product: productPayload,
    store: storePayload,
    metadata: {
      contentStatus: aiContent.status || "generated",
      createdAt: aiContent.created_at,
      sentAt: new Date().toISOString(),
      source: "v2-dashboard",
      version: "2.0",
    },
  };
}
