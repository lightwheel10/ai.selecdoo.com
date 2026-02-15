import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Store,
  Product,
  ScrapeJob,
  ProductChange,
  MonitoringConfig,
  MonitoringLog,
  AIGeneratedContent,
  AIActivityLog,
  DashboardStats,
  Activity,
  ChangeType,
  AIContentType,
} from "@/types";

// ─── Store name lookup (shared by queries needing store_name) ───

async function getStoreNameMap(): Promise<Record<string, string>> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("stores")
    .select("id, name")
    .is("deleted_at", null);

  return Object.fromEntries((data ?? []).map((s) => [s.id, s.name]));
}

// ─── Stores ───

export async function getStores(): Promise<Store[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getStores error:", error.message);
    return [];
  }

  return (data ?? []).map(mapStore);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapStore(row: any): Store {
  return {
    id: row.id,
    user_id: row.user_id,
    url: row.url,
    name: row.name,
    product_count: row.product_count,
    last_scraped_at: row.last_scraped_at,
    status: row.status,
    created_at: row.created_at,
    platform: row.platform,
    affiliate_link_base: row.affiliate_link_base,
    program_id: row.program_id,
    coupon_code: row.coupon_code,
    is_published: row.is_published,
    is_featured: row.is_featured,
    logo_url: row.logo_url,
    description_de: row.description_de,
    description_en: row.description_en,
    description_en_formatted: row.description_en_formatted,
    description_de_formatted: row.description_de_formatted,
    shipping_country: row.ai_shipping_country,
    shipping_price: row.ai_shipping_price,
    shipping_service: row.ai_shipping_service,
    shipping_min_handling_days: row.ai_shipping_min_handling_time,
    shipping_max_handling_days: row.ai_shipping_max_handling_time,
    shipping_min_transit_days: row.ai_shipping_min_transit_time,
    shipping_max_transit_days: row.ai_shipping_max_transit_time,
  };
}

// ─── Products ───

export async function getProducts(): Promise<Product[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("getProducts error:", error.message);
    return [];
  }

  return (data ?? []).map(mapProduct);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProduct(row: any): Product {
  return {
    id: row.id,
    store_id: row.store_id,
    title: row.cleaned_title || row.title,
    handle: row.handle,
    sku: row.sku,
    brand: row.brand,
    price: Number(row.price),
    original_price: row.original_price != null ? Number(row.original_price) : null,
    compare_at_price: row.original_price != null ? Number(row.original_price) : null,
    discount_percentage:
      row.discount_percentage != null ? Number(row.discount_percentage) : null,
    currency: row.currency,
    in_stock: row.in_stock,
    stock_status: row.in_stock ? "in_stock" : "out_of_stock",
    product_url: row.product_url,
    image_url: row.image_url,
    description: row.description,
    updated_at: row.updated_at,
    is_published: row.is_published,
    is_featured: row.is_featured,
    is_slider: row.is_slider,
    ai_category: row.ai_category,
    affiliate_link: row.affiliate_link,
    description_de: row.description,
    description_en: row.description_en,
  };
}

// ─── Scrape Jobs ───

export async function getScrapeJobs(): Promise<ScrapeJob[]> {
  const supabase = createAdminClient();
  const [{ data, error }, storeNames] = await Promise.all([
    supabase.from("scrape_jobs").select("*").order("created_at", { ascending: false }),
    getStoreNameMap(),
  ]);

  if (error) {
    console.error("getScrapeJobs error:", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapScrapeJob(row, storeNames));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapScrapeJob(row: any, storeNames: Record<string, string>): ScrapeJob {
  return {
    id: row.id,
    store_id: row.store_id,
    store_name: storeNames[row.store_id] ?? "",
    status: row.status,
    products_found: row.products_found,
    products_updated: row.products_updated,
    started_at: row.started_at,
    completed_at: row.completed_at,
    error_message: row.error_message,
  };
}

// ─── Product Changes ───

export async function getProductChanges(): Promise<ProductChange[]> {
  const supabase = createAdminClient();
  const [{ data, error }, storeNames] = await Promise.all([
    supabase
      .from("product_changes")
      .select("*")
      .order("detected_at", { ascending: false }),
    getStoreNameMap(),
  ]);

  if (error) {
    console.error("getProductChanges error:", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapProductChange(row, storeNames));
}

function mapChangeType(
  v2Type: string,
  fieldChanged: string | null
): ChangeType {
  if (v2Type === "new") return "new_product";
  if (v2Type === "removed") return "product_removed";
  if (fieldChanged === "price") return "price_change";
  if (fieldChanged === "in_stock") return "stock_change";
  return "field_update";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProductChange(row: any, storeNames: Record<string, string>): ProductChange {
  return {
    id: row.id,
    product_id: row.product_id,
    store_id: row.store_id,
    store_name: storeNames[row.store_id] ?? "",
    product_title: "",
    product_image: null,
    change_type: mapChangeType(row.change_type, row.field_changed),
    field_changed: row.field_changed,
    old_value: row.old_value,
    new_value: row.new_value,
    detected_at: row.detected_at,
  };
}

// ─── Monitoring Configs ───

export async function getMonitoringConfigs(): Promise<MonitoringConfig[]> {
  const supabase = createAdminClient();
  const [{ data, error }, storeNames] = await Promise.all([
    supabase
      .from("monitoring_configs")
      .select("*")
      .order("created_at", { ascending: false }),
    getStoreNameMap(),
  ]);

  if (error) {
    console.error("getMonitoringConfigs error:", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapMonitoringConfig(row, storeNames));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMonitoringConfig(row: any, storeNames: Record<string, string>): MonitoringConfig {
  return {
    id: row.id,
    store_id: row.store_id,
    store_name: storeNames[row.store_id] ?? "",
    check_interval_hours: row.check_interval_hours,
    enabled: row.enabled,
    last_check_at: row.last_check_at,
    next_check_at: row.next_check_at,
    created_at: row.created_at,
  };
}

// ─── Monitoring Logs ───

export async function getMonitoringLogs(): Promise<MonitoringLog[]> {
  const supabase = createAdminClient();
  const [{ data, error }, storeNames] = await Promise.all([
    supabase
      .from("monitoring_logs")
      .select("*")
      .order("started_at", { ascending: false }),
    getStoreNameMap(),
  ]);

  if (error) {
    console.error("getMonitoringLogs error:", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapMonitoringLog(row, storeNames));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMonitoringLog(row: any, storeNames: Record<string, string>): MonitoringLog {
  return {
    id: row.id,
    store_id: row.store_id,
    store_name: storeNames[row.store_id] ?? "",
    check_type: "full",
    status: row.status,
    changes_detected: row.changes_detected,
    started_at: row.started_at,
    completed_at: row.completed_at,
    error_message: row.error_message,
  };
}

// ─── AI Content ───

export async function getAIContent(): Promise<AIGeneratedContent[]> {
  const supabase = createAdminClient();
  const [{ data, error }, storeNames] = await Promise.all([
    supabase.from("ai_content").select("*").order("created_at", { ascending: false }),
    getStoreNameMap(),
  ]);

  if (error) {
    console.error("getAIContent error:", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapAIContent(row, storeNames));
}

function mapContentType(v2Type: string): AIContentType {
  if (v2Type === "description") return "product_description";
  return v2Type as AIContentType;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAIContent(row: any, storeNames: Record<string, string>): AIGeneratedContent {
  return {
    id: row.id,
    store_id: row.store_id,
    store_name: storeNames[row.store_id] ?? "",
    product_id: row.product_id,
    product_title: null,
    content_type: mapContentType(row.content_type),
    content: row.content,
    created_at: row.created_at,
  };
}

// ─── AI Activity Logs ───

export async function getAIActivityLogs(): Promise<AIActivityLog[]> {
  const supabase = createAdminClient();
  const [{ data, error }, storeNames] = await Promise.all([
    supabase
      .from("ai_activity_logs")
      .select("*")
      .order("created_at", { ascending: false }),
    getStoreNameMap(),
  ]);

  if (error) {
    console.error("getAIActivityLogs error:", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapAIActivityLog(row, storeNames));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAIActivityLog(row: any, storeNames: Record<string, string>): AIActivityLog {
  const meta = row.metadata ?? {};
  return {
    id: row.id,
    store_id: row.store_id,
    store_name: storeNames[row.store_id] ?? "",
    product_id: row.product_hash_id,
    product_title: null,
    status: row.status,
    scope: row.scope ?? row.event_type,
    message: row.message ?? "",
    items_processed: meta.items_processed ?? 0,
    items_updated: meta.items_updated ?? 0,
    items_skipped: meta.items_skipped ?? 0,
    created_at: row.created_at,
  };
}

// ─── Dashboard Stats ───

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createAdminClient();

  const [products, stores, jobs, alerts, aiContent] = await Promise.all([
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .from("stores")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .is("deleted_at", null),
    supabase
      .from("scrape_jobs")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("product_changes")
      .select("*", { count: "exact", head: true })
      .gte("detected_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    supabase
      .from("ai_content")
      .select("*", { count: "exact", head: true }),
  ]);

  return {
    total_products: products.count ?? 0,
    active_stores: stores.count ?? 0,
    total_jobs: jobs.count ?? 0,
    alerts_today: alerts.count ?? 0,
    ai_generated: aiContent.count ?? 0,
  };
}

// ─── Recent Activity ───

export async function getRecentActivity(): Promise<Activity[]> {
  const supabase = createAdminClient();

  const [changesResult, jobsResult, storeNames] = await Promise.all([
    supabase
      .from("product_changes")
      .select("*")
      .order("detected_at", { ascending: false })
      .limit(5),
    supabase
      .from("scrape_jobs")
      .select("*")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(5),
    getStoreNameMap(),
  ]);

  const activities: Activity[] = [];

  for (const row of changesResult.data ?? []) {
    const changeType = mapChangeType(row.change_type, row.field_changed);
    activities.push({
      id: row.id,
      type: changeType as Activity["type"],
      title: changeType === "price_change"
        ? "Price changed"
        : changeType === "stock_change"
          ? "Stock updated"
          : changeType === "new_product"
            ? "New product"
            : "Product removed",
      description: row.field_changed
        ? `${row.field_changed}: ${row.old_value ?? "–"} → ${row.new_value ?? "–"}`
        : changeType === "new_product"
          ? "New product detected"
          : "Product removed from store",
      store_name: storeNames[row.store_id] ?? "",
      timestamp: row.detected_at,
    });
  }

  for (const row of jobsResult.data ?? []) {
    activities.push({
      id: row.id,
      type: "scrape_complete",
      title: "Scrape completed",
      description: `${row.products_found} products found, ${row.products_updated} updated`,
      store_name: storeNames[row.store_id] ?? "",
      timestamp: row.completed_at ?? row.started_at,
    });
  }

  activities.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return activities.slice(0, 10);
}
