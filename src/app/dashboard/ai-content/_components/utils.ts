import type { Product, AIGeneratedContent } from "@/types";

export const ITEMS_PER_PAGE = 12;

// ─── Content Map ───

export interface ContentEntry {
  hasDeal: boolean;
  hasPost: boolean;
  deal?: AIGeneratedContent;
  post?: AIGeneratedContent;
}

export function buildContentMap(
  content: AIGeneratedContent[]
): Map<string, ContentEntry> {
  const map = new Map<string, ContentEntry>();
  for (const item of content) {
    if (!item.product_id) continue;
    const existing = map.get(item.product_id) || {
      hasDeal: false,
      hasPost: false,
    };
    if (item.content_type === "deal_post") {
      existing.hasDeal = true;
      existing.deal = item;
    } else if (item.content_type === "social_post") {
      existing.hasPost = true;
      existing.post = item;
    }
    map.set(item.product_id, existing);
  }
  return map;
}

// ─── Fake Content Generator ───

export function generateFakeContent(
  product: Product,
  storeName: string,
  type: "deal_post" | "social_post"
): string {
  if (type === "deal_post") {
    const discount = product.discount_percentage || 0;
    if (discount > 0) {
      return `DEAL ALERT: ${product.title} now $${product.price.toFixed(2)} (was $${product.original_price?.toFixed(2)}) — ${discount}% off! ${product.brand || storeName} quality at a steal. Limited stock, grab it before it's gone.`;
    }
    return `FEATURED: ${product.title} from ${storeName} at $${product.price.toFixed(2)}. Premium quality from ${product.brand || storeName}. Check it out before prices change.`;
  }
  return `Check out ${product.title} from ${storeName}! ${product.brand ? `By ${product.brand} — ` : ""}Available now at $${product.price.toFixed(2)}. ${product.discount_percentage ? `Currently ${product.discount_percentage}% off! ` : ""}Shop the latest from ${storeName}.`;
}

// ─── Store Group Data ───

export interface StoreGroupData {
  store: import("@/types").Store;
  products: Product[];
  dealCount: number;
  postCount: number;
  avgDiscount: number;
}
