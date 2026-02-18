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

// ─── Store Group Data ───

export interface StoreGroupData {
  store: import("@/types").Store;
  products: Product[];
  dealCount: number;
  postCount: number;
  avgDiscount: number;
}
