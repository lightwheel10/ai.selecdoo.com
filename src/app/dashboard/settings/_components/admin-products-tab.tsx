"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  X,
  Check,
  ChevronDown,
  Pencil,
  ExternalLink,
  Eye,
  RotateCcw,
  Trash2,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductImage } from "@/components/domain/product-image";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { canDeleteProduct, canAccessAdmin } from "@/lib/auth/roles";
import { useAuthAccess } from "@/components/domain/role-provider";
import type { Product, Store, StockStatus } from "@/types";

const ITEMS_PER_PAGE = 50;

// ─── Text Highlight ───

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(
    `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi"
  );
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-transparent" style={{ color: "var(--primary-text)" }}>
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

// ─── Icon Button ───

function IconButton({
  onClick,
  icon: Icon,
  title,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-7 h-7 flex items-center justify-center transition-all duration-150 hover:opacity-80"
      style={{
        backgroundColor: "transparent",
        border: "2px solid var(--border)",
        color: "var(--muted-foreground)",
      }}
    >
      <Icon className="w-3 h-3" />
    </button>
  );
}

// ─── Simple Filter ───

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
        style={{ borderColor: "var(--border)", backgroundColor: "var(--card)", borderRadius: 0 }}
      >
        {value && (
          <button
            onClick={() => { onChange(null); setOpen(false); }}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-[var(--subtle-overlay)]"
            style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
          >
            <X className="w-3 h-3 opacity-50" />
            {resetLabel}
          </button>
        )}
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => { onChange(option.value === value ? null : option.value); setOpen(false); }}
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

// ─── Searchable Filter ───

function SearchableFilter({
  label,
  resetLabel,
  searchPlaceholder,
  emptyText,
  options,
  value,
  onChange,
}: {
  label: string;
  resetLabel: string;
  searchPlaceholder: string;
  emptyText: string;
  options: string[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

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
          {value || label}
          <ChevronDown className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="p-0 border-2 w-[220px]"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--card)", borderRadius: 0 }}
      >
        <Command style={{ backgroundColor: "transparent", borderRadius: 0 }}>
          <CommandInput
            placeholder={searchPlaceholder}
            className="text-[11px]"
            style={{ fontFamily: "var(--font-mono)", borderRadius: 0 }}
          />
          <CommandList className="scrollbar-none" style={{ maxHeight: 240 }}>
            <CommandEmpty>
              <span
                className="text-[10px] font-bold uppercase tracking-[0.15em]"
                style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
              >
                {emptyText}
              </span>
            </CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  onSelect={() => { onChange(null); setOpen(false); }}
                  className="text-[10px] font-bold uppercase tracking-[0.15em]"
                  style={{ fontFamily: "var(--font-mono)", borderRadius: 0 }}
                >
                  <X className="w-3 h-3 mr-1.5 opacity-50" />
                  {resetLabel}
                </CommandItem>
              )}
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => { onChange(option === value ? null : option); setOpen(false); }}
                  className="text-[10px] font-bold uppercase tracking-[0.15em]"
                  style={{ fontFamily: "var(--font-mono)", borderRadius: 0 }}
                >
                  {value === option ? (
                    <Check className="w-3 h-3 mr-1.5" style={{ color: "var(--primary-text)" }} />
                  ) : (
                    <span className="w-3 mr-1.5" />
                  )}
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Publish Toggle ───

function PublishToggle({ published, onToggle }: { published: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-7 h-7 flex items-center justify-center transition-all duration-150"
      style={{
        backgroundColor: published ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.10)",
        border: `1.5px solid ${published ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.3)"}`,
        color: published ? "#22C55E" : "#EF4444",
      }}
    >
      {published ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
    </button>
  );
}

// ─── Helper Components ───

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[9px] font-bold uppercase tracking-[0.15em] mt-4 mb-2 pb-1"
      style={{
        fontFamily: "var(--font-mono)",
        color: "var(--muted-foreground)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {children}
    </p>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1 block"
      style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
    >
      {children}
    </label>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between px-3 py-2.5 mt-1.5 border-2 transition-all duration-150"
      style={{
        backgroundColor: checked ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.04)",
        borderColor: checked ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.2)",
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
          backgroundColor: checked ? "rgba(34,197,94,0.20)" : "rgba(239,68,68,0.12)",
          color: checked ? "#22C55E" : "#EF4444",
        }}
      >
        {checked ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      </div>
    </button>
  );
}

// ─── Products Tab ───

export function AdminProductsTab() {
  const t = useTranslations("Admin");
  const access = useAuthAccess();
  const allowDeleteProduct = canDeleteProduct(access);
  const allowAIClean = canAccessAdmin(access);

  const [localProducts, setLocalProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  // Tracks which product is currently being AI-cleaned (shows spinner on that row)
  const [cleaningProductId, setCleaningProductId] = useState<string | null>(null);
  // Bulk selection state — uses Set<string> matching the AI content workstation pattern
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [productsRes, storesRes] = await Promise.all([
        fetch("/api/admin/products"),
        fetch("/api/admin/stores"),
      ]);
      if (!productsRes.ok || !storesRes.ok) throw new Error("Failed to load data");
      const [productsData, storesData] = await Promise.all([
        productsRes.json(),
        storesRes.json(),
      ]);
      setLocalProducts(productsData.products ?? []);
      setStores(storesData.stores ?? []);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const storeMap = Object.fromEntries(stores.map((s) => [s.id, s]));
  const [search, setSearch] = useState("");
  const [publishFilter, setPublishFilter] = useState<string | null>(null);
  const [brandFilter, setBrandFilter] = useState<string | null>(null);
  const [affiliateFilter, setAffiliateFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [featuredFilter, setFeaturedFilter] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const uniqueBrands = useMemo(
    () => [...new Set(localProducts.map((p) => p.brand).filter(Boolean) as string[])].sort(),
    [localProducts]
  );

  const uniqueCategories = useMemo(
    () => [...new Set(localProducts.map((p) => p.ai_category).filter(Boolean) as string[])].sort(),
    [localProducts]
  );

  const publishOptions = [
    { label: t("publishedOnly"), value: "published" },
    { label: t("unpublishedOnly"), value: "unpublished" },
  ];

  const affiliateOptions = [
    { label: t("hasLink"), value: "has" },
    { label: t("noLink"), value: "none" },
  ];

  const featuredOptions = [
    { label: t("isFeatured"), value: "featured" },
    { label: t("notFeatured"), value: "not_featured" },
  ];

  const hasAnyFilter = publishFilter || brandFilter || affiliateFilter || categoryFilter || featuredFilter;

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

    if (publishFilter) {
      result = result.filter((p) =>
        publishFilter === "published" ? p.is_published : !p.is_published
      );
    }

    if (brandFilter) {
      result = result.filter((p) => p.brand === brandFilter);
    }

    if (affiliateFilter) {
      result = result.filter((p) =>
        affiliateFilter === "has" ? !!p.affiliate_link : !p.affiliate_link
      );
    }

    if (categoryFilter) {
      result = result.filter((p) => p.ai_category === categoryFilter);
    }

    if (featuredFilter) {
      result = result.filter((p) =>
        featuredFilter === "featured" ? !!p.is_featured : !p.is_featured
      );
    }

    return result;
  }, [localProducts, search, publishFilter, brandFilter, affiliateFilter, categoryFilter, featuredFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, publishFilter, brandFilter, affiliateFilter, categoryFilter, featuredFilter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  // Persist publish toggle immediately to DB (matches stores tab pattern).
  // Optimistic update: flip UI first, revert if API fails.
  async function togglePublish(id: string) {
    const product = localProducts.find((p) => p.id === id);
    if (!product) return;

    const newValue = !product.is_published;
    // Optimistic update
    setLocalProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_published: newValue } : p))
    );

    const res = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: newValue }),
    });

    if (!res.ok) {
      // Revert on failure
      setLocalProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_published: !newValue } : p))
      );
      toast.error(t("publishFailed"));
    }
  }

  // Soft-delete a product (same pattern as stores tab delete).
  // Removes from local list on success, shows error toast on failure.
  async function deleteProduct(id: string) {
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) {
      setLocalProducts((prev) => prev.filter((p) => p.id !== id));
      const product = localProducts.find((p) => p.id === id);
      toast(t("productDeleted"), {
        description: product ? t("productDeletedDescription", { title: product.title }) : undefined,
      });
    } else {
      toast.error(t("deleteFailed"));
    }
    setPendingDelete(null);
  }

  // One-click AI clean for a single product.
  // Calls POST /api/admin/clean with the product ID and "descriptions" scope.
  // On success, updates the local product with the cleaned fields so the
  // table reflects changes immediately without a full reload.
  async function handleAIClean(product: Product) {
    if (cleaningProductId) return; // Prevent concurrent cleans
    setCleaningProductId(product.id);
    try {
      const res = await fetch("/api/admin/clean", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: [product.id],
          scope: "descriptions",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const { results } = await res.json();
      const result = results?.[0];

      if (result?.status === "success") {
        // Refetch the updated product to get the cleaned fields
        const freshRes = await fetch("/api/admin/products");
        if (freshRes.ok) {
          const freshData = await freshRes.json();
          const freshProduct = (freshData.products ?? []).find(
            (p: Product) => p.id === product.id
          );
          if (freshProduct) {
            setLocalProducts((prev) =>
              prev.map((p) => (p.id === product.id ? freshProduct : p))
            );
          }
        }
        toast(t("aiCleanSuccess"), {
          description: t("aiCleanSuccessDescription", { title: product.title }),
        });
      } else {
        toast.error(result?.error || t("aiCleanFailed"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("aiCleanFailed"));
    } finally {
      setCleaningProductId(null);
    }
  }

  // ── Bulk selection helpers (matches AI content workstation pattern) ──

  function toggleSelect(productId: string) {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  // Selects/deselects ALL filtered products (across all pages, not just current page)
  function toggleSelectAll() {
    const allIds = filtered.map((p) => p.id);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedProducts.has(id));
    if (allSelected) {
      // Deselect all
      setSelectedProducts(new Set());
    } else {
      // Select all filtered products
      setSelectedProducts(new Set(allIds));
    }
  }

  const allFilteredSelected =
    filtered.length > 0 &&
    filtered.every((p) => selectedProducts.has(p.id));

  // Bulk delete — parallel individual DELETEs matching AI content workstation pattern
  async function handleBulkDelete() {
    const ids = Array.from(selectedProducts);
    const results = await Promise.allSettled(
      ids.map((id) => fetch(`/api/products/${id}`, { method: "DELETE" }))
    );
    const succeeded = results.filter(
      (r) => r.status === "fulfilled" && (r.value as Response).ok
    );
    if (succeeded.length > 0) {
      const deletedIds = new Set(
        ids.filter(
          (_, i) =>
            results[i].status === "fulfilled" &&
            (results[i] as PromiseFulfilledResult<Response>).value.ok
        )
      );
      setLocalProducts((prev) => prev.filter((p) => !deletedIds.has(p.id)));
      setSelectedProducts((prev) => {
        const next = new Set(prev);
        deletedIds.forEach((id) => next.delete(id));
        return next;
      });
      toast(t("bulkDeleted", { count: succeeded.length }));
    }
    if (succeeded.length < ids.length) {
      toast.error(t("bulkDeletePartialFail", { failed: ids.length - succeeded.length }));
    }
    setShowBulkDeleteConfirm(false);
  }

  function clearAll() {
    setPublishFilter(null);
    setBrandFilter(null);
    setAffiliateFilter(null);
    setCategoryFilter(null);
    setFeaturedFilter(null);
    setSearch("");
  }

  // 2026-03-18: saveProduct now persists to DB via PATCH API
  // (was previously local-state-only — changes were lost on refresh)
  const [saving, setSaving] = useState(false);

  async function saveProduct(updated: Product) {
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${updated.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_published: updated.is_published,
          is_featured: updated.is_featured,
          is_slider: updated.is_slider,
          ai_category: updated.ai_category,
          in_stock: updated.in_stock,
          description_de: updated.description_de,
          description_en: updated.description_en,
          image_url: updated.image_url,
          affiliate_link: updated.affiliate_link,
          ai_shipping_data: updated.ai_shipping_data,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Failed to save product");
        return;
      }

      setLocalProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
      setEditingProduct(null);
      toast(t("productSaved"), {
        description: t("productSavedDescription", { title: updated.title }),
      });
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div>
        {/* Toolbar skeleton */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Skeleton className="h-9 w-[280px]" />
          <Skeleton className="h-7 w-[78px]" />
          <Skeleton className="h-7 w-[70px]" />
          <Skeleton className="h-7 w-[108px]" />
          <Skeleton className="h-7 w-[82px]" />
          <Skeleton className="h-7 w-[82px]" />
          <Skeleton className="h-3 w-24 ml-auto" />
        </div>
        {/* Table skeleton */}
        <div
          className="border-2"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          {/* Header */}
          <div
            className="flex items-center px-4 h-10 border-b-2"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--table-header-bg)" }}
          >
            <Skeleton className="h-2.5 w-10" style={{ flex: "0 0 5%" }} />
            <Skeleton className="h-2.5 w-10" style={{ flex: "0 0 24%" }} />
            <Skeleton className="h-2.5 w-10 mx-auto" style={{ flex: "0 0 12%" }} />
            <Skeleton className="h-2.5 w-8 mx-auto" style={{ flex: "0 0 10%" }} />
            <Skeleton className="h-2.5 w-10 mx-auto" style={{ flex: "0 0 10%" }} />
            <Skeleton className="h-2.5 w-16 mx-auto" style={{ flex: "0 0 10%" }} />
            <Skeleton className="h-2.5 w-12 mx-auto" style={{ flex: "0 0 12%" }} />
          </div>
          {/* Rows */}
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center px-4 py-2"
              style={{ borderBottom: i < 9 ? "1px solid var(--border)" : "none" }}
            >
              <div style={{ flex: "0 0 5%" }}>
                <Skeleton className="h-8 w-8" />
              </div>
              <div style={{ flex: "0 0 24%" }}>
                <Skeleton className="h-3.5 w-36" />
              </div>
              <div className="flex justify-center" style={{ flex: "0 0 12%" }}>
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="flex justify-center" style={{ flex: "0 0 10%" }}>
                <Skeleton className="h-3 w-14" />
              </div>
              <div className="flex justify-center" style={{ flex: "0 0 10%" }}>
                <Skeleton className="h-5 w-14" />
              </div>
              <div className="flex justify-center" style={{ flex: "0 0 10%" }}>
                <Skeleton className="h-7 w-7" />
              </div>
              <div className="flex justify-center gap-1.5" style={{ flex: "0 0 12%" }}>
                <Skeleton className="h-7 w-7" />
                <Skeleton className="h-7 w-7" />
                <Skeleton className="h-7 w-7" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="border-2 py-16 flex flex-col items-center justify-center gap-3"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
        >
          {error}
        </p>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors hover:opacity-80"
          style={{ fontFamily: "var(--font-mono)", borderColor: "var(--border)", color: "var(--muted-foreground)" }}
        >
          <RotateCcw className="w-3 h-3" />
          {t("retry")}
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative" style={{ maxWidth: 280 }}>
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: "var(--muted-foreground)" }}
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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

        <SimpleFilter
          label={t("publish")}
          resetLabel={t("allPublish")}
          options={publishOptions}
          value={publishFilter}
          onChange={setPublishFilter}
        />
        <SearchableFilter
          label={t("brand")}
          resetLabel={t("allBrands")}
          searchPlaceholder={t("searchBrand")}
          emptyText={t("noResults")}
          options={uniqueBrands}
          value={brandFilter}
          onChange={setBrandFilter}
        />
        <SimpleFilter
          label={t("affiliateLink")}
          resetLabel={t("allAffiliateLinks")}
          options={affiliateOptions}
          value={affiliateFilter}
          onChange={setAffiliateFilter}
        />
        <SearchableFilter
          label={t("category")}
          resetLabel={t("allCategories")}
          searchPlaceholder={t("searchCategory")}
          emptyText={t("noResults")}
          options={uniqueCategories}
          value={categoryFilter}
          onChange={setCategoryFilter}
        />
        <SimpleFilter
          label={t("featuredFilter")}
          resetLabel={t("allFeatured")}
          options={featuredOptions}
          value={featuredFilter}
          onChange={setFeaturedFilter}
        />

        {(hasAnyFilter || search.trim()) && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:opacity-80"
            style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
          >
            <X className="w-3 h-3" />
            {t("clear")}
          </button>
        )}

        {/* Bulk selection controls — hidden until a product is selected.
            "Select all" selects ALL filtered products across all pages. */}
        {allowDeleteProduct && selectedProducts.size > 0 && (
          <>
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
                  backgroundColor: allFilteredSelected ? "var(--primary)" : "transparent",
                  borderColor: allFilteredSelected ? "var(--primary-text)" : "var(--border)",
                }}
              >
                {allFilteredSelected && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--primary-foreground)" strokeWidth="2" strokeLinecap="square">
                    <path d="M2 5l2.5 2.5L8 3" />
                  </svg>
                )}
              </div>
              <span
                className="text-[10px] font-bold uppercase tracking-[0.15em]"
                style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
              >
                {t("selectAll")}
              </span>
            </label>

            <span
              className="text-[10px] font-bold uppercase tracking-[0.15em]"
              style={{ fontFamily: "var(--font-mono)", color: "var(--primary-text)" }}
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

        <p
          className="ml-auto text-[10px] font-bold uppercase tracking-[0.15em] whitespace-nowrap"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
        >
          {hasAnyFilter || search.trim()
            ? t("productsFiltered", { filtered: filtered.length, total: localProducts.length })
            : t("productsCount", { count: localProducts.length })}
        </p>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div
          className="border-2 py-16 text-center"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <p
            className="text-[11px] font-bold uppercase tracking-[0.15em]"
            style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
          >
            {t("noProductsFound")}
          </p>
        </div>
      ) : (
        <div
          className="border-2 overflow-auto scrollbar-none"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
            maxHeight: "70vh",
          }}
        >
          <Table style={{ tableLayout: "fixed", width: "100%" }}>
            <colgroup>
              {/* Checkbox column only rendered when user has delete permission */}
              {allowDeleteProduct && <col style={{ width: "3%" }} />}
              <col style={{ width: "5%" }} />
              <col style={{ width: allowDeleteProduct ? "21%" : "24%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "12%" }} />
            </colgroup>
            <TableHeader>
              <TableRow
                className="border-b-2 hover:bg-transparent sticky top-0 z-10"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
              >
                {/* Checkbox header */}
                {allowDeleteProduct && (
                  <TableHead
                    className="text-[9px] font-bold uppercase tracking-[0.15em] h-10"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--muted-foreground)",
                      backgroundColor: "var(--table-header-bg)",
                    }}
                  />
                )}
                {[t("image"), t("title"), t("brand"), t("price"), t("stock"), t("published"), t("actions")].map(
                  (header, i) => (
                    <TableHead
                      key={i}
                      className={`text-[9px] font-bold uppercase tracking-[0.15em] h-10 ${i > 1 ? "text-center" : ""}`}
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--muted-foreground)",
                        backgroundColor: "var(--table-header-bg)",
                      }}
                    >
                      {header}
                    </TableHead>
                  )
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProducts.map((product) => {
                const hasDiscount = product.discount_percentage && product.discount_percentage > 0;
                return (
                  <TableRow
                    key={product.id}
                    className="border-b hover:bg-[var(--table-header-bg)]"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {/* Row checkbox for bulk selection */}
                    {allowDeleteProduct && (
                      <TableCell className="py-2">
                        <label className="flex items-center justify-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(product.id)}
                            onChange={() => toggleSelect(product.id)}
                            className="sr-only"
                          />
                          <div
                            className="w-4 h-4 border-2 flex items-center justify-center transition-colors"
                            style={{
                              backgroundColor: selectedProducts.has(product.id) ? "var(--primary)" : "transparent",
                              borderColor: selectedProducts.has(product.id) ? "var(--primary-text)" : "var(--border)",
                            }}
                          >
                            {selectedProducts.has(product.id) && (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--primary-foreground)" strokeWidth="2" strokeLinecap="square">
                                <path d="M2 5l2.5 2.5L8 3" />
                              </svg>
                            )}
                          </div>
                        </label>
                      </TableCell>
                    )}
                    {/* Image */}
                    <TableCell className="py-2">
                      <div
                        className="w-8 h-8 relative flex-shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: "var(--input)" }}
                      >
                        <ProductImage src={product.image_url} alt={product.title} sizes="32px" iconSize="w-3.5 h-3.5" />
                      </div>
                    </TableCell>

                    {/* Title */}
                    <TableCell className="py-2">
                      <span className="text-[11px] font-semibold truncate block">
                        <Highlight text={product.title} query={search} />
                      </span>
                    </TableCell>

                    {/* Brand */}
                    <TableCell className="text-center">
                      <span
                        className="text-[10px] font-bold tracking-wider"
                        style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                      >
                        {product.brand || "—"}
                      </span>
                    </TableCell>

                    {/* Price */}
                    <TableCell className="text-center">
                      <div className="flex items-baseline gap-1 justify-center">
                        <span className="text-[11px] font-bold" style={{ fontFamily: "var(--font-display)" }}>
                          {new Intl.NumberFormat(undefined, { style: "currency", currency: product.currency || "EUR" }).format(product.price)}
                        </span>
                        {hasDiscount && product.original_price && (
                          <span
                            className="text-[9px] line-through"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            {new Intl.NumberFormat(undefined, { style: "currency", currency: product.currency || "EUR" }).format(product.original_price)}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Stock */}
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                      <StatusBadge status={product.stock_status} />
                      </div>
                    </TableCell>

                    {/* Published */}
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                      <PublishToggle
                        published={!!product.is_published}
                        onToggle={() => togglePublish(product.id)}
                      />
                      </div>
                    </TableCell>

                    {/* Actions — shows confirm state when delete is pending (same pattern as stores tab) */}
                    <TableCell className="text-center">
                      {pendingDelete === product.id && allowDeleteProduct ? (
                        <div className="flex items-center gap-1.5 justify-center">
                          <button
                            onClick={() => deleteProduct(product.id)}
                            title={t("confirmDelete")}
                            className="w-7 h-7 flex items-center justify-center transition-all duration-150 hover:opacity-80"
                            style={{
                              backgroundColor: "rgba(255,69,58,0.15)",
                              border: "1.5px solid rgba(255,69,58,0.4)",
                              color: "#FF453A",
                            }}
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setPendingDelete(null)}
                            title={t("cancel")}
                            className="w-7 h-7 flex items-center justify-center transition-all duration-150 hover:opacity-80"
                            style={{
                              backgroundColor: "transparent",
                              border: "2px solid var(--border)",
                              color: "var(--muted-foreground)",
                            }}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 justify-center">
                          <Link
                            href={`/dashboard/products/${product.id}`}
                            className="w-7 h-7 flex items-center justify-center transition-all duration-150 hover:opacity-80"
                            style={{
                              backgroundColor: "transparent",
                              border: "2px solid var(--border)",
                              color: "var(--muted-foreground)",
                            }}
                            title={t("view")}
                          >
                            <Eye className="w-3 h-3" />
                          </Link>
                          {product.product_url && (
                            <IconButton
                              onClick={() => window.open(product.product_url!, "_blank")}
                              icon={ExternalLink}
                            />
                          )}
                          <IconButton
                            onClick={() => setEditingProduct({ ...product })}
                            icon={Pencil}
                            title={t("edit")}
                          />
                          {/* AI Clean — one-click product cleaning via Claude.
                              Shows spinner while cleaning is in progress. */}
                          {allowAIClean && (
                            <button
                              onClick={() => handleAIClean(product)}
                              disabled={cleaningProductId !== null}
                              title={t("aiClean")}
                              className="w-7 h-7 flex items-center justify-center transition-all duration-150 hover:opacity-80 disabled:opacity-40 disabled:pointer-events-none"
                              style={{
                                backgroundColor: cleaningProductId === product.id
                                  ? "var(--primary-muted)"
                                  : "rgba(168,85,247,0.12)",
                                border: cleaningProductId === product.id
                                  ? "1.5px solid var(--primary-muted)"
                                  : "1.5px solid rgba(168,85,247,0.4)",
                                color: cleaningProductId === product.id
                                  ? "var(--primary-text)"
                                  : "#A855F7",
                              }}
                            >
                              {cleaningProductId === product.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Sparkles className="w-3 h-3" />
                              )}
                            </button>
                          )}
                          {allowDeleteProduct && (
                            <button
                              onClick={() => setPendingDelete(product.id)}
                              title={t("delete")}
                              className="w-7 h-7 flex items-center justify-center transition-all duration-150 hover:opacity-80"
                              style={{
                                backgroundColor: "rgba(255,69,58,0.15)",
                                border: "1.5px solid rgba(255,69,58,0.4)",
                                color: "#FF453A",
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      {/* Edit Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent
          className="sm:max-w-lg"
          style={{ borderRadius: 0, border: "2px solid var(--border)", backgroundColor: "var(--card)" }}
        >
          <DialogHeader>
            <DialogTitle
              className="text-[11px] font-bold uppercase tracking-[0.15em]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {t("editProduct")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("editProduct")}
            </DialogDescription>
          </DialogHeader>

          {editingProduct && (
            <div className="max-h-[60vh] overflow-y-auto scrollbar-none pr-1">
              {/* Product Header */}
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-10 h-10 relative flex-shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: "var(--input)" }}
                >
                  <ProductImage src={editingProduct.image_url} alt={editingProduct.title} sizes="40px" iconSize="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold">{editingProduct.title}</p>
                  <p
                    className="text-[9px] font-bold uppercase tracking-[0.15em]"
                    style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                  >
                    {editingProduct.brand || "—"} / {storeMap[editingProduct.store_id]?.name || "—"}
                  </p>
                </div>
              </div>

              {/* Flags */}
              <SectionLabel>{t("flags")}</SectionLabel>
              <ToggleRow
                label={t("featured")}
                checked={!!editingProduct.is_featured}
                onChange={(v) => setEditingProduct({ ...editingProduct, is_featured: v })}
              />
              <ToggleRow
                label={t("slider")}
                checked={!!editingProduct.is_slider}
                onChange={(v) => setEditingProduct({ ...editingProduct, is_slider: v })}
              />
              <ToggleRow
                label={t("published")}
                checked={!!editingProduct.is_published}
                onChange={(v) => setEditingProduct({ ...editingProduct, is_published: v })}
              />

              {/* Details */}
              <SectionLabel>{t("details")}</SectionLabel>
              <div className="space-y-2">
                <div>
                  <FieldLabel>{t("aiCategory")}</FieldLabel>
                  <Input
                    value={editingProduct.ai_category || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, ai_category: e.target.value || null })}
                    className="text-xs border-2 focus-visible:ring-0 focus-visible:border-[var(--border)]"
                    style={{ borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: "11px", borderColor: "var(--border)", backgroundColor: "var(--input)" }}
                  />
                </div>
                <div>
                  <FieldLabel>{t("availability")}</FieldLabel>
                  <select
                    value={editingProduct.stock_status}
                    onChange={(e) => setEditingProduct({
                      ...editingProduct,
                      stock_status: e.target.value as StockStatus,
                      in_stock: e.target.value === "in_stock",
                    })}
                    className="w-full px-3 py-2 text-[11px] border-2 outline-none"
                    style={{ borderRadius: 0, fontFamily: "var(--font-mono)", borderColor: "var(--border)", backgroundColor: "var(--input)", color: "var(--foreground)" }}
                  >
                    <option value="in_stock">In Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>
              </div>

              {/* Descriptions */}
              <SectionLabel>{t("descriptions")}</SectionLabel>
              <div className="space-y-2">
                <div>
                  <FieldLabel>{t("descriptionEn")}</FieldLabel>
                  <textarea
                    value={editingProduct.description_en || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description_en: e.target.value || null })}
                    rows={3}
                    className="w-full px-3 py-2 text-[11px] border-2 outline-none resize-none"
                    style={{ borderRadius: 0, fontFamily: "var(--font-mono)", borderColor: "var(--border)", backgroundColor: "var(--input)", color: "var(--foreground)" }}
                  />
                </div>
                <div>
                  <FieldLabel>{t("descriptionDe")}</FieldLabel>
                  <textarea
                    value={editingProduct.description_de || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description_de: e.target.value || null })}
                    rows={3}
                    className="w-full px-3 py-2 text-[11px] border-2 outline-none resize-none"
                    style={{ borderRadius: 0, fontFamily: "var(--font-mono)", borderColor: "var(--border)", backgroundColor: "var(--input)", color: "var(--foreground)" }}
                  />
                </div>
              </div>

              {/* Media */}
              <SectionLabel>{t("media")}</SectionLabel>
              <div>
                <FieldLabel>{t("imageUrl")}</FieldLabel>
                <div className="flex items-center gap-3">
                  <Input
                    value={editingProduct.image_url || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, image_url: e.target.value || null })}
                    className="flex-1 text-xs border-2 focus-visible:ring-0 focus-visible:border-[var(--border)]"
                    style={{ borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: "11px", borderColor: "var(--border)", backgroundColor: "var(--input)" }}
                  />
                  {editingProduct.image_url && (
                    <div className="w-9 h-9 flex-shrink-0 relative" style={{ border: "1.5px solid var(--border)" }}>
                      <ProductImage src={editingProduct.image_url} alt="Preview" sizes="36px" iconSize="w-3 h-3" />
                    </div>
                  )}
                </div>
              </div>

              {/* Shipping — editable fields, saved as ai_shipping_data JSONB */}
              <SectionLabel>{t("shippingInfo")}</SectionLabel>
              {(() => {
                // Helper to update a single field in the nested ai_shipping_data object.
                // Initializes ai_shipping_data if it doesn't exist yet (e.g., product
                // was never cleaned), allowing manual entry from scratch.
                const ep = editingProduct!;
                const shipping = ep.ai_shipping_data ?? {};
                function updateShipping(field: string, value: string | number | null | undefined) {
                  setEditingProduct({
                    ...ep,
                    ai_shipping_data: { ...ep.ai_shipping_data, [field]: value ?? undefined },
                  } as Product);
                }
                const inputStyle = { borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: "11px", borderColor: "var(--border)", backgroundColor: "var(--input)" };
                const inputClass = "text-xs border-2 focus-visible:ring-0 focus-visible:border-[var(--border)]";

                return (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <FieldLabel>{t("shippingCountry")}</FieldLabel>
                      <Input
                        value={shipping.country || ""}
                        onChange={(e) => updateShipping("country", e.target.value || undefined)}
                        placeholder="DE"
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <FieldLabel>{t("shippingPrice")}</FieldLabel>
                      <Input
                        value={shipping.price || ""}
                        onChange={(e) => updateShipping("price", e.target.value || undefined)}
                        placeholder="4.99"
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <FieldLabel>{t("shippingService")}</FieldLabel>
                      <Input
                        value={shipping.service || ""}
                        onChange={(e) => updateShipping("service", e.target.value || undefined)}
                        placeholder="DHL Standard"
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <FieldLabel>{t("shippingCountries")}</FieldLabel>
                      <Input
                        value={shipping.available_countries || ""}
                        onChange={(e) => updateShipping("available_countries", e.target.value || undefined)}
                        placeholder="DE, AT, CH"
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <FieldLabel>{t("minHandlingDays")}</FieldLabel>
                      <Input
                        type="number"
                        min={0}
                        max={99}
                        value={shipping.min_handling_time ?? ""}
                        onChange={(e) => updateShipping("min_handling_time", e.target.value ? parseInt(e.target.value, 10) : null)}
                        placeholder="0"
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <FieldLabel>{t("maxHandlingDays")}</FieldLabel>
                      <Input
                        type="number"
                        min={0}
                        max={99}
                        value={shipping.max_handling_time ?? ""}
                        onChange={(e) => updateShipping("max_handling_time", e.target.value ? parseInt(e.target.value, 10) : null)}
                        placeholder="1"
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <FieldLabel>{t("minTransitDays")}</FieldLabel>
                      <Input
                        type="number"
                        min={0}
                        max={99}
                        value={shipping.min_transit_time ?? ""}
                        onChange={(e) => updateShipping("min_transit_time", e.target.value ? parseInt(e.target.value, 10) : null)}
                        placeholder="2"
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <FieldLabel>{t("maxTransitDays")}</FieldLabel>
                      <Input
                        type="number"
                        min={0}
                        max={99}
                        value={shipping.max_transit_time ?? ""}
                        onChange={(e) => updateShipping("max_transit_time", e.target.value ? parseInt(e.target.value, 10) : null)}
                        placeholder="5"
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Affiliate */}
              <SectionLabel>{t("affiliateInfo")}</SectionLabel>
              <div>
                <FieldLabel>{t("affiliateLink")}</FieldLabel>
                <textarea
                  value={editingProduct.affiliate_link || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct, affiliate_link: e.target.value || null })}
                  rows={3}
                  className="w-full px-3 py-2 text-[11px] border-2 outline-none resize-none break-all"
                  style={{ borderRadius: 0, fontFamily: "var(--font-mono)", borderColor: "var(--border)", backgroundColor: "var(--input)", color: "var(--foreground)", wordBreak: "break-all" }}
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            <button
              onClick={() => setEditingProduct(null)}
              className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors hover:opacity-80"
              style={{ fontFamily: "var(--font-mono)", borderColor: "var(--border)", color: "var(--muted-foreground)", borderRadius: 0 }}
            >
              {t("cancel")}
            </button>
            <button
              onClick={() => editingProduct && saveProduct(editingProduct)}
              disabled={saving}
              className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:opacity-80 disabled:opacity-50"
              style={{ fontFamily: "var(--font-mono)", backgroundColor: "var(--primary)", color: "var(--primary-foreground)", borderRadius: 0 }}
            >
              {saving ? "Saving..." : t("save")}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      {allowDeleteProduct && (
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
              <DialogDescription
                className="text-[11px] mt-2"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                }}
              >
                {t("confirmBulkDeleteDescription", { count: selectedProducts.size })}
              </DialogDescription>
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
      )}
    </div>
  );
}
