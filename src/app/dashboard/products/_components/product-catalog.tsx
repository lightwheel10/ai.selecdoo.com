"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Eye,
  Package,
  Tags,
  PenSquare,
  Search,
  ChevronDown,
  X,
  Check,
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
import { useTranslations } from "next-intl";
import type { Product, Store } from "@/types";

interface ProductCatalogProps {
  products: Product[];
  stores: Store[];
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
            style={{ color: "#CAFF04" }}
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

// ─── Searchable Combobox ───

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
              {/* Reset option */}
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
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => {
                    onChange(option === value ? null : option);
                    setOpen(false);
                  }}
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
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-white/[0.04]"
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

// ─── Main Catalog ───

export function ProductCatalog({ products, stores }: ProductCatalogProps) {
  const t = useTranslations("Products");
  const ts = useTranslations("Status");
  const tt = useTranslations("Time");

  const storeMap = Object.fromEntries(stores.map((s) => [s.id, s]));
  const storeNames = useMemo(() => stores.map((s) => s.name).sort(), [stores]);

  // Filter state
  const [search, setSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<string | null>(null);
  const [discountFilter, setDiscountFilter] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const hasAnyFilter =
    storeFilter || stockFilter || discountFilter || minPrice || maxPrice;

  const filtered = useMemo(() => {
    let result = products;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.brand && p.brand.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q))
      );
    }

    // Store
    if (storeFilter) {
      result = result.filter((p) => storeMap[p.store_id]?.name === storeFilter);
    }

    // Stock
    if (stockFilter) {
      result = result.filter((p) => p.stock_status === stockFilter);
    }

    // Discount
    if (discountFilter) {
      switch (discountFilter) {
        case "none":
          result = result.filter(
            (p) => !p.discount_percentage || p.discount_percentage === 0
          );
          break;
        case "any":
          result = result.filter(
            (p) => p.discount_percentage && p.discount_percentage > 0
          );
          break;
        case "10":
          result = result.filter(
            (p) => p.discount_percentage && p.discount_percentage >= 10
          );
          break;
        case "20":
          result = result.filter(
            (p) => p.discount_percentage && p.discount_percentage >= 20
          );
          break;
        case "30":
          result = result.filter(
            (p) => p.discount_percentage && p.discount_percentage >= 30
          );
          break;
        case "50":
          result = result.filter(
            (p) => p.discount_percentage && p.discount_percentage >= 50
          );
          break;
      }
    }

    // Price range
    const min = parseFloat(minPrice);
    const max = parseFloat(maxPrice);
    if (!isNaN(min)) {
      result = result.filter((p) => p.price >= min);
    }
    if (!isNaN(max)) {
      result = result.filter((p) => p.price <= max);
    }

    return result;
  }, [products, search, storeFilter, stockFilter, discountFilter, minPrice, maxPrice, storeMap]);

  function clearAll() {
    setStoreFilter(null);
    setStockFilter(null);
    setDiscountFilter(null);
    setMinPrice("");
    setMaxPrice("");
    setSearch("");
  }

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

        {/* Store — searchable */}
        <SearchableFilter
          label={t("store")}
          resetLabel={t("allStores")}
          searchPlaceholder={t("searchStore")}
          emptyText={t("noResults")}
          options={storeNames}
          value={storeFilter}
          onChange={setStoreFilter}
        />

        {/* Stock — simple */}
        <SimpleFilter
          label={t("stock")}
          resetLabel={t("allStock")}
          options={stockOptions}
          value={stockFilter}
          onChange={setStockFilter}
        />

        {/* Discount — simple */}
        <SimpleFilter
          label={t("discount")}
          resetLabel={t("allDiscounts")}
          options={discountOptions}
          value={discountFilter}
          onChange={setDiscountFilter}
        />

        {/* Price range */}
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder={t("minPrice")}
            className="w-[70px] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 outline-none transition-colors duration-150 focus:border-[#CAFF04]"
            style={{
              backgroundColor: "transparent",
              borderColor: minPrice ? "rgba(202,255,4,0.3)" : "var(--border)",
              color: minPrice ? "#CAFF04" : "var(--muted-foreground)",
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
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder={t("maxPrice")}
            className="w-[70px] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 outline-none transition-colors duration-150 focus:border-[#CAFF04]"
            style={{
              backgroundColor: "transparent",
              borderColor: maxPrice ? "rgba(202,255,4,0.3)" : "var(--border)",
              color: maxPrice ? "#CAFF04" : "var(--muted-foreground)",
              borderRadius: 0,
              fontFamily: "var(--font-mono)",
            }}
          />
        </div>

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
                total: products.length,
              })
            : t("productsFound", { count: products.length })}
        </p>
      </div>

      {/* Product grid */}
      {filtered.length === 0 ? (
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
          {filtered.map((product) => {
            const store = storeMap[product.store_id];
            const hasDiscount =
              product.discount_percentage && product.discount_percentage > 0;

            return (
              <div
                key={product.id}
                className="border-2 flex flex-col"
                style={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                }}
              >
                {/* Image */}
                <div
                  className="relative w-full aspect-square"
                  style={{ backgroundColor: "var(--input)" }}
                >
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Package
                        className="w-8 h-8"
                        style={{
                          color: "var(--muted-foreground)",
                          opacity: 0.3,
                        }}
                      />
                    </div>
                  )}
                  {hasDiscount && (
                    <span
                      className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5"
                      style={{
                        fontFamily: "var(--font-mono)",
                        backgroundColor: "rgba(34,197,94,0.9)",
                        color: "#fff",
                      }}
                    >
                      -{product.discount_percentage}%
                    </span>
                  )}
                  <div className="absolute top-2 right-2">
                    <StatusBadge status={product.stock_status} />
                  </div>
                </div>

                {/* Body */}
                <div className="p-3 flex flex-col flex-1">
                  {/* Store */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <div
                      className="w-4 h-4 flex-shrink-0 flex items-center justify-center text-[7px] font-bold"
                      style={{
                        fontFamily: "var(--font-mono)",
                        backgroundColor: "rgba(202,255,4,0.10)",
                        color: "#CAFF04",
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
                  <p className="text-[12px] font-semibold line-clamp-2 mb-1">
                    <Highlight text={product.title} query={search} />
                  </p>

                  {/* Brand + SKU */}
                  <p
                    className="text-[9px] font-bold uppercase tracking-[0.15em] mb-3"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    <Highlight text={product.brand || t("noBrand")} query={search} />
                    {product.sku && <> / <Highlight text={product.sku} query={search} /></>}
                  </p>

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
                    <button
                      onClick={() => {/* TODO: deal workflow */}}
                      className="flex items-center justify-center gap-1 px-1.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] transition-all duration-150 hover:opacity-80"
                      style={{
                        fontFamily: "var(--font-mono)",
                        backgroundColor: "#22C55E12",
                        border: "1.5px solid #22C55E40",
                        color: "#22C55E",
                      }}
                    >
                      <Tags className="w-3 h-3" />
                      {t("deals")}
                    </button>
                    {/* Info semantic — Posts */}
                    <button
                      onClick={() => {/* TODO: post workflow */}}
                      className="flex items-center justify-center gap-1 px-1.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] transition-all duration-150 hover:opacity-80"
                      style={{
                        fontFamily: "var(--font-mono)",
                        backgroundColor: "#5AC8FA12",
                        border: "1.5px solid #5AC8FA40",
                        color: "#5AC8FA",
                      }}
                    >
                      <PenSquare className="w-3 h-3" />
                      {t("posts")}
                    </button>
                  </div>

                  {/* Updated timestamp */}
                  <p
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
  );
}
