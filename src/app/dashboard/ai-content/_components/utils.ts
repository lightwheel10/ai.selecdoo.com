import type { Product, AIGeneratedContent, AIContentType } from "@/types";

export const ITEMS_PER_PAGE = 12;

// ─── Content Map ───

export interface ContentEntry {
  hasDeal: boolean;
  hasPost: boolean;
  hasWebsite: boolean;
  hasFacebook: boolean;
  deal?: AIGeneratedContent;
  post?: AIGeneratedContent;
  website?: AIGeneratedContent;
  facebook?: AIGeneratedContent;
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
      hasWebsite: false,
      hasFacebook: false,
    };
    if (item.content_type === "deal_post") {
      existing.hasDeal = true;
      existing.deal = item;
    } else if (item.content_type === "social_post") {
      existing.hasPost = true;
      existing.post = item;
    } else if (item.content_type === "website_text") {
      existing.hasWebsite = true;
      existing.website = item;
    } else if (item.content_type === "facebook_ad") {
      existing.hasFacebook = true;
      existing.facebook = item;
    }
    map.set(item.product_id, existing);
  }
  return map;
}

// ─── Content type metadata ───

export const CONTENT_TYPE_CONFIG: Record<
  string,
  { color: string; labelKey: string; genKey: string; viewKey: string }
> = {
  deal_post: { color: "#22C55E", labelKey: "dealPost", genKey: "generateDeal", viewKey: "viewDeal" },
  social_post: { color: "#5AC8FA", labelKey: "socialPost", genKey: "generatePost", viewKey: "viewPost" },
  website_text: { color: "#FF9F0A", labelKey: "websiteText", genKey: "generateWebsite", viewKey: "viewWebsite" },
  facebook_ad: { color: "#BF5AF2", labelKey: "facebookAd", genKey: "generateFacebook", viewKey: "viewFacebook" },
};

// ─── Store Group Data ───

export interface StoreGroupData {
  store: import("@/types").Store;
  products: Product[];
  dealCount: number;
  postCount: number;
  avgDiscount: number;
}
