"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import {
  Search,
  X,
  Check,
  ChevronDown,
  Pencil,
  ExternalLink,
  Package,
} from "lucide-react";
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
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { Product, Store, StockStatus } from "@/types";

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
          <mark key={i} className="bg-transparent" style={{ color: "#CAFF04" }}>
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
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors"
          style={{
            fontFamily: "var(--font-mono)",
            backgroundColor: value ? "rgba(202,255,4,0.06)" : "transparent",
            borderColor: value ? "rgba(202,255,4,0.3)" : "var(--border)",
            color: value ? "#CAFF04" : "var(--muted-foreground)",
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
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-white/[0.04]"
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
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-white/[0.04]"
            style={{ fontFamily: "var(--font-mono)", borderRadius: 0 }}
          >
            {value === option.value ? (
              <Check className="w-3 h-3 text-[#CAFF04]" />
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
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors"
          style={{
            fontFamily: "var(--font-mono)",
            backgroundColor: value ? "rgba(202,255,4,0.06)" : "transparent",
            borderColor: value ? "rgba(202,255,4,0.3)" : "var(--border)",
            color: value ? "#CAFF04" : "var(--muted-foreground)",
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
                    <Check className="w-3 h-3 mr-1.5 text-[#CAFF04]" />
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

interface AdminProductsTabProps {
  products: Product[];
  stores: Store[];
}

export function AdminProductsTab({ products, stores }: AdminProductsTabProps) {
  const t = useTranslations("Admin");

  const storeMap = Object.fromEntries(stores.map((s) => [s.id, s]));

  const [localProducts, setLocalProducts] = useState(products);
  const [search, setSearch] = useState("");
  const [publishFilter, setPublishFilter] = useState<string | null>(null);
  const [brandFilter, setBrandFilter] = useState<string | null>(null);
  const [affiliateFilter, setAffiliateFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [featuredFilter, setFeaturedFilter] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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

  function togglePublish(id: string) {
    setLocalProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_published: !p.is_published } : p))
    );
  }

  function clearAll() {
    setPublishFilter(null);
    setBrandFilter(null);
    setAffiliateFilter(null);
    setCategoryFilter(null);
    setFeaturedFilter(null);
    setSearch("");
  }

  function saveProduct(updated: Product) {
    setLocalProducts((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
    setEditingProduct(null);
    toast(t("productSaved"), {
      description: t("productSavedDescription", { title: updated.title }),
    });
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
              <col style={{ width: "5%" }} />
              <col style={{ width: "24%" }} />
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
                {[t("image"), t("title"), t("brand"), t("price"), t("stock"), t("published"), t("actions")].map(
                  (header, i) => (
                    <TableHead
                      key={i}
                      className={`text-[9px] font-bold uppercase tracking-[0.15em] h-10 ${i > 1 ? "text-center" : ""}`}
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--muted-foreground)",
                        backgroundColor: "rgba(255,255,255,0.02)",
                      }}
                    >
                      {header}
                    </TableHead>
                  )
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((product) => {
                const hasDiscount = product.discount_percentage && product.discount_percentage > 0;
                return (
                  <TableRow
                    key={product.id}
                    className="border-b hover:bg-white/[0.02]"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {/* Image */}
                    <TableCell className="py-2">
                      <div
                        className="w-8 h-8 relative flex-shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: "var(--input)" }}
                      >
                        {product.image_url ? (
                          <Image
                            src={product.image_url}
                            alt={product.title}
                            fill
                            className="object-cover"
                            sizes="32px"
                          />
                        ) : (
                          <Package className="w-3.5 h-3.5" style={{ color: "var(--muted-foreground)", opacity: 0.3 }} />
                        )}
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
                          ${product.price.toFixed(2)}
                        </span>
                        {hasDiscount && product.original_price && (
                          <span
                            className="text-[9px] line-through"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            ${product.original_price.toFixed(2)}
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

                    {/* Actions */}
                    <TableCell className="text-center">
                      <div className="flex items-center gap-1.5 justify-center">
                        {product.product_url && (
                          <IconButton
                            onClick={() => window.open(product.product_url!, "_blank")}
                            icon={ExternalLink}
                            title={t("view")}
                          />
                        )}
                        <IconButton
                          onClick={() => setEditingProduct({ ...product })}
                          icon={Pencil}
                          title={t("edit")}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

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
                  {editingProduct.image_url ? (
                    <Image
                      src={editingProduct.image_url}
                      alt={editingProduct.title}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  ) : (
                    <Package className="w-4 h-4" style={{ color: "var(--muted-foreground)", opacity: 0.3 }} />
                  )}
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
                      <Image src={editingProduct.image_url} alt="Preview" fill className="object-cover" sizes="36px" />
                    </div>
                  )}
                </div>
              </div>

              {/* Affiliate */}
              <SectionLabel>{t("affiliateInfo")}</SectionLabel>
              <div>
                <FieldLabel>{t("affiliateLink")}</FieldLabel>
                <Input
                  value={editingProduct.affiliate_link || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct, affiliate_link: e.target.value || null })}
                  className="text-xs border-2 focus-visible:ring-0 focus-visible:border-[var(--border)]"
                  style={{ borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: "11px", borderColor: "var(--border)", backgroundColor: "var(--input)" }}
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
              className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:opacity-80"
              style={{ fontFamily: "var(--font-mono)", backgroundColor: "#CAFF04", color: "#000", borderRadius: 0 }}
            >
              {t("save")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
