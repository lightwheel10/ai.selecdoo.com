import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Store,
  Product,
  ProductDetail,
  ProductMedia,
  ProductOption,
  ProductVariant,
  RecommendedProduct,
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
  ProductFilterParams,
  PaginatedProducts,
} from "@/types";

// ─── Store name lookup (shared by queries needing store_name) ───
// Wrapped in React cache() to deduplicate within a single server render pass.
// Multiple query functions calling this in the same render will only hit the DB once.

const getStoreNameMap = cache(async (): Promise<Record<string, string>> => {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("stores")
    .select("id, name")
    .is("deleted_at", null);

  return Object.fromEntries((data ?? []).map((s) => [s.id, s.name]));
});

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

export async function getStoreById(id: string): Promise<Store | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !data) return null;
  return mapStore(data);
}

// ─── Products ───

// Only the columns needed by mapProduct() — excludes large JSONB columns
// (medias, variants, options, recommend_products, categories) that are only
// needed on the product detail page.
const PRODUCT_LIST_COLUMNS = "id, store_id, cleaned_title, title, handle, sku, brand, price, original_price, discount_percentage, currency, in_stock, product_url, image_url, description, updated_at, is_published, is_featured, is_slider, ai_category, affiliate_link";

export async function getProducts(): Promise<Product[]> {
  const supabase = createAdminClient();
  const PAGE_SIZE = 1000;
  const allRows: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any

  // Supabase caps each request at ~1000 rows. Paginate to fetch all.
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_LIST_COLUMNS)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error("getProducts error:", error.message);
      break;
    }

    if (!data || data.length === 0) break;
    allRows.push(...data);

    // If we got fewer rows than PAGE_SIZE, we've reached the end
    if (data.length < PAGE_SIZE) break;
  }

  return allRows.map(mapProduct);
}

// ─── Products (light — for AI Activity tab) ───

const PRODUCT_LIGHT_COLUMNS = "id, store_id, title, cleaned_title, brand, ai_category";

export async function getProductsLight(): Promise<Pick<Product, "id" | "store_id" | "title" | "brand" | "ai_category">[]> {
  const supabase = createAdminClient();
  const PAGE_SIZE = 1000;
  const allRows: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_LIGHT_COLUMNS)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error("getProductsLight error:", error.message);
      break;
    }

    if (!data || data.length === 0) break;
    allRows.push(...data);

    if (data.length < PAGE_SIZE) break;
  }

  return allRows.map((row) => ({
    id: row.id,
    store_id: row.store_id,
    title: row.cleaned_title || row.title,
    brand: row.brand,
    ai_category: row.ai_category,
  }));
}

// ─── Filtered + Paginated Products ───

const DEFAULT_PAGE_SIZE = 24;

export async function getFilteredProducts(
  params: ProductFilterParams
): Promise<PaginatedProducts> {
  const supabase = createAdminClient();
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("products")
    .select(PRODUCT_LIST_COLUMNS, { count: "exact" })
    .is("deleted_at", null);

  // Store filter (single)
  if (params.storeId) {
    query = query.eq("store_id", params.storeId);
  }

  // Store filter (multi)
  if (params.storeIds && params.storeIds.length > 0) {
    query = query.in("store_id", params.storeIds);
  }

  // Stock filter
  if (params.stockFilter === "in_stock") {
    query = query.eq("in_stock", true);
  } else if (params.stockFilter === "out_of_stock") {
    query = query.eq("in_stock", false);
  }

  // Discount filter
  if (params.discountFilter) {
    switch (params.discountFilter) {
      case "none":
        query = query.or("discount_percentage.is.null,discount_percentage.eq.0");
        break;
      case "any":
        query = query.gt("discount_percentage", 0);
        break;
      default: {
        const minDiscount = parseInt(params.discountFilter, 10);
        if (!isNaN(minDiscount) && minDiscount > 0) {
          query = query.gte("discount_percentage", minDiscount);
        }
        break;
      }
    }
  }

  // Price range
  if (params.minPrice !== undefined && !isNaN(params.minPrice)) {
    query = query.gte("price", params.minPrice);
  }
  if (params.maxPrice !== undefined && !isNaN(params.maxPrice)) {
    query = query.lte("price", params.maxPrice);
  }

  // Brand filter (multi)
  if (params.brands && params.brands.length > 0) {
    query = query.in("brand", params.brands);
  }

  // Search
  if (params.search && params.search.trim()) {
    const q = `%${params.search.trim()}%`;
    query = query.or(
      `cleaned_title.ilike.${q},title.ilike.${q},brand.ilike.${q},sku.ilike.${q}`
    );
  }

  // Sort
  const sortBy = params.sortBy ?? "updated_at";
  const sortDir = params.sortDir ?? "desc";
  query = query.order(sortBy, { ascending: sortDir === "asc" });

  // Pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("getFilteredProducts error:", error.message);
    return { products: [], totalCount: 0, page, pageSize, totalPages: 0 };
  }

  const totalCount = count ?? 0;

  return {
    products: (data ?? []).map(mapProduct),
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

// Lightweight version for dashboard — only fetches what the overview cards need
export async function getRecentProducts(limit: number): Promise<Product[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, store_id, title, cleaned_title, brand, price, original_price, discount_percentage, image_url, in_stock, updated_at")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getRecentProducts error:", error.message);
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
    description_de: row.description_de ?? row.description,
    description_en: row.description_en,
  };
}

// ─── Product Detail ───

export async function getProductById(id: string): Promise<ProductDetail | null> {
  const supabase = createAdminClient();
  const [{ data, error }, storeNames] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).single(),
    getStoreNameMap(),
  ]);

  if (error || !data) {
    console.error("getProductById error:", error?.message);
    return null;
  }

  return mapProductDetail(data, storeNames);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseJsonb<T>(value: any, fallback: T): T {
  if (value == null) return fallback;
  if (Array.isArray(value)) return value as T;
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return fallback; }
  }
  return fallback;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProductDetail(row: any, storeNames: Record<string, string>): ProductDetail {
  const medias: ProductMedia[] = parseJsonb(row.medias, []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (m: any, i: number) => ({
      src: m.src ?? m.url ?? "",
      alt: m.alt ?? null,
      width: m.width ?? null,
      height: m.height ?? null,
      position: m.position ?? i,
    })
  );

  // Apify options: { type: "Size", values: [...] }
  // WooCommerce options: { name: "Ausführung", terms: [{ name: "1er Pack", slug: "..." }] }
  const options: ProductOption[] = parseJsonb(row.options, []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (o: any) => {
      const rawValues = Array.isArray(o.values) ? o.values : Array.isArray(o.terms) ? o.terms : [];
      return {
        name: o.name ?? o.type ?? "",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        values: rawValues.map((v: any) => (typeof v === "string" ? v : v?.name ?? v?.value ?? v?.id ?? String(v))),
      };
    }
  );

  // Apify stores variant price as object { current, previous, stockStatus } in cents
  const variants: ProductVariant[] = parseJsonb(row.variants, []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (v: any, i: number) => {
      const priceObj = v.price;
      const isObj = priceObj && typeof priceObj === "object";
      const price = isObj ? Number(priceObj.current ?? 0) / 100 : Number(priceObj ?? 0);
      const prevRaw = isObj ? priceObj.previous : v.original_price;
      const originalPrice = prevRaw != null && Number(prevRaw) > 0
        ? (isObj ? Number(prevRaw) / 100 : Number(prevRaw))
        : null;
      const inStock = isObj
        ? priceObj.stockStatus === "InStock"
        : (v.in_stock ?? v.available ?? true);

      return {
        title: v.title ?? "",
        sku: v.sku ?? null,
        price,
        original_price: originalPrice,
        in_stock: inStock,
        position: v.position ?? i,
        option1: v.option1 ?? null,
        option2: v.option2 ?? null,
        option3: v.option3 ?? null,
      };
    }
  );

  // Recommended products from Apify — each is a full product object
  const recommend_products: RecommendedProduct[] = parseJsonb(row.recommend_products, []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r: any) => {
      const firstVariant = r.variants?.[0];
      const priceObj = firstVariant?.price;
      const isObj = priceObj && typeof priceObj === "object";
      const price = isObj ? Number(priceObj.current ?? 0) / 100 : Number(priceObj ?? 0);
      const inStock = isObj
        ? priceObj.stockStatus === "InStock"
        : (firstVariant?.in_stock ?? true);

      return {
        title: r.title ?? "Untitled",
        price,
        image_url: r.medias?.[0]?.url ?? r.medias?.[0]?.src ?? null,
        product_url: r.source?.canonicalUrl ?? null,
        in_stock: inStock,
        brand: r.brand ?? null,
      };
    }
  );

  return {
    ...mapProduct(row),
    hash_id: row.hash_id ?? null,
    gtin: row.gtin ?? null,
    mpn: row.mpn ?? null,
    condition: row.condition ?? null,
    product_type: Array.isArray(row.categories)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? row.categories.map((c: any) => (typeof c === "string" ? c : c?.name ?? String(c))).join(", ")
      : (row.categories ?? null),
    source_language: row.source_language ?? null,
    source_retailer: row.source_retailer ?? null,
    source_created_at: row.source_created_at ?? null,
    source_updated_at: row.source_updated_at ?? null,
    ai_cleaned_at: row.ai_cleaned_at ?? null,
    coupon_code: row.coupon_code ?? null,
    coupon_value: row.coupon_value ?? null,
    medias,
    options,
    variants,
    recommend_products,
    created_at: row.created_at,
    store_name: storeNames[row.store_id] ?? "",
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

// Lightweight version for dashboard — only recent jobs
export async function getRecentJobs(limit: number): Promise<ScrapeJob[]> {
  const supabase = createAdminClient();
  const [{ data, error }, storeNames] = await Promise.all([
    supabase
      .from("scrape_jobs")
      .select("id, store_id, status, products_found, products_updated, started_at, completed_at, error_message")
      .order("created_at", { ascending: false })
      .limit(limit),
    getStoreNameMap(),
  ]);

  if (error) {
    console.error("getRecentJobs error:", error.message);
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

export async function getProductChanges(limit = 500): Promise<ProductChange[]> {
  const supabase = createAdminClient();
  const [{ data, error }, storeNames] = await Promise.all([
    supabase
      .from("product_changes")
      .select("*")
      .order("detected_at", { ascending: false })
      .limit(limit),
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
    product_title: row.product_title ?? "",
    product_image: row.product_image ?? null,
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
      .select("*, stores!inner(deleted_at)")
      .is("stores.deleted_at", null)
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
    webhook_sent_at: row.webhook_sent_at ?? null,
    webhook_status: row.webhook_status ?? null,
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
    details: meta.results ?? [],
    elapsed_ms: meta.elapsed_ms ?? null,
    created_at: row.created_at,
  };
}

// ─── Dashboard Stats ───

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createAdminClient();

  const now = new Date();
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);
  const yesterdayMidnight = new Date(todayMidnight);
  yesterdayMidnight.setDate(yesterdayMidnight.getDate() - 1);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const twentyFourHoursAgo = new Date(now);
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
  const fortyEightHoursAgo = new Date(now);
  fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const [
    products, productsDelta,
    stores, storesDelta,
    jobs, jobsCurrent24h, jobsPrev24h,
    alertsToday, alertsYesterday,
    aiContent, aiCurrent7d, aiPrev7d,
  ] = await Promise.all([
    // Total products
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null),
    // Products created in last 7 days
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("created_at", sevenDaysAgo.toISOString()),
    // Active stores
    supabase
      .from("stores")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .is("deleted_at", null),
    // Stores created since yesterday
    supabase
      .from("stores")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .is("deleted_at", null)
      .gte("created_at", yesterdayMidnight.toISOString()),
    // Total jobs
    supabase
      .from("scrape_jobs")
      .select("*", { count: "exact", head: true }),
    // Jobs in last 24h
    supabase
      .from("scrape_jobs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", twentyFourHoursAgo.toISOString()),
    // Jobs in previous 24h
    supabase
      .from("scrape_jobs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", fortyEightHoursAgo.toISOString())
      .lt("created_at", twentyFourHoursAgo.toISOString()),
    // Alerts today
    supabase
      .from("product_changes")
      .select("*", { count: "exact", head: true })
      .gte("detected_at", todayMidnight.toISOString()),
    // Alerts yesterday
    supabase
      .from("product_changes")
      .select("*", { count: "exact", head: true })
      .gte("detected_at", yesterdayMidnight.toISOString())
      .lt("detected_at", todayMidnight.toISOString()),
    // AI content total
    supabase
      .from("ai_content")
      .select("*", { count: "exact", head: true }),
    // AI content last 7 days
    supabase
      .from("ai_content")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString()),
    // AI content previous 7 days
    supabase
      .from("ai_content")
      .select("*", { count: "exact", head: true })
      .gte("created_at", fourteenDaysAgo.toISOString())
      .lt("created_at", sevenDaysAgo.toISOString()),
  ]);

  return {
    total_products: products.count ?? 0,
    total_products_delta: productsDelta.count ?? 0,
    active_stores: stores.count ?? 0,
    active_stores_delta: storesDelta.count ?? 0,
    total_jobs: jobs.count ?? 0,
    total_jobs_delta: (jobsCurrent24h.count ?? 0) - (jobsPrev24h.count ?? 0),
    alerts_today: alertsToday.count ?? 0,
    alerts_today_delta: (alertsToday.count ?? 0) - (alertsYesterday.count ?? 0),
    ai_generated: aiContent.count ?? 0,
    ai_generated_delta: (aiCurrent7d.count ?? 0) - (aiPrev7d.count ?? 0),
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
