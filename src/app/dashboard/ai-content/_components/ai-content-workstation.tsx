"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Search,
  X,
  Tags,
  SlidersHorizontal,
  LayoutGrid,
  Store as StoreIcon,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { Product, Store, AIGeneratedContent } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  ITEMS_PER_PAGE,
  buildContentMap,
  generateFakeContent,
  type StoreGroupData,
} from "./utils";
import { MultiSearchableFilter, MultiSimpleFilter, SimpleFilter, ToggleGroup } from "./filters";
import { Pagination } from "./pagination";
import { ProductCard } from "./product-card";
import { ContentDialog } from "./content-dialog";
import { StoreGroupView } from "./store-group-view";

// ═══════════════════════════════════
// ─── MAIN WORKSTATION ───
// ═══════════════════════════════════

interface AIContentWorkstationProps {
  products: Product[];
  stores: Store[];
  aiContent: AIGeneratedContent[];
}

export function AIContentWorkstation({
  products,
  stores,
  aiContent,
}: AIContentWorkstationProps) {
  const t = useTranslations("AIContent");

  const storeMap = Object.fromEntries(stores.map((s) => [s.id, s]));
  const storeNames = useMemo(() => stores.map((s) => s.name).sort(), [stores]);
  const brandNames = useMemo(() => {
    const brands = new Set<string>();
    for (const p of products) {
      if (p.brand) brands.add(p.brand);
    }
    return Array.from(brands).sort();
  }, [products]);

  // ── State ──
  const [localContent, setLocalContent] = useState(aiContent);
  const [localProducts, setLocalProducts] = useState(products);
  const [search, setSearch] = useState("");
  const [storeFilters, setStoreFilters] = useState<string[]>([]);
  const [brandFilters, setBrandFilters] = useState<string[]>([]);
  const [contentStatusFilters, setContentStatusFilters] = useState<string[]>([]);
  const [discountFilter, setDiscountFilter] = useState<string | null>("17");
  const [googleFilter, setGoogleFilter] = useState<string | null>(null);
  const [discountSort, setDiscountSort] = useState<string | null>(null);
  const [priceSort, setPriceSort] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set());

  // Selection
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  // Google Merchant
  const [googleSentProducts, setGoogleSentProducts] = useState<Set<string>>(new Set());
  const [googleSendingProducts, setGoogleSendingProducts] = useState<Set<string>>(new Set());

  // Modal
  const [modal, setModal] = useState<{
    product: Product;
    contentType: "deal_post" | "social_post";
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingContent, setEditingContent] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  // Bulk generation
  const [bulkGenerating, setBulkGenerating] = useState<{
    storeId: string;
    type: "deal_post" | "social_post";
    current: number;
    total: number;
  } | null>(null);

  // Bulk delete confirm
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // ── Derived ──
  const contentMap = useMemo(() => buildContentMap(localContent), [localContent]);

  const filtered = useMemo(() => {
    let result = localProducts;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.brand && p.brand.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q))
      );
    }

    if (storeFilters.length > 0) {
      result = result.filter(
        (p) => storeMap[p.store_id]?.name && storeFilters.includes(storeMap[p.store_id].name)
      );
    }

    if (brandFilters.length > 0) {
      result = result.filter((p) => p.brand && brandFilters.includes(p.brand));
    }

    if (discountFilter) {
      const min = parseInt(discountFilter);
      result = result.filter(
        (p) => p.discount_percentage && p.discount_percentage >= min
      );
    }

    if (contentStatusFilters.length > 0) {
      result = result.filter((p) => {
        const entry = contentMap.get(p.id);
        const status =
          !entry || (!entry.hasDeal && !entry.hasPost)
            ? "no_content"
            : entry.hasDeal && !entry.hasPost
            ? "deals_only"
            : !entry.hasDeal && entry.hasPost
            ? "posts_only"
            : "complete";
        return contentStatusFilters.includes(status);
      });
    }

    if (googleFilter) {
      result = result.filter((p) => {
        const isSent = googleSentProducts.has(p.id);
        if (googleFilter === "added") return isSent;
        if (googleFilter === "not_added") return !isSent;
        return true;
      });
    }

    result = [...result];
    if (discountSort) {
      result.sort((a, b) => {
        const da = a.discount_percentage || 0;
        const db = b.discount_percentage || 0;
        return discountSort === "desc" ? db - da : da - db;
      });
    } else if (priceSort) {
      result.sort((a, b) =>
        priceSort === "desc" ? b.price - a.price : a.price - b.price
      );
    }

    return result;
  }, [
    localProducts,
    search,
    storeFilters,
    brandFilters,
    contentStatusFilters,
    discountFilter,
    googleFilter,
    discountSort,
    priceSort,
    storeMap,
    contentMap,
    googleSentProducts,
  ]);

  // Content status counts (for filter badges)
  const contentCounts = useMemo(() => {
    let noContent = 0;
    let dealsOnly = 0;
    let postsOnly = 0;
    let complete = 0;
    for (const p of localProducts) {
      const entry = contentMap.get(p.id);
      if (!entry || (!entry.hasDeal && !entry.hasPost)) noContent++;
      else if (entry.hasDeal && !entry.hasPost) dealsOnly++;
      else if (!entry.hasDeal && entry.hasPost) postsOnly++;
      else if (entry.hasDeal && entry.hasPost) complete++;
    }
    return { noContent, dealsOnly, postsOnly, complete };
  }, [localProducts, contentMap]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  // Store groups (for store view)
  const storeGroups = useMemo((): StoreGroupData[] => {
    const groups = new Map<string, Product[]>();
    for (const p of filtered) {
      const arr = groups.get(p.store_id) || [];
      arr.push(p);
      groups.set(p.store_id, arr);
    }
    return Array.from(groups.entries())
      .map(([storeId, prods]) => {
        let dealCount = 0;
        let postCount = 0;
        let totalDiscount = 0;
        let discountedCount = 0;
        for (const p of prods) {
          const entry = contentMap.get(p.id);
          if (entry?.hasDeal) dealCount++;
          if (entry?.hasPost) postCount++;
          if (p.discount_percentage && p.discount_percentage > 0) {
            totalDiscount += p.discount_percentage;
            discountedCount++;
          }
        }
        return {
          store: storeMap[storeId] || {
            id: storeId,
            name: "Unknown",
            url: "",
            user_id: "",
            product_count: 0,
            last_scraped_at: null,
            status: "active" as const,
            created_at: "",
          },
          products: prods,
          dealCount,
          postCount,
          avgDiscount:
            discountedCount > 0
              ? Math.round(totalDiscount / discountedCount)
              : 0,
        };
      })
      .sort((a, b) => b.products.length - a.products.length);
  }, [filtered, contentMap, storeMap]);

  const hasAnyFilter = storeFilters.length > 0 || brandFilters.length > 0 || contentStatusFilters.length > 0 || discountFilter || googleFilter;

  // ── Filter options ──
  const contentStatusOptions = [
    { label: t("noContent"), value: "no_content", count: contentCounts.noContent },
    { label: t("dealsOnly"), value: "deals_only", count: contentCounts.dealsOnly },
    { label: t("postsOnly"), value: "posts_only", count: contentCounts.postsOnly },
    { label: t("complete"), value: "complete", count: contentCounts.complete },
  ];

  const discountOptions = [
    { label: t("anyDiscount"), value: "1" },
    { label: t("discount17"), value: "17" },
    { label: t("discount20"), value: "20" },
    { label: t("discount30"), value: "30" },
    { label: t("discount50"), value: "50" },
  ];

  const googleMerchantOptions = [
    { label: t("googleAdded"), value: "added" },
    { label: t("googleNotAdded"), value: "not_added" },
  ];

  const sortDiscountOptions = [
    { label: t("highToLow"), value: "desc" },
    { label: t("lowToHigh"), value: "asc" },
  ];

  const sortPriceOptions = [
    { label: t("highToLow"), value: "desc" },
    { label: t("lowToHigh"), value: "asc" },
  ];

  // ── Actions ──

  function clearAll() {
    setStoreFilters([]);
    setBrandFilters([]);
    setContentStatusFilters([]);
    setDiscountFilter("17");
    setGoogleFilter(null);
    setDiscountSort(null);
    setPriceSort(null);
    setSearch("");
    setCurrentPage(1);
  }

  function handlePageChange(page: number) {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openModal(product: Product, contentType: "deal_post" | "social_post") {
    setModal({ product, contentType });
  }

  const handleGenerate = useCallback(
    (product: Product, contentType: "deal_post" | "social_post") => {
      setIsGenerating(true);
      setTimeout(() => {
        const storeName = storeMap[product.store_id]?.name || "Store";
        const text = generateFakeContent(product, storeName, contentType);
        const newContent: AIGeneratedContent = {
          id: `ai-gen-${Date.now()}`,
          store_id: product.store_id,
          store_name: storeName,
          product_id: product.id,
          product_title: product.title,
          content_type: contentType,
          content: text,
          created_at: new Date().toISOString(),
        };
        setLocalContent((prev) => [...prev, newContent]);
        setIsGenerating(false);
        setEditingContent(null);
        const typeLabel =
          contentType === "deal_post" ? t("dealPost") : t("socialPost");
        toast(t("contentGenerated"), {
          description: t("contentGeneratedDescription", {
            type: typeLabel,
            title: product.title,
          }),
        });
      }, 2500);
    },
    [storeMap, t]
  );

  function handleRegenerate(
    product: Product,
    contentType: "deal_post" | "social_post"
  ) {
    setLocalContent((prev) =>
      prev.filter(
        (c) =>
          !(c.product_id === product.id && c.content_type === contentType)
      )
    );
    handleGenerate(product, contentType);
  }

  function handleSendToWebhook(
    product: Product,
    contentType: "deal_post" | "social_post"
  ) {
    const typeLabel =
      contentType === "deal_post" ? t("dealPost") : t("socialPost");
    toast(t("webhookSent"), {
      description: t("webhookSentDescription", {
        type: typeLabel,
        title: product.title,
      }),
    });
  }

  function handleSaveEdit(
    productId: string,
    contentType: "deal_post" | "social_post"
  ) {
    setLocalContent((prev) =>
      prev.map((c) =>
        c.product_id === productId && c.content_type === contentType
          ? { ...c, content: editText }
          : c
      )
    );
    setEditingContent(null);
    setEditText("");
  }

  function handleBulkGenerate(
    storeId: string,
    storeProducts: Product[],
    contentType: "deal_post" | "social_post"
  ) {
    const needsContent = storeProducts.filter((p) => {
      const entry = contentMap.get(p.id);
      if (contentType === "deal_post") return !entry?.hasDeal;
      return !entry?.hasPost;
    });

    if (needsContent.length === 0) return;

    setBulkGenerating({
      storeId,
      type: contentType,
      current: 0,
      total: needsContent.length,
    });

    let i = 0;
    const interval = setInterval(() => {
      const product = needsContent[i];
      const storeName = storeMap[product.store_id]?.name || "Store";
      const text = generateFakeContent(product, storeName, contentType);
      const newContent: AIGeneratedContent = {
        id: `ai-gen-${Date.now()}-${i}`,
        store_id: product.store_id,
        store_name: storeName,
        product_id: product.id,
        product_title: product.title,
        content_type: contentType,
        content: text,
        created_at: new Date().toISOString(),
      };
      setLocalContent((prev) => [...prev, newContent]);

      i++;
      setBulkGenerating((prev) =>
        prev ? { ...prev, current: i } : null
      );

      if (i >= needsContent.length) {
        clearInterval(interval);
        setBulkGenerating(null);
        const typeLabel = contentType === "deal_post" ? "deals" : "posts";
        toast(
          t("bulkComplete", {
            count: needsContent.length,
            type: typeLabel,
            store: storeMap[storeId]?.name || "Store",
          })
        );
      }
    }, 800);
  }

  // Google Merchant
  function handleSendToGoogle(product: Product) {
    setGoogleSendingProducts((prev) => new Set(prev).add(product.id));
    setTimeout(() => {
      setGoogleSendingProducts((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
      setGoogleSentProducts((prev) => new Set(prev).add(product.id));
      toast(t("googleSent"), {
        description: t("googleSentDescription", { title: product.title }),
      });
    }, 1500);
  }

  function getGoogleStatus(productId: string): "none" | "sending" | "sent" {
    if (googleSendingProducts.has(productId)) return "sending";
    if (googleSentProducts.has(productId)) return "sent";
    return "none";
  }

  // Selection
  function toggleSelect(productId: string) {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  function toggleSelectAll() {
    const currentIds = filtered.map((p) => p.id);
    const allSelected = currentIds.every((id) => selectedProducts.has(id));
    if (allSelected) {
      setSelectedProducts((prev) => {
        const next = new Set(prev);
        for (const id of currentIds) next.delete(id);
        return next;
      });
    } else {
      setSelectedProducts((prev) => {
        const next = new Set(prev);
        for (const id of currentIds) next.add(id);
        return next;
      });
    }
  }

  function handleToggleStoreProducts(productIds: string[]) {
    const allSelected = productIds.every((id) => selectedProducts.has(id));
    if (allSelected) {
      setSelectedProducts((prev) => {
        const next = new Set(prev);
        for (const id of productIds) next.delete(id);
        return next;
      });
    } else {
      setSelectedProducts((prev) => {
        const next = new Set(prev);
        for (const id of productIds) next.add(id);
        return next;
      });
    }
  }

  const allFilteredSelected =
    filtered.length > 0 &&
    filtered.every((p) => selectedProducts.has(p.id));

  // Delete
  function handleDeleteProduct(product: Product) {
    setLocalProducts((prev) => prev.filter((p) => p.id !== product.id));
    setLocalContent((prev) => prev.filter((c) => c.product_id !== product.id));
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      next.delete(product.id);
      return next;
    });
    toast(t("productDeleted"), {
      description: t("productDeletedDescription", { title: product.title }),
    });
  }

  function handleBulkDelete() {
    setLocalProducts((prev) =>
      prev.filter((p) => !selectedProducts.has(p.id))
    );
    setLocalContent((prev) =>
      prev.filter((c) => !c.product_id || !selectedProducts.has(c.product_id))
    );
    const count = selectedProducts.size;
    setSelectedProducts(new Set());
    setShowBulkDeleteConfirm(false);
    toast(t("bulkDeleted", { count }));
  }

  // Store expand/collapse
  function toggleStore(storeId: string) {
    setExpandedStores((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) next.delete(storeId);
      else next.add(storeId);
      return next;
    });
  }

  function expandAll() {
    setExpandedStores(new Set(storeGroups.map((g) => g.store.id)));
  }

  function collapseAll() {
    setExpandedStores(new Set());
  }

  // ═══════════════════════════════════
  // ─── RENDER ───
  // ═══════════════════════════════════

  return (
    <div>
      {/* Discount notice banner */}
      {discountFilter && (
        <div
          className="flex items-center gap-2 px-4 py-2 mb-4 border-2"
          style={{
            backgroundColor: "rgba(202,255,4,0.04)",
            borderColor: "var(--border)",
            borderLeft: "4px solid #CAFF04",
          }}
        >
          <Tags className="w-3.5 h-3.5" style={{ color: "#CAFF04" }} />
          <p
            className="text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            {t("discountNotice", { min: discountFilter })}
          </p>
        </div>
      )}

      {/* ── Toolbar Row 1: Search + View Toggle + Filter Toggle + Selection Actions ── */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {/* Search */}
        <div className="relative" style={{ minWidth: 220 }}>
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: "var(--muted-foreground)" }}
          />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={t("searchProducts")}
            className="pl-8 pr-3 py-2 text-xs border-2 outline-none transition-colors duration-150 focus:border-primary"
            style={{
              backgroundColor: "var(--input)",
              borderColor: "var(--border)",
              color: "var(--foreground)",
              borderRadius: 0,
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
            }}
          />
        </div>

        {/* View mode toggle */}
        <ToggleGroup
          options={[
            {
              label: t("viewAll"),
              value: "all",
              icon: <LayoutGrid className="w-3 h-3" />,
            },
            {
              label: t("viewStores"),
              value: "stores",
              icon: <StoreIcon className="w-3 h-3" />,
            },
          ]}
          value={viewMode}
          onChange={(v) => {
            setViewMode(v);
            setCurrentPage(1);
          }}
        />

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors"
          style={{
            fontFamily: "var(--font-mono)",
            backgroundColor: showFilters
              ? "rgba(202,255,4,0.06)"
              : "transparent",
            borderColor: showFilters
              ? "rgba(202,255,4,0.3)"
              : "var(--border)",
            color: showFilters ? "#CAFF04" : "var(--muted-foreground)",
          }}
        >
          <SlidersHorizontal className="w-3 h-3" />
          {t("showFilters")}
        </button>

        {/* Select All */}
        <label className="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={allFilteredSelected}
            onChange={toggleSelectAll}
            className="sr-only"
          />
          <div
            className="w-4 h-4 border-2 flex items-center justify-center transition-colors"
            style={{
              backgroundColor: allFilteredSelected
                ? "#CAFF04"
                : "transparent",
              borderColor: allFilteredSelected ? "#CAFF04" : "var(--border)",
            }}
          >
            {allFilteredSelected && (
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                stroke="#0A0A0A"
                strokeWidth="2"
                strokeLinecap="square"
              >
                <path d="M2 5l2.5 2.5L8 3" />
              </svg>
            )}
          </div>
          <span
            className="text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            {t("selectAll")}
          </span>
        </label>

        {/* Selected count + Bulk Delete */}
        {selectedProducts.size > 0 && (
          <>
            <span
              className="text-[10px] font-bold uppercase tracking-[0.15em]"
              style={{
                fontFamily: "var(--font-mono)",
                color: "#CAFF04",
              }}
            >
              {t("selectedCount", { count: selectedProducts.size })}
            </span>
            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-150 hover:opacity-80"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: "#FF453A12",
                border: "1.5px solid #FF453A40",
                color: "#FF453A",
              }}
            >
              <Trash2 className="w-3 h-3" />
              {t("deleteSelected")}
            </button>
          </>
        )}

        {/* Clear all */}
        {(hasAnyFilter || search.trim()) && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:opacity-80"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            <X className="w-3 h-3" />
            {t("clear")}
          </button>
        )}

        {/* Count */}
        <p
          className="ml-auto text-[10px] font-bold uppercase tracking-[0.15em] whitespace-nowrap"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
          }}
        >
          {hasAnyFilter || search.trim()
            ? t("productsFiltered", {
                filtered: filtered.length,
                total: localProducts.length,
              })
            : t("productsFound", { count: localProducts.length })}
        </p>
      </div>

      {/* ── Toolbar Row 2: Filters (collapsible) ── */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <MultiSearchableFilter
            label={t("store")}
            resetLabel={t("allStores")}
            searchPlaceholder={t("searchStore")}
            emptyText={t("noResults")}
            selectedText={(count) => t("storesSelected", { count })}
            options={storeNames}
            value={storeFilters}
            onChange={(v) => {
              setStoreFilters(v);
              setCurrentPage(1);
            }}
          />
          <MultiSearchableFilter
            label={t("brand")}
            resetLabel={t("allBrands")}
            searchPlaceholder={t("searchBrand")}
            emptyText={t("noResults")}
            selectedText={(count) => t("brandsSelected", { count })}
            options={brandNames}
            value={brandFilters}
            onChange={(v) => {
              setBrandFilters(v);
              setCurrentPage(1);
            }}
          />
          <MultiSimpleFilter
            label={t("contentStatus")}
            resetLabel={t("allContent")}
            selectedText={(count) => t("contentSelected", { count })}
            options={contentStatusOptions}
            value={contentStatusFilters}
            onChange={(v) => {
              setContentStatusFilters(v);
              setCurrentPage(1);
            }}
          />
          <SimpleFilter
            label={t("discount")}
            resetLabel={t("allDiscounts")}
            options={discountOptions}
            value={discountFilter}
            onChange={(v) => {
              setDiscountFilter(v);
              setCurrentPage(1);
            }}
          />
          <SimpleFilter
            label={t("googleMerchant")}
            resetLabel={t("googleAll")}
            options={googleMerchantOptions}
            value={googleFilter}
            onChange={(v) => {
              setGoogleFilter(v);
              setCurrentPage(1);
            }}
          />
          <SimpleFilter
            label={t("sortDiscount")}
            resetLabel={t("noSort")}
            options={sortDiscountOptions}
            value={discountSort}
            onChange={(v) => {
              setDiscountSort(v);
              if (v) setPriceSort(null);
              setCurrentPage(1);
            }}
          />
          <SimpleFilter
            label={t("sortPrice")}
            resetLabel={t("noSort")}
            options={sortPriceOptions}
            value={priceSort}
            onChange={(v) => {
              setPriceSort(v);
              if (v) setDiscountSort(null);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      {/* ── ALL PRODUCTS VIEW ── */}
      {viewMode === "all" && (
        <>
          {paginatedProducts.length === 0 ? (
            <div
              className="border-2 py-16 text-center"
              style={{
                backgroundColor: "var(--card)",
                borderColor: "var(--border)",
              }}
            >
              <p
                className="text-[11px] font-bold uppercase tracking-[0.15em]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                }}
              >
                {t("noProducts")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  store={storeMap[product.store_id]}
                  entry={contentMap.get(product.id)}
                  search={search}
                  isSelected={selectedProducts.has(product.id)}
                  googleStatus={getGoogleStatus(product.id)}
                  t={t}
                  onOpenModal={openModal}
                  onToggleSelect={toggleSelect}
                  onSendToGoogle={handleSendToGoogle}
                  onDelete={handleDeleteProduct}
                />
              ))}
            </div>
          )}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}

      {/* ── STORE GROUPED VIEW ── */}
      {viewMode === "stores" && (
        <StoreGroupView
          storeGroups={storeGroups}
          expandedStores={expandedStores}
          contentMap={contentMap}
          storeMap={storeMap}
          search={search}
          selectedProducts={selectedProducts}
          googleSentProducts={googleSentProducts}
          googleSendingProducts={googleSendingProducts}
          bulkGenerating={bulkGenerating}
          t={t}
          onToggleStore={toggleStore}
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
          onBulkGenerate={handleBulkGenerate}
          onOpenModal={openModal}
          onToggleSelect={toggleSelect}
          onToggleStoreProducts={handleToggleStoreProducts}
          onSendToGoogle={handleSendToGoogle}
          onDeleteProduct={handleDeleteProduct}
        />
      )}

      {/* ── CONTENT DIALOG ── */}
      <ContentDialog
        modal={modal}
        contentMap={contentMap}
        isGenerating={isGenerating}
        editingContent={editingContent}
        editText={editText}
        storeMap={storeMap}
        t={t}
        onClose={() => {
          setModal(null);
          setIsGenerating(false);
          setEditingContent(null);
          setEditText("");
        }}
        onGenerate={handleGenerate}
        onRegenerate={handleRegenerate}
        onSendToWebhook={handleSendToWebhook}
        onStartEdit={(id, text) => {
          setEditingContent(id);
          setEditText(text);
        }}
        onCancelEdit={() => {
          setEditingContent(null);
          setEditText("");
        }}
        onSaveEdit={handleSaveEdit}
        onEditTextChange={setEditText}
      />

      {/* ── BULK DELETE CONFIRM DIALOG ── */}
      <Dialog
        open={showBulkDeleteConfirm}
        onOpenChange={(open) => {
          if (!open) setShowBulkDeleteConfirm(false);
        }}
      >
        <DialogContent
          className="border-2 p-0 gap-0 sm:max-w-md"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--card)",
            borderRadius: 0,
          }}
        >
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle
              className="text-[13px] font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              {t("confirmBulkDelete", { count: selectedProducts.size })}
            </DialogTitle>
            <p
              className="text-[11px] mt-2"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--muted-foreground)",
              }}
            >
              {t("confirmBulkDeleteDescription", {
                count: selectedProducts.size,
              })}
            </p>
          </DialogHeader>
          <div
            className="flex items-center justify-end gap-2 px-6 pb-6 pt-2"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <button
              onClick={() => setShowBulkDeleteConfirm(false)}
              className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors hover:opacity-80"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: "transparent",
                borderColor: "var(--border)",
                color: "var(--muted-foreground)",
              }}
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none shadow-[3px_3px_0px]"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: "#FF453A",
                borderColor: "#FF453A",
                color: "#fff",
                boxShadow: "3px 3px 0px #FF453A",
              }}
            >
              <Trash2 className="w-3 h-3" />
              {t("deleteSelected")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
