"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Eye,
  Tags,
  PenSquare,
  Search,
  ChevronDown,
  X,
  Check,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/domain/status-badge";
import { Pagination } from "@/components/domain/pagination";
import { ProductImage } from "@/components/domain/product-image";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useFilterNavigation } from "@/hooks/use-filter-navigation";
import { canDeleteProduct } from "@/lib/auth/roles";
import { useAuthAccess } from "@/components/domain/role-provider";
import type { Product, Store, AIGeneratedContent } from "@/types";
import { ContentDialog } from "@/app/dashboard/ai-content/_components/content-dialog";
import { buildContentMap } from "@/app/dashboard/ai-content/_components/utils";

interface ProductCatalogProps {
  products: Product[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  stores: Store[];
  aiContent: AIGeneratedContent[];
  filters: {
    search: string;
    storeId: string | null;
    stockFilter: string | null;
    discountFilter: string | null;
    minPrice: string;
    maxPrice: string;
  };
}

function formatRelativeTime(
  timestamp: string,
  tt: (key: string, values: { count: number }) => string
) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return tt("minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return tt("hoursAgo", { count: hours });
  const days = Math.floor(hours / 24);
  return tt("daysAgo", { count: days });
}

// ─── Text Highlight ───

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-transparent"
            style={{ color: "var(--primary-text)" }}
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

// ─── Searchable Combobox (store filter — displays name, passes id) ───

function StoreFilter({
  label,
  resetLabel,
  searchPlaceholder,
  emptyText,
  stores,
  value,
  onChange,
}: {
  label: string;
  resetLabel: string;
  searchPlaceholder: string;
  emptyText: string;
  stores: Store[];
  value: string | null;
  onChange: (storeId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedStore = stores.find((s) => s.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          suppressHydrationWarning
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors"
          style={{
            fontFamily: "var(--font-mono)",
            backgroundColor: value ? "var(--primary-muted)" : "transparent",
            borderColor: value ? "var(--primary-muted)" : "var(--border)",
            color: value ? "var(--primary-text)" : "var(--muted-foreground)",
          }}
        >
          {selectedStore?.name || label}
          <ChevronDown className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="p-0 border-2 w-[220px]"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--card)",
          borderRadius: 0,
        }}
      >
        <Command
          style={{ backgroundColor: "transparent", borderRadius: 0 }}
        >
          <CommandInput
            placeholder={searchPlaceholder}
            className="text-[11px]"
            style={{ fontFamily: "var(--font-mono)", borderRadius: 0 }}
          />
          <CommandList
            className="scrollbar-none"
            style={{ maxHeight: 240 }}
          >
            <CommandEmpty>
              <span
                className="text-[10px] font-bold uppercase tracking-[0.15em]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                }}
              >
                {emptyText}
              </span>
            </CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className="text-[10px] font-bold uppercase tracking-[0.15em]"
                  style={{ fontFamily: "var(--font-mono)", borderRadius: 0 }}
                >
                  <X className="w-3 h-3 mr-1.5 opacity-50" />
                  {resetLabel}
                </CommandItem>
              )}
              {stores.map((store) => (
                <CommandItem
                  key={store.id}
                  value={store.name}
                  onSelect={() => {
                    onChange(store.id === value ? null : store.id);
                    setOpen(false);
                  }}
                  className="text-[10px] font-bold uppercase tracking-[0.15em]"
                  style={{ fontFamily: "var(--font-mono)", borderRadius: 0 }}
                >
                  {value === store.id ? (
                    <Check className="w-3 h-3 mr-1.5 text-[var(--primary-text)]" />
                  ) : (
                    <span className="w-3 mr-1.5" />
                  )}
                  {store.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Simple Dropdown (for short option lists) ───

function SimpleFilter({
  label,
  resetLabel,
  options,
  value,
  onChange,
}: {
  label: string;
  resetLabel: string;
  options: { label: string; value: string }[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeLabel = options.find((o) => o.value === value)?.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          suppressHydrationWarning
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors"
          style={{
            fontFamily: "var(--font-mono)",
            backgroundColor: value ? "var(--primary-muted)" : "transparent",
            borderColor: value ? "var(--primary-muted)" : "var(--border)",
            color: value ? "var(--primary-text)" : "var(--muted-foreground)",
          }}
        >
          {activeLabel || label}
          <ChevronDown className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="p-1 border-2 w-[180px]"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--card)",
          borderRadius: 0,
        }}
      >
        {value && (
          <button
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-[var(--subtle-overlay)]"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            <X className="w-3 h-3 opacity-50" />
            {resetLabel}
          </button>
        )}
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => {
              onChange(option.value === value ? null : option.value);
              setOpen(false);
            }}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-[var(--subtle-overlay)]"
            style={{ fontFamily: "var(--font-mono)", borderRadius: 0 }}
          >
            {value === option.value ? (
              <Check className="w-3 h-3" style={{ color: "var(--primary-text)" }} />
            ) : (
              <span className="w-3" />
            )}
            {option.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ─── Main Catalog ───

export function ProductCatalog({
  products,
  totalCount,
  totalPages,
  currentPage,
  stores,
  aiContent,
  filters,
}: ProductCatalogProps) {
  const t = useTranslations("Products");
  const tAI = useTranslations("AIContent");
  const ts = useTranslations("Status");
  const tt = useTranslations("Time");
  const access = useAuthAccess();
  // Product delete is admin-only; keep UI and API behavior aligned.
  const allowDeleteProduct = canDeleteProduct(access);

  const { setFilter, clearAll, isPending } = useFilterNavigation();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  // ── AI Content Dialog state ──
  const [localContent, setLocalContent] = useState(aiContent);
  const [modal, setModal] = useState<{
    product: Product;
    contentType: "deal_post" | "social_post";
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingContent, setEditingContent] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    setLocalContent(aiContent);
  }, [aiContent]);

  const contentMap = useMemo(() => buildContentMap(localContent), [localContent]);

  // Clear deleted IDs when server data changes (filter/page navigation)
  useEffect(() => {
    setDeletedIds(new Set());
  }, [products]);

  const visibleProducts = useMemo(
    () => (deletedIds.size > 0 ? products.filter((p) => !deletedIds.has(p.id)) : products),
    [products, deletedIds]
  );

  async function handleDelete(product: Product) {
    if (!allowDeleteProduct || deletingId) return;
    setDeletingId(product.id);
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setDeletedIds((prev) => new Set(prev).add(product.id));
      toast(t("productDeleted"), {
        description: t("productDeletedDescription", { title: product.title }),
      });
    } catch {
      toast.error(t("deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  }

  // ── AI Content handlers ──

  function openModal(product: Product, contentType: "deal_post" | "social_post") {
    setModal({ product, contentType });
  }

  const handleGenerate = useCallback(
    async (product: Product, contentType: "deal_post" | "social_post") => {
      setIsGenerating(true);
      try {
        const res = await fetch("/api/ai-content/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product.id, contentType }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(err.error || `HTTP ${res.status}`);
        }

        const newContent: AIGeneratedContent = await res.json();
        setLocalContent((prev) => [
          ...prev.filter(
            (c) => !(c.product_id === product.id && c.content_type === contentType)
          ),
          newContent,
        ]);
        setEditingContent(null);
        const typeLabel =
          contentType === "deal_post" ? tAI("dealPost") : tAI("socialPost");
        toast(tAI("contentGenerated"), {
          description: tAI("contentGeneratedDescription", {
            type: typeLabel,
            title: product.title,
          }),
        });
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to generate content"
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [tAI]
  );

  function handleRegenerate(
    product: Product,
    contentType: "deal_post" | "social_post"
  ) {
    handleGenerate(product, contentType);
  }

  async function handleSaveEdit(
    productId: string,
    contentType: "deal_post" | "social_post"
  ) {
    const entry = localContent.find(
      (c) => c.product_id === productId && c.content_type === contentType
    );
    setLocalContent((prev) =>
      prev.map((c) =>
        c.product_id === productId && c.content_type === contentType
          ? { ...c, content: editText }
          : c
      )
    );
    setEditingContent(null);
    setEditText("");
    if (entry) {
      try {
        const res = await fetch(`/api/ai-content/${entry.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: editText }),
        });
        if (!res.ok) toast.error("Failed to save edit to database");
      } catch {
        toast.error("Failed to save edit to database");
      }
    }
  }

  function handleSendToWebhook() {
    toast(tAI("comingSoon"));
  }

  const storeMap = useMemo(
    () => Object.fromEntries(stores.map((s) => [s.id, s])),
    [stores]
  );
  const sortedStores = useMemo(
    () => [...stores].sort((a, b) => a.name.localeCompare(b.name)),
    [stores]
  );

  // Debounced search input
  const [searchInput, setSearchInput] = useState(filters.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Sync search input when URL changes externally (back/forward)
  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilter("search", value || null);
    }, 400);
  }

  // Price inputs — local state with debounce
  const [localMinPrice, setLocalMinPrice] = useState(filters.minPrice);
  const [localMaxPrice, setLocalMaxPrice] = useState(filters.maxPrice);
  const minPriceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const maxPriceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    setLocalMinPrice(filters.minPrice);
  }, [filters.minPrice]);
  useEffect(() => {
    setLocalMaxPrice(filters.maxPrice);
  }, [filters.maxPrice]);

  function handleMinPriceChange(value: string) {
    setLocalMinPrice(value);
    if (minPriceRef.current) clearTimeout(minPriceRef.current);
    minPriceRef.current = setTimeout(() => {
      setFilter("minPrice", value || null);
    }, 600);
  }

  function handleMaxPriceChange(value: string) {
    setLocalMaxPrice(value);
    if (maxPriceRef.current) clearTimeout(maxPriceRef.current);
    maxPriceRef.current = setTimeout(() => {
      setFilter("maxPrice", value || null);
    }, 600);
  }

  const hasAnyFilter =
    filters.storeId || filters.stockFilter || filters.discountFilter || filters.minPrice || filters.maxPrice;

  const stockOptions = [
    { label: ts("inStock"), value: "in_stock" },
    { label: ts("outOfStock"), value: "out_of_stock" },
  ];

  const discountOptions = [
    { label: t("noDiscount"), value: "none" },
    { label: t("anyDiscount"), value: "any" },
    { label: t("discount10"), value: "10" },
    { label: t("discount20"), value: "20" },
    { label: t("discount30"), value: "30" },
    { label: t("discount50"), value: "50" },
  ];

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Search */}
        <div className="relative" style={{ minWidth: 220 }}>
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: "var(--muted-foreground)" }}
          />
          <Input
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
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

        {/* Store — searchable, ID-based */}
        <StoreFilter
          label={t("store")}
          resetLabel={t("allStores")}
          searchPlaceholder={t("searchStore")}
          emptyText={t("noResults")}
          stores={sortedStores}
          value={filters.storeId}
          onChange={(id) => setFilter("store", id)}
        />

        {/* Stock — simple */}
        <SimpleFilter
          label={t("stock")}
          resetLabel={t("allStock")}
          options={stockOptions}
          value={filters.stockFilter}
          onChange={(v) => setFilter("stock", v)}
        />

        {/* Discount — simple */}
        <SimpleFilter
          label={t("discount")}
          resetLabel={t("allDiscounts")}
          options={discountOptions}
          value={filters.discountFilter}
          onChange={(v) => setFilter("discount", v)}
        />

        {/* Price range */}
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={localMinPrice}
            onChange={(e) => handleMinPriceChange(e.target.value)}
            placeholder={t("minPrice")}
            className="w-[70px] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 outline-none transition-colors duration-150 focus:border-[var(--primary-text)]"
            style={{
              backgroundColor: "transparent",
              borderColor: localMinPrice ? "var(--primary-muted)" : "var(--border)",
              color: localMinPrice ? "var(--primary-text)" : "var(--muted-foreground)",
              borderRadius: 0,
              fontFamily: "var(--font-mono)",
            }}
          />
          <span
            className="text-[10px] font-bold"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            –
          </span>
          <input
            type="number"
            value={localMaxPrice}
            onChange={(e) => handleMaxPriceChange(e.target.value)}
            placeholder={t("maxPrice")}
            className="w-[70px] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 outline-none transition-colors duration-150 focus:border-[var(--primary-text)]"
            style={{
              backgroundColor: "transparent",
              borderColor: localMaxPrice ? "var(--primary-muted)" : "var(--border)",
              color: localMaxPrice ? "var(--primary-text)" : "var(--muted-foreground)",
              borderRadius: 0,
              fontFamily: "var(--font-mono)",
            }}
          />
        </div>

        {/* Clear all */}
        {(hasAnyFilter || filters.search) && (
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
          {hasAnyFilter || filters.search
            ? t("productsFiltered", {
                filtered: totalCount - deletedIds.size,
                total: totalCount - deletedIds.size,
              })
            : t("productsFound", { count: totalCount - deletedIds.size })}
        </p>
      </div>

      {/* Product grid */}
      <div
        style={{ opacity: isPending ? 0.6 : 1, transition: "opacity 150ms" }}
      >
        {visibleProducts.length === 0 ? (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {visibleProducts.map((product, index) => {
              const store = storeMap[product.store_id];
              const hasDiscount =
                product.discount_percentage && product.discount_percentage > 0;

              return (
                <div
                  key={product.id}
                  className="border-2 flex flex-col relative group"
                  style={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                  }}
                >
                  {allowDeleteProduct && (
                    <button
                      onClick={() => handleDelete(product)}
                      disabled={deletingId === product.id}
                      className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                      style={{
                        backgroundColor: "rgba(255,69,58,0.15)",
                        border: "1.5px solid rgba(255,69,58,0.4)",
                      }}
                      title={t("deleteProduct")}
                    >
                      {deletingId === product.id ? (
                        <Loader2
                          className="w-3 h-3 animate-spin"
                          style={{ color: "#FF453A" }}
                        />
                      ) : (
                        <Trash2 className="w-3 h-3" style={{ color: "#FF453A" }} />
                      )}
                    </button>
                  )}

                  {/* Image */}
                  <div
                    className="relative w-full aspect-square"
                    style={{ backgroundColor: "var(--input)" }}
                  >
                    <ProductImage
                      src={product.image_url}
                      alt={product.title}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      priority={index < 5}
                    />
                  </div>

                  {/* Body */}
                  <div className="p-3 flex flex-col flex-1">
                    {/* Store */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <div
                        className="w-4 h-4 flex-shrink-0 flex items-center justify-center text-[7px] font-bold"
                        style={{
                          fontFamily: "var(--font-mono)",
                          backgroundColor: "var(--primary-muted)",
                          color: "var(--primary-text)",
                        }}
                      >
                        {store?.name[0] || "?"}
                      </div>
                      <span
                        className="text-[9px] font-bold uppercase tracking-[0.15em]"
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        {store?.name || t("unknown")}
                      </span>
                    </div>

                    {/* Title */}
                    <p className="text-[12px] font-semibold line-clamp-2 mb-1 min-h-[2.5em]">
                      <Highlight text={product.title} query={filters.search} />
                    </p>

                    {/* Stock status */}
                    <div className="mb-3">
                      <StatusBadge status={product.stock_status} />
                    </div>

                    {/* Price */}
                    <div
                      className="mt-auto flex items-baseline gap-2 pt-3 mb-3"
                      style={{ borderTop: "1px solid var(--border)" }}
                    >
                      <span
                        className="text-sm font-bold"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        ${product.price.toFixed(2)}
                      </span>
                      {hasDiscount && product.original_price && (
                        <span
                          className="text-[10px] line-through"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          ${product.original_price.toFixed(2)}
                        </span>
                      )}
                      {hasDiscount && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5"
                          style={{
                            fontFamily: "var(--font-mono)",
                            backgroundColor: "rgba(34,197,94,0.9)",
                            color: "#fff",
                          }}
                        >
                          -{product.discount_percentage}%
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-1.5">
                      {/* Ghost — View */}
                      <Link
                        href={`/dashboard/products/${product.id}`}
                        className="flex items-center justify-center gap-1 px-1.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] border-2 transition-all duration-150 hover:opacity-80"
                        style={{
                          fontFamily: "var(--font-mono)",
                          backgroundColor: "transparent",
                          borderColor: "var(--border)",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        <Eye className="w-3 h-3" />
                        {t("view")}
                      </Link>
                      {/* Success semantic — Deals */}
                      {(() => {
                        const cEntry = contentMap.get(product.id);
                        return (
                          <button
                            onClick={() => openModal(product, "deal_post")}
                            className="flex items-center justify-center gap-1 px-1.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] transition-all duration-150 hover:opacity-80"
                            style={{
                              fontFamily: "var(--font-mono)",
                              backgroundColor: cEntry?.hasDeal ? "#22C55E" : "#22C55E12",
                              border: cEntry?.hasDeal
                                ? "1.5px solid #22C55E"
                                : "1.5px solid #22C55E40",
                              color: cEntry?.hasDeal ? "var(--primary-foreground)" : "#22C55E",
                            }}
                          >
                            <Tags className="w-3 h-3" />
                            {cEntry?.hasDeal ? t("deals") : t("deals")}
                          </button>
                        );
                      })()}
                      {/* Info semantic — Posts */}
                      {(() => {
                        const cEntry = contentMap.get(product.id);
                        return (
                          <button
                            onClick={() => openModal(product, "social_post")}
                            className="flex items-center justify-center gap-1 px-1.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] transition-all duration-150 hover:opacity-80"
                            style={{
                              fontFamily: "var(--font-mono)",
                              backgroundColor: cEntry?.hasPost ? "#5AC8FA" : "#5AC8FA12",
                              border: cEntry?.hasPost
                                ? "1.5px solid #5AC8FA"
                                : "1.5px solid #5AC8FA40",
                              color: cEntry?.hasPost ? "var(--primary-foreground)" : "#5AC8FA",
                            }}
                          >
                            <PenSquare className="w-3 h-3" />
                            {t("posts")}
                          </button>
                        );
                      })()}
                    </div>

                    {/* Updated timestamp */}
                    <p
                      suppressHydrationWarning
                      className="text-[9px] font-bold tracking-wider mt-3"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {t("updated", {
                        time: formatRelativeTime(product.updated_at, tt),
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(p) => setFilter("page", String(p))}
      />

      {/* ── AI CONTENT DIALOG ── */}
      <ContentDialog
        modal={modal}
        contentMap={contentMap}
        isGenerating={isGenerating}
        editingContent={editingContent}
        editText={editText}
        storeMap={storeMap}
        t={tAI}
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
    </div>
  );
}
