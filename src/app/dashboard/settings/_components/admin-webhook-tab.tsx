"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Check, X, Loader2, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import type { FieldMeta } from "@/types/domain";
import { DEFAULT_WEBHOOK_FIELDS, DEFAULT_SEND_WEBHOOK_FIELDS } from "@/lib/webhook-payload";

// ─── Toggle Row (matches admin-products-tab pattern) ───

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between px-3 py-2 border-2 transition-all duration-150"
      style={{
        backgroundColor: checked
          ? "rgba(34,197,94,0.06)"
          : "rgba(239,68,68,0.04)",
        borderColor: checked
          ? "rgba(34,197,94,0.3)"
          : "rgba(239,68,68,0.2)",
      }}
    >
      <span
        className="text-[10px] font-bold uppercase tracking-[0.15em]"
        style={{
          fontFamily: "var(--font-mono)",
          color: checked ? "#22C55E" : "var(--muted-foreground)",
        }}
      >
        {label}
      </span>
      <div
        className="w-6 h-6 flex items-center justify-center transition-all duration-150"
        style={{
          backgroundColor: checked
            ? "rgba(34,197,94,0.20)"
            : "rgba(239,68,68,0.12)",
          color: checked ? "#22C55E" : "#EF4444",
        }}
      >
        {checked ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      </div>
    </button>
  );
}

function GroupHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-[10px] font-bold uppercase tracking-[0.15em] mt-4 mb-1.5"
      style={{
        fontFamily: "var(--font-mono)",
        color: "var(--muted-foreground)",
      }}
    >
      {children}
    </h3>
  );
}

// ─── Group name mapping for i18n ───

const GROUP_LABELS: Record<string, { en: string; de: string }> = {
  core: { en: "Core", de: "Kern" },
  pricing: { en: "Pricing", de: "Preise" },
  availability: { en: "Availability", de: "Verfügbarkeit" },
  links: { en: "Links & Media", de: "Links & Medien" },
  brand: { en: "Brand & Categories", de: "Marke & Kategorien" },
  rich_data: { en: "Rich Data (JSONB)", de: "Erweiterte Daten (JSONB)" },
  source: { en: "Source Metadata", de: "Quell-Metadaten" },
  coupons: { en: "Coupons", de: "Gutscheine" },
  affiliate: { en: "Affiliate", de: "Affiliate" },
  shipping: { en: "Shipping", de: "Versand" },
  content: { en: "Content", de: "Inhalte" },
  flags: { en: "Flags", de: "Flags" },
};

// ─── Preview builders ───

// Generate preview: { product: { ...fields, stores: { ...storeFields } } }
function buildGeneratePreview(
  productKeys: Set<string>,
  storeKeys: Set<string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  realProduct: Record<string, any> | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  realStore: Record<string, any> | null
): string {
  if (!realProduct || !realStore) {
    return "// No product data available";
  }

  const REMAP: Record<string, string> = {
    image_url: "image",
    product_url: "link",
    original_price: "sale_price",
    discount_percentage: "discount",
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const product: Record<string, any> = {};
  for (const key of productKeys) {
    if (key === "title") {
      product.title = realProduct.cleaned_title || realProduct.title;
    } else {
      const outKey = REMAP[key] || key;
      product[outKey] = realProduct[key] ?? null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stores: Record<string, any> = {};
  for (const key of storeKeys) {
    stores[key] = realStore[key] ?? null;
  }

  product.stores = stores;

  return JSON.stringify({ product }, null, 2);
}

// Send preview: { contentType, productId, hashId, content, product: {...}, store: {...}, metadata: {...} }
// Shows the actual send payload format with camelCase keys and fixed structural fields
function buildSendPreview(
  productKeys: Set<string>,
  storeKeys: Set<string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  realProduct: Record<string, any> | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  realStore: Record<string, any> | null,
  realContent?: { content: string; content_type: string; status: string; created_at: string } | null
): string {
  if (!realProduct || !realStore) {
    return "// No product data available";
  }

  // camelCase remapping matching pickProductFieldForSend
  const PRODUCT_REMAP: Record<string, string> = {
    hash_id: "hashId",
    cleaned_title: "cleanedTitle",
    description_en: "descriptionEn",
    original_price: "salePrice",
    sale_price: "salePriceActual",
    discount_percentage: "discount",
    image_url: "image",
    product_url: "link",
    ai_category: "aiCategory",
    source_retailer: "sourceRetailer",
    source_language: "sourceLanguage",
    affiliate_link: "affiliateLink",
    coupon_code: "couponCode",
    coupon_value: "couponValue",
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const product: Record<string, any> = {};
  for (const key of productKeys) {
    if (key === "title") {
      product.title = realProduct.cleaned_title || realProduct.title;
    } else if (key === "in_stock") {
      product.availability = realProduct.in_stock ? "in stock" : "out of stock";
    } else {
      const outKey = PRODUCT_REMAP[key] || key;
      product[outKey] = realProduct[key] ?? null;
    }
  }

  // Store: camelCase remapping matching pickStoreFieldForSend
  const STORE_REMAP: Record<string, string> = {
    program_id: "programId",
    affiliate_link_base: "affiliateLink",
    coupon_code: "couponCode",
    created_at: "createdAt",
    description_de: "descriptionDe",
    description_en: "descriptionEn",
    logo_url: "logoUrl",
    is_published: "isPublished",
    is_featured: "isFeatured",
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const store: Record<string, any> = {};
  for (const key of storeKeys) {
    const outKey = STORE_REMAP[key] || key;
    store[outKey] = realStore[key] ?? null;
  }

  // Build the full send payload shape with fixed structural fields
  // These fixed fields are always included and cannot be toggled off
  const contentType = realContent?.content_type === "deal_post" ? "deal" : "post";
  const payload = {
    contentType,
    productId: realProduct.id,
    hashId: realProduct.hash_id || null,
    content: realContent?.content ?? "« No AI content generated yet »",
    product,
    store,
    metadata: {
      contentStatus: realContent?.status ?? "generated",
      createdAt: realContent?.created_at ?? new Date().toISOString(),
      sentAt: new Date().toISOString(),
      source: "v2-dashboard",
      version: "2.0",
    },
  };

  return JSON.stringify(payload, null, 2);
}

// ─── Webhook type config ───

type WebhookType = "generate" | "send";

interface WebhookTypeConfig {
  defaults: { product: string[]; store: string[] };
  descriptionKey: string;
  previewNoteKey: string;
}

const WEBHOOK_TYPE_CONFIG: Record<WebhookType, WebhookTypeConfig> = {
  generate: {
    defaults: { product: DEFAULT_WEBHOOK_FIELDS.product, store: DEFAULT_WEBHOOK_FIELDS.store },
    descriptionKey: "webhookGenerateDescription",
    previewNoteKey: "webhookGeneratePreviewNote",
  },
  send: {
    defaults: { product: DEFAULT_SEND_WEBHOOK_FIELDS.product, store: DEFAULT_SEND_WEBHOOK_FIELDS.store },
    descriptionKey: "webhookSendDescription",
    previewNoteKey: "webhookSendPreviewNote",
  },
};

// ─── API response shape ───

interface ApiResponse {
  type: string;
  config: { product: string[]; store: string[] };
  defaults: { product: string[]; store: string[] };
  productFieldGroups: FieldMeta[];
  storeFieldGroups: FieldMeta[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sampleProduct: Record<string, any> | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sampleStore: Record<string, any> | null;
  sampleContent: {
    content: string;
    content_type: string;
    status: string;
    created_at: string;
  } | null;
}

// ─── Main component ───

export function AdminWebhookTab() {
  const t = useTranslations("Admin");
  const [activeTab, setActiveTab] = useState<WebhookType>("generate");

  return (
    <div className="space-y-4">
      {/* Header with title + tabs */}
      <div
        className="border-2 p-4"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        <h2
          className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--primary-text)",
          }}
        >
          {t("webhookTitle")}
        </h2>

        {/* Generate / Send tab switcher */}
        <div className="flex" style={{ borderBottom: "2px solid var(--border)" }}>
          {(["generate", "send"] as const).map((type) => {
            const isActive = activeTab === type;
            const label = type === "generate" ? t("webhookGenerateTab") : t("webhookSendTab");
            return (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors -mb-[2px]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: isActive ? "var(--primary-text)" : "var(--muted-foreground)",
                  borderBottom: isActive ? "2px solid var(--primary-text)" : "2px solid transparent",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content — each tab has its own state and saves independently */}
      <WebhookFieldEditor
        key={activeTab}
        type={activeTab}
        t={t}
      />
    </div>
  );
}

// ─── Per-tab field editor (handles its own loading, state, and saving) ───

function WebhookFieldEditor({
  type,
  t,
}: {
  type: WebhookType;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const typeConfig = WEBHOOK_TYPE_CONFIG[type];

  const [productFields, setProductFields] = useState<Set<string>>(new Set());
  const [storeFields, setStoreFields] = useState<Set<string>>(new Set());
  const [savedProductFields, setSavedProductFields] = useState<Set<string>>(new Set());
  const [savedStoreFields, setSavedStoreFields] = useState<Set<string>>(new Set());
  const [productFieldGroups, setProductFieldGroups] = useState<FieldMeta[]>([]);
  const [storeFieldGroups, setStoreFieldGroups] = useState<FieldMeta[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sampleProduct, setSampleProduct] = useState<Record<string, any> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sampleStore, setSampleStore] = useState<Record<string, any> | null>(null);
  const [sampleContent, setSampleContent] = useState<ApiResponse["sampleContent"]>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Product picker state
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productList, setProductList] = useState<{ id: string; title: string; brand: string | null; image_url: string | null; store_id: string }[]>([]);
  const [storeNameMap, setStoreNameMap] = useState<Record<string, string>>({});
  const [productListLoaded, setProductListLoaded] = useState(false);

  // ── sessionStorage cache ──
  // Prevents skeleton flash when navigating away and back to this tab.
  // On mount: if cached data exists, initialize state from it (no skeleton).
  // Then refetch in the background to pick up any changes.
  const cacheKey = `webhook_fields_${type}`;

  // Apply full API response (config + preview sample)
  function applyFullData(data: ApiResponse) {
    const pf = new Set(data.config.product);
    const sf = new Set(data.config.store);
    setProductFields(pf);
    setStoreFields(sf);
    setSavedProductFields(new Set(pf));
    setSavedStoreFields(new Set(sf));
    setProductFieldGroups(data.productFieldGroups);
    setStoreFieldGroups(data.storeFieldGroups);
    setSampleProduct(data.sampleProduct);
    setSampleStore(data.sampleStore);
    setSampleContent(data.sampleContent ?? null);
  }

  // Apply only the field config (not the preview sample).
  // Used for background refetch when we already have a cached preview —
  // prevents the preview from cycling through random products.
  function applyConfigOnly(data: ApiResponse) {
    const pf = new Set(data.config.product);
    const sf = new Set(data.config.store);
    setProductFields(pf);
    setStoreFields(sf);
    setSavedProductFields(new Set(pf));
    setSavedStoreFields(new Set(sf));
    setProductFieldGroups(data.productFieldGroups);
    setStoreFieldGroups(data.storeFieldGroups);
  }

  // Apply only preview sample data (used when user selects a product in the picker)
  function applyPreviewOnly(data: ApiResponse) {
    setSampleProduct(data.sampleProduct);
    setSampleStore(data.sampleStore);
    setSampleContent(data.sampleContent ?? null);
  }

  // Fetch config for this webhook type.
  // mode controls what gets updated:
  //   "full" — config + preview (initial load, no cache)
  //   "config-only" — only field config, keep cached preview stable
  //   "preview-only" — only preview sample (user picked a product)
  const loadData = useCallback(async (
    mode: "full" | "config-only" | "preview-only" = "full",
    productId?: string | null,
  ) => {
    setError(null);
    try {
      const params = new URLSearchParams({ type });
      if (productId) params.set("productId", productId);
      const res = await fetch(`/api/settings/webhook-fields?${params}`);
      if (!res.ok) throw new Error("Failed to load");
      const data: ApiResponse = await res.json();

      if (mode === "full") {
        applyFullData(data);
      } else if (mode === "config-only") {
        applyConfigOnly(data);
      } else {
        applyPreviewOnly(data);
      }

      // Cache the full response on initial loads (not product switches)
      if (mode !== "preview-only") {
        try {
          // Merge: keep the preview sample from cache if we only fetched config
          const toCache = mode === "config-only"
            ? { ...data, sampleProduct: sampleProduct ?? data.sampleProduct, sampleStore: sampleStore ?? data.sampleStore, sampleContent: sampleContent ?? data.sampleContent }
            : data;
          sessionStorage.setItem(cacheKey, JSON.stringify(toCache));
        } catch {
          // sessionStorage full or unavailable — non-critical
        }
      }
    } catch {
      setError(t("webhookSaveFailed"));
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, t]);

  // On mount: restore from cache first (instant, no skeleton), then refetch
  // only the field config in the background (keeps the preview stable).
  useEffect(() => {
    let hasCachedData = false;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const data: ApiResponse = JSON.parse(cached);
        applyFullData(data);
        setLoading(false);
        hasCachedData = true;
      }
    } catch {
      // Invalid cache — ignore, will fetch fresh
    }

    if (hasCachedData) {
      // Cache hit: only refresh the field config, don't replace the preview
      // with a different random product
      loadData("config-only");
    } else {
      // No cache: full load with skeleton
      setLoading(true);
      loadData("full");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  // Fetch lightweight product list + store names for the picker.
  // Cached in sessionStorage to prevent late pop-in and layout shift
  // when navigating back to this tab.
  useEffect(() => {
    if (productListLoaded) return;

    // Try restoring from cache first (instant — no layout shift)
    const productCacheKey = "webhook_product_picker";
    try {
      const cached = sessionStorage.getItem(productCacheKey);
      if (cached) {
        const { products, stores } = JSON.parse(cached);
        if (Array.isArray(products) && products.length > 0) {
          setProductList(products);
          setStoreNameMap(stores ?? {});
          setProductListLoaded(true);
          // Continue to background refresh below
        }
      }
    } catch {
      // Invalid cache — fetch fresh
    }

    // Always fetch fresh data in the background
    (async () => {
      try {
        const [productsRes, storesRes] = await Promise.all([
          fetch("/api/admin/products?columns=light"),
          fetch("/api/admin/stores"),
        ]);
        if (!productsRes.ok) return;
        const productsData = await productsRes.json();
        const list = (productsData.products ?? []).map(
          (p: { id: string; title: string; brand: string | null; image_url: string | null; store_id: string }) => ({
            id: p.id,
            title: p.title,
            brand: p.brand,
            image_url: p.image_url,
            store_id: p.store_id,
          })
        );
        setProductList(list);

        // Build store name lookup
        const map: Record<string, string> = {};
        if (storesRes.ok) {
          const storesData = await storesRes.json();
          for (const s of storesData.stores ?? []) {
            map[s.id] = s.name;
          }
          setStoreNameMap(map);
        }

        setProductListLoaded(true);

        // Cache for next visit
        try {
          sessionStorage.setItem(productCacheKey, JSON.stringify({ products: list, stores: map }));
        } catch {
          // sessionStorage full — non-critical
        }
      } catch {
        // Non-critical — picker just won't be available
      }
    })();
  }, [productListLoaded]);

  // When user picks a product, reload only the preview with that product's data
  function handleProductSelect(productId: string | null) {
    setSelectedProductId(productId);
    loadData("preview-only", productId);
  }

  const isDirty = useMemo(() => {
    if (productFields.size !== savedProductFields.size) return true;
    if (storeFields.size !== savedStoreFields.size) return true;
    for (const k of productFields) {
      if (!savedProductFields.has(k)) return true;
    }
    for (const k of storeFields) {
      if (!savedStoreFields.has(k)) return true;
    }
    return false;
  }, [productFields, storeFields, savedProductFields, savedStoreFields]);

  // Save config — includes `type` so the API saves to the correct key
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/webhook-fields", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          product: Array.from(productFields),
          store: Array.from(storeFields),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");

      setSavedProductFields(new Set(productFields));
      setSavedStoreFields(new Set(storeFields));
      toast.success(t("webhookSaved"), {
        description: t("webhookSavedDescription"),
      });
    } catch {
      toast.error(t("webhookSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setProductFields(new Set(typeConfig.defaults.product));
    setStoreFields(new Set(typeConfig.defaults.store));
  };

  const toggleProduct = (key: string, on: boolean) => {
    setProductFields((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const toggleStore = (key: string, on: boolean) => {
    setStoreFields((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  // Build preview using the correct format for this webhook type
  const preview = useMemo(
    () =>
      type === "send"
        ? buildSendPreview(productFields, storeFields, sampleProduct, sampleStore, sampleContent)
        : buildGeneratePreview(productFields, storeFields, sampleProduct, sampleStore),
    [type, productFields, storeFields, sampleProduct, sampleStore, sampleContent]
  );

  // Group fields by group name
  const productByGroup = useMemo(() => {
    const map = new Map<string, FieldMeta[]>();
    for (const f of productFieldGroups) {
      const arr = map.get(f.group) || [];
      arr.push(f);
      map.set(f.group, arr);
    }
    return map;
  }, [productFieldGroups]);

  const storeByGroup = useMemo(() => {
    const map = new Map<string, FieldMeta[]>();
    for (const f of storeFieldGroups) {
      const arr = map.get(f.group) || [];
      arr.push(f);
      map.set(f.group, arr);
    }
    return map;
  }, [storeFieldGroups]);

  // ─── Loading state ───
  // Uses Skeleton components to match the app-wide loading pattern
  // (other settings tabs — shops, products, AI activity — all use skeletons)

  if (loading) {
    return (
      <>
        {/* Description skeleton */}
        <div
          className="border-2 p-4"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <Skeleton className="h-3 w-3/4" />
        </div>

        {/* Two-column layout skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Field toggles skeleton */}
          <div className="space-y-4">
            {/* Product fields card */}
            <div
              className="border-2 p-4"
              style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-2.5 w-24" />
                <Skeleton className="h-2.5 w-32" />
              </div>
              {/* Group header + toggle rows */}
              <Skeleton className="h-2.5 w-16 mt-4 mb-2" />
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`p1-${i}`}
                  className="flex items-center justify-between px-3 py-2 border-2 mb-1"
                  style={{ borderColor: "var(--border)" }}
                >
                  <Skeleton className="h-2.5 w-20" />
                  <Skeleton className="h-6 w-6" />
                </div>
              ))}
              <Skeleton className="h-2.5 w-16 mt-4 mb-2" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={`p2-${i}`}
                  className="flex items-center justify-between px-3 py-2 border-2 mb-1"
                  style={{ borderColor: "var(--border)" }}
                >
                  <Skeleton className="h-2.5 w-24" />
                  <Skeleton className="h-6 w-6" />
                </div>
              ))}
            </div>

            {/* Store fields card */}
            <div
              className="border-2 p-4"
              style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="h-2.5 w-32" />
              </div>
              <Skeleton className="h-2.5 w-16 mt-4 mb-2" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={`s-${i}`}
                  className="flex items-center justify-between px-3 py-2 border-2 mb-1"
                  style={{ borderColor: "var(--border)" }}
                >
                  <Skeleton className="h-2.5 w-20" />
                  <Skeleton className="h-6 w-6" />
                </div>
              ))}
            </div>
          </div>

          {/* Right: Preview skeleton */}
          <div className="space-y-4">
            <div
              className="border-2 p-4"
              style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
            >
              <Skeleton className="h-2.5 w-24 mb-3" />
              <Skeleton className="h-2.5 w-48 mb-3" />
              <div
                className="border-2 p-3"
                style={{ borderColor: "var(--border)" }}
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton
                    key={`pre-${i}`}
                    className="h-3 mb-2"
                    style={{ width: `${60 + Math.random() * 40}%` }}
                  />
                ))}
              </div>
              <Skeleton className="h-2.5 w-56 mt-3" />
            </div>
          </div>
        </div>

        {/* Action buttons skeleton */}
        <div
          className="border-2 p-4 flex items-center justify-between"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <Skeleton className="h-9 w-[140px]" />
          <Skeleton className="h-9 w-[130px]" />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <div
        className="border-2 p-6 text-center"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        <p className="text-sm mb-3" style={{ color: "var(--danger, #EF4444)" }}>
          {error}
        </p>
        <button
          onClick={() => loadData()}
          className="text-xs font-bold uppercase tracking-[0.15em] px-4 py-2 border-2"
          style={{
            fontFamily: "var(--font-mono)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  const locale = (typeof window !== "undefined" && document.documentElement.lang) || "en";

  return (
    <>
      {/* Description */}
      <div
        className="border-2 p-4"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        <p
          className="text-xs"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--muted-foreground)",
          }}
        >
          {t(typeConfig.descriptionKey)}
        </p>
      </div>

      {/* Two-column layout: field toggles + preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Field toggles */}
        <div className="space-y-4">
          {/* Product Fields */}
          <div
            className="border-2 p-4"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <h3
                className="text-[10px] font-bold uppercase tracking-[0.15em]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--primary-text)",
                }}
              >
                {t("webhookProductFields")}
              </h3>
              <span
                className="text-[10px] tracking-[0.1em]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                }}
              >
                {t("webhookFieldsSelected", {
                  selected: productFields.size,
                  total: productFieldGroups.length,
                })}
              </span>
            </div>

            {Array.from(productByGroup.entries()).map(([group, fields]) => (
              <div key={group}>
                <GroupHeader>
                  {GROUP_LABELS[group]?.[locale === "de" ? "de" : "en"] || group}
                </GroupHeader>
                <div className="space-y-1">
                  {fields.map((f) => (
                    <ToggleRow
                      key={f.key}
                      label={f.label}
                      checked={productFields.has(f.key)}
                      onChange={(on) => toggleProduct(f.key, on)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Store Fields */}
          <div
            className="border-2 p-4"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <h3
                className="text-[10px] font-bold uppercase tracking-[0.15em]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--primary-text)",
                }}
              >
                {t("webhookStoreFields")}
              </h3>
              <span
                className="text-[10px] tracking-[0.1em]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                }}
              >
                {t("webhookFieldsSelected", {
                  selected: storeFields.size,
                  total: storeFieldGroups.length,
                })}
              </span>
            </div>

            {Array.from(storeByGroup.entries()).map(([group, fields]) => (
              <div key={group}>
                <GroupHeader>
                  {GROUP_LABELS[group]?.[locale === "de" ? "de" : "en"] || group}
                </GroupHeader>
                <div className="space-y-1">
                  {fields.map((f) => (
                    <ToggleRow
                      key={f.key}
                      label={f.label}
                      checked={storeFields.has(f.key)}
                      onChange={(on) => toggleStore(f.key, on)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Preview + Product Picker */}
        <div className="lg:sticky lg:top-4 lg:self-start space-y-4">
          {/* Product picker — always reserves space to prevent layout shift.
              Shows skeleton while product list loads, real picker once ready. */}
          {productListLoaded && productList.length > 0 ? (
            <ProductPicker
              products={productList}
              storeNames={storeNameMap}
              selectedId={selectedProductId}
              onSelect={handleProductSelect}
              t={t}
            />
          ) : (
            <div
              className="border-2 p-4"
              style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
            >
              <Skeleton className="h-2.5 w-24 mb-3" />
              <Skeleton className="h-9 w-full" />
            </div>
          )}

          {/* Live preview */}
          <div
            className="border-2 p-4"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
            }}
          >
            <h3
              className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--primary-text)",
              }}
            >
              {t("webhookPreview")}
            </h3>
            {sampleProduct && (
              <p
                className="text-[10px] mb-2 truncate"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                }}
              >
                {sampleProduct.cleaned_title || sampleProduct.title || "Unknown"} — {sampleStore?.name || "Unknown Store"}
              </p>
            )}
            <div
              className="border-2 p-3 overflow-auto max-h-[600px]"
              style={{
                backgroundColor: "var(--background)",
                borderColor: "var(--border)",
              }}
            >
              <pre
                className="text-[11px] leading-relaxed whitespace-pre-wrap break-all"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--foreground)",
                }}
              >
                {preview}
              </pre>
            </div>
            <p
              className="text-[10px] mt-2"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--muted-foreground)",
              }}
            >
              {t(typeConfig.previewNoteKey)}
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div
        className="border-2 p-4 flex items-center justify-between"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] px-4 py-2 border-2 transition-colors"
          style={{
            fontFamily: "var(--font-mono)",
            borderColor: "var(--border)",
            color: "var(--muted-foreground)",
          }}
        >
          <RotateCcw className="w-3 h-3" />
          {t("webhookResetDefaults")}
        </button>

        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] px-6 py-2 border-2 transition-all disabled:opacity-40"
          style={{
            fontFamily: "var(--font-mono)",
            backgroundColor: isDirty ? "var(--primary)" : "transparent",
            borderColor: isDirty ? "var(--primary)" : "var(--border)",
            color: isDirty
              ? "var(--primary-foreground, #0A0A0A)"
              : "var(--muted-foreground)",
          }}
        >
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
          {saving ? t("webhookSaving") : t("webhookSave")}
        </button>
      </div>
    </>
  );
}

// ─── Product Picker (searchable dropdown for preview product selection) ───

const MAX_VISIBLE_RESULTS = 30;

function ProductPicker({
  products,
  storeNames,
  selectedId,
  onSelect,
  t,
}: {
  products: { id: string; title: string; brand: string | null; image_url: string | null; store_id: string }[];
  storeNames: Record<string, string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  // Filter products by search query (title, brand, or store name)
  const filtered = useMemo(() => {
    if (!search.trim()) return products.slice(0, MAX_VISIBLE_RESULTS);
    const q = search.toLowerCase();
    return products
      .filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.brand && p.brand.toLowerCase().includes(q)) ||
          (storeNames[p.store_id] && storeNames[p.store_id].toLowerCase().includes(q))
      )
      .slice(0, MAX_VISIBLE_RESULTS);
  }, [products, search, storeNames]);

  const selectedProduct = selectedId
    ? products.find((p) => p.id === selectedId)
    : null;

  return (
    <div
      ref={containerRef}
      className="border-2 p-4 relative"
      style={{
        backgroundColor: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3
          className="text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--primary-text)",
          }}
        >
          {t("webhookPreviewProduct")}
        </h3>
        {selectedId && (
          <button
            onClick={() => {
              onSelect(null);
              setSearch("");
            }}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:opacity-80"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            <X className="w-3 h-3" />
            {t("webhookPreviewRandom")}
          </button>
        )}
      </div>

      {/* Search input */}
      <div className="relative">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
          style={{ color: "var(--muted-foreground)" }}
        />
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={
            selectedProduct
              ? selectedProduct.title
              : t("webhookSearchProduct")
          }
          className="w-full pl-8 pr-3 py-2 text-[11px] border-2 outline-none transition-colors duration-150 focus:border-[var(--primary-text)]"
          style={{
            backgroundColor: "var(--input)",
            borderColor: selectedId ? "var(--primary-border)" : "var(--border)",
            color: "var(--foreground)",
            borderRadius: 0,
            fontFamily: "var(--font-mono)",
          }}
        />
      </div>

      {/* Dropdown results */}
      {open && (
        <div
          className="absolute left-0 right-0 z-20 border-2 border-t-0 overflow-auto"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
            maxHeight: 240,
            top: "100%",
          }}
        >
          {filtered.length === 0 ? (
            <p
              className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-center"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--muted-foreground)",
              }}
            >
              {t("noResults")}
            </p>
          ) : (
            filtered.map((product) => (
              <button
                key={product.id}
                onClick={() => {
                  onSelect(product.id);
                  setSearch("");
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors hover:bg-[var(--subtle-overlay)]"
                style={{
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {/* Product thumbnail */}
                <div
                  className="w-8 h-8 flex-shrink-0 overflow-hidden"
                  style={{
                    backgroundColor: "var(--input)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span
                        className="text-[7px] font-bold"
                        style={{ color: "var(--muted-foreground)", opacity: 0.4 }}
                      >
                        ?
                      </span>
                    </div>
                  )}
                </div>
                {/* Product info */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[11px] font-semibold truncate"
                    style={{ color: "var(--foreground)" }}
                  >
                    {product.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {storeNames[product.store_id] && (
                      <span
                        className="text-[9px] font-bold uppercase tracking-[0.15em] truncate"
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--primary-text)",
                        }}
                      >
                        {storeNames[product.store_id]}
                      </span>
                    )}
                    {product.brand && storeNames[product.store_id] && (
                      <span
                        className="text-[9px]"
                        style={{ color: "var(--muted-foreground)", opacity: 0.4 }}
                      >
                        ·
                      </span>
                    )}
                    {product.brand && (
                      <span
                        className="text-[9px] font-bold uppercase tracking-[0.15em] truncate"
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        {product.brand}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
