// ─── Store ───

export type StoreStatus = "active" | "paused" | "error";

export type StorePlatform = "shopify" | "woocommerce" | "magento" | "custom";

export interface Store {
  id: string;
  user_id: string;
  url: string;
  name: string;
  product_count: number;
  last_scraped_at: string | null;
  status: StoreStatus;
  created_at: string;
  // Admin fields
  platform?: StorePlatform;
  affiliate_link_base?: string | null;
  program_id?: string | null;
  coupon_code?: string | null;
  is_published?: boolean;
  is_featured?: boolean;
  logo_url?: string | null;
  description_de?: string | null;
  description_en?: string | null;
  description_en_formatted?: string | null;
  description_de_formatted?: string | null;
  // Shipping
  shipping_country?: string | null;
  shipping_price?: string | null;
  shipping_service?: string | null;
  shipping_min_handling_days?: number | null;
  shipping_max_handling_days?: number | null;
  shipping_min_transit_days?: number | null;
  shipping_max_transit_days?: number | null;
}

// ─── Product ───

export type StockStatus = "in_stock" | "out_of_stock";

export interface Product {
  id: string;
  store_id: string;
  title: string;
  handle: string;
  sku: string | null;
  brand: string | null;
  price: number;
  original_price: number | null;
  compare_at_price: number | null;
  discount_percentage: number | null;
  currency: string;
  in_stock: boolean;
  stock_status: StockStatus;
  product_url: string | null;
  image_url: string | null;
  description: string | null;
  updated_at: string;
  // Admin fields
  is_published?: boolean;
  is_featured?: boolean;
  is_slider?: boolean;
  ai_category?: string | null;
  affiliate_link?: string | null;
  description_de?: string | null;
  description_en?: string | null;
}

// ─── Product Detail (extended for detail page) ───

export interface ProductMedia {
  src: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  position: number;
}

export interface ProductOption {
  name: string;
  values: string[];
}

export interface ProductVariant {
  title: string;
  sku: string | null;
  price: number;
  original_price: number | null;
  in_stock: boolean;
  position: number;
  option1: string | null;
  option2: string | null;
  option3: string | null;
}

export interface ProductDetail extends Product {
  hash_id: string | null;
  gtin: string | null;
  mpn: string | null;
  condition: string | null;
  product_type: string | null;
  source_language: string | null;
  source_retailer: string | null;
  source_created_at: string | null;
  source_updated_at: string | null;
  ai_cleaned_at: string | null;
  coupon_code: string | null;
  coupon_value: string | null;
  medias: ProductMedia[];
  options: ProductOption[];
  variants: ProductVariant[];
  created_at: string;
  store_name: string;
}

// ─── Scrape Job ───

export type ScrapeJobStatus = "pending" | "running" | "completed" | "failed";

export interface ScrapeJob {
  id: string;
  store_id: string;
  store_name: string;
  status: ScrapeJobStatus;
  products_found: number;
  products_updated: number;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
}

// ─── Product Change ───

export type ChangeType = "price_change" | "stock_change" | "new_product" | "product_removed" | "field_update";

export interface ProductChange {
  id: string;
  product_id: string;
  store_id: string;
  store_name: string;
  product_title: string;
  product_image: string | null;
  change_type: ChangeType;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  detected_at: string;
}

// ─── Monitoring ───

export type MonitoringStatus = "running" | "completed" | "failed";
export type CheckType = "full" | "price_only" | "stock_only";

export interface MonitoringLog {
  id: string;
  store_id: string;
  store_name: string;
  check_type: CheckType;
  status: MonitoringStatus;
  changes_detected: number;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
}

export interface MonitoringConfig {
  id: string;
  store_id: string;
  store_name: string;
  check_interval_hours: number;
  enabled: boolean;
  last_check_at: string | null;
  next_check_at: string | null;
  created_at: string;
}

// ─── AI Content ───

export type AIContentType = "deal_post" | "product_description" | "comparison" | "social_post";

export interface AIGeneratedContent {
  id: string;
  store_id: string;
  store_name: string;
  product_id: string | null;
  product_title: string | null;
  content_type: AIContentType;
  content: string;
  created_at: string;
}

// ─── Activity (feed) ───

export type ActivityType =
  | "price_change"
  | "stock_change"
  | "new_product"
  | "store_added"
  | "scrape_complete"
  | "monitoring_alert"
  | "ai_content_generated";

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  store_name: string;
  timestamp: string;
}

// ─── Dashboard ───

export interface DashboardStats {
  total_products: number;
  active_stores: number;
  total_jobs: number;
  alerts_today: number;
  ai_generated: number;
}

// ─── AI Activity (Admin) ───

export type AICleanStatus = "success" | "error" | "skipped";

export interface AIActivityLog {
  id: string;
  store_id: string;
  store_name: string;
  product_id: string | null;
  product_title: string | null;
  status: AICleanStatus;
  scope: string;
  message: string;
  items_processed: number;
  items_updated: number;
  items_skipped: number;
  created_at: string;
}
