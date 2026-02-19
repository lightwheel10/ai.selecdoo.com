"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  TrendingDown,
  TrendingUp,
  PackageX,
  PackagePlus,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ProductChange, ChangeType } from "@/types";

interface ChangeTimelineProps {
  changes: ProductChange[];
}

const MAX_PER_SECTION = 5;

const changeColors: Record<ChangeType, string> = {
  price_change: "#FF9F0A",
  stock_change: "#FF453A",
  new_product: "#22C55E",
  product_removed: "#FF453A",
  field_update: "#5AC8FA",
};

const changeIcons: Record<ChangeType, typeof TrendingDown> = {
  price_change: TrendingDown,
  stock_change: PackageX,
  new_product: PackagePlus,
  product_removed: PackageX,
  field_update: RefreshCw,
};

// Section display order
const sectionOrder: ChangeType[] = [
  "price_change",
  "stock_change",
  "field_update",
  "new_product",
  "product_removed",
];

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

// ─── Section: Price Changes ───

function PriceChangeRow({
  change,
  tt,
  t,
}: {
  change: ProductChange;
  tt: (key: string, values: { count: number }) => string;
  t: (key: string) => string;
}) {
  const oldPrice = change.old_value ? parseFloat(change.old_value) : 0;
  const newPrice = change.new_value ? parseFloat(change.new_value) : 0;
  const isDropped = newPrice < oldPrice;
  const diff = Math.abs(newPrice - oldPrice);
  const pct = oldPrice > 0 ? ((diff / oldPrice) * 100).toFixed(0) : "0";
  const Icon = isDropped ? TrendingDown : TrendingUp;

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {/* Image */}
      {change.product_image ? (
        <img
          src={change.product_image}
          alt=""
          className="w-8 h-8 object-cover flex-shrink-0"
          style={{ border: "1px solid var(--border)" }}
        />
      ) : (
        <div
          className="w-8 h-8 flex-shrink-0 flex items-center justify-center"
          style={{ backgroundColor: "rgba(255,159,10,0.08)", border: "1px solid var(--border)" }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: "#FF9F0A" }} />
        </div>
      )}

      {/* Product + Store */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold truncate">
          {change.product_title}
        </p>
        <span
          className="text-[9px] font-bold tracking-wider"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
        >
          {change.store_name}
        </span>
      </div>

      {/* Old → New price */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className="text-[10px] font-bold tracking-wider line-through"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
        >
          {new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format(oldPrice)}
        </span>
        <span
          className="text-[10px] font-bold tracking-wider"
          style={{
            fontFamily: "var(--font-mono)",
            color: isDropped ? "#22C55E" : "#FF453A",
          }}
        >
          {new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format(newPrice)}
        </span>
      </div>

      {/* Percentage badge */}
      <span
        className="flex items-center gap-0.5 text-[9px] font-bold tracking-wider px-1.5 py-0.5 flex-shrink-0"
        style={{
          fontFamily: "var(--font-mono)",
          color: isDropped ? "#22C55E" : "#FF453A",
          backgroundColor: isDropped ? "rgba(34,197,94,0.08)" : "rgba(255,69,58,0.08)",
        }}
      >
        <Icon className="w-2.5 h-2.5" />
        {pct}%
      </span>

      {/* Time */}
      <span
        className="text-[9px] font-bold tracking-wider flex-shrink-0"
        style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
      >
        {formatRelativeTime(change.detected_at, tt)}
      </span>
    </div>
  );
}

// ─── Section: Stock Changes ───

function StockChangeRow({
  change,
  tt,
  t,
}: {
  change: ProductChange;
  tt: (key: string, values: { count: number }) => string;
  t: (key: string) => string;
}) {
  const isBack = change.new_value === "true" || change.new_value === "in_stock";

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {change.product_image ? (
        <img
          src={change.product_image}
          alt=""
          className="w-8 h-8 object-cover flex-shrink-0"
          style={{ border: "1px solid var(--border)" }}
        />
      ) : (
        <div
          className="w-8 h-8 flex-shrink-0 flex items-center justify-center"
          style={{ backgroundColor: "rgba(255,69,58,0.08)", border: "1px solid var(--border)" }}
        >
          <PackageX className="w-3.5 h-3.5" style={{ color: "#FF453A" }} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold truncate">
          {change.product_title}
        </p>
        <span
          className="text-[9px] font-bold tracking-wider"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
        >
          {change.store_name}
        </span>
      </div>

      {/* Status badge */}
      <span
        className="text-[9px] font-bold uppercase tracking-[0.15em] px-2 py-1 flex-shrink-0"
        style={{
          fontFamily: "var(--font-mono)",
          color: isBack ? "#22C55E" : "#FF453A",
          backgroundColor: isBack ? "rgba(34,197,94,0.08)" : "rgba(255,69,58,0.08)",
          border: `1px solid ${isBack ? "rgba(34,197,94,0.2)" : "rgba(255,69,58,0.2)"}`,
        }}
      >
        {isBack ? t("backInStock") : t("wentOutOfStock")}
      </span>

      <span
        className="text-[9px] font-bold tracking-wider flex-shrink-0"
        style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
      >
        {formatRelativeTime(change.detected_at, tt)}
      </span>
    </div>
  );
}

// ─── Section: Field Updates (discount, original_price) ───

function FieldUpdateRow({
  change,
  tt,
  t,
}: {
  change: ProductChange;
  tt: (key: string, values: { count: number }) => string;
  t: (key: string) => string;
}) {
  let isDropped = false;
  if (change.field_changed === "discount_percentage") {
    const oldNum = change.old_value ? parseFloat(change.old_value) : 0;
    const newNum = change.new_value ? parseFloat(change.new_value) : 0;
    isDropped = newNum < oldNum;
  } else if (change.field_changed === "original_price") {
    const oldNum = change.old_value ? parseFloat(change.old_value) : 0;
    const newNum = change.new_value ? parseFloat(change.new_value) : 0;
    isDropped = newNum > oldNum;
  }

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {change.product_image ? (
        <img
          src={change.product_image}
          alt=""
          className="w-8 h-8 object-cover flex-shrink-0"
          style={{ border: "1px solid var(--border)" }}
        />
      ) : (
        <div
          className="w-8 h-8 flex-shrink-0 flex items-center justify-center"
          style={{ backgroundColor: "rgba(90,200,250,0.08)", border: "1px solid var(--border)" }}
        >
          <RefreshCw className="w-3.5 h-3.5" style={{ color: "#5AC8FA" }} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold truncate">
          {change.product_title}
        </p>
        <span
          className="text-[9px] font-bold tracking-wider"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
        >
          {change.store_name}
        </span>
      </div>

      {/* Field name */}
      <span
        className="text-[9px] font-bold uppercase tracking-[0.15em] px-1.5 py-0.5 flex-shrink-0"
        style={{
          fontFamily: "var(--font-mono)",
          color: "#5AC8FA",
          backgroundColor: "rgba(90,200,250,0.08)",
        }}
      >
        {change.field_changed}
      </span>

      {/* Old → New */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span
          className="text-[10px] font-bold tracking-wider"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
        >
          {change.old_value || t("none")}
        </span>
        <span
          className="text-[9px]"
          style={{ color: "var(--muted-foreground)" }}
        >
          →
        </span>
        <span
          className="text-[10px] font-bold tracking-wider"
          style={{
            fontFamily: "var(--font-mono)",
            color: isDropped ? "#FF453A" : "#22C55E",
          }}
        >
          {change.new_value || t("none")}
        </span>
      </div>

      <span
        className="text-[9px] font-bold tracking-wider flex-shrink-0"
        style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
      >
        {formatRelativeTime(change.detected_at, tt)}
      </span>
    </div>
  );
}

// ─── Section: New / Removed Products (simple list) ───

function ProductRow({
  change,
  tt,
  type,
}: {
  change: ProductChange;
  tt: (key: string, values: { count: number }) => string;
  type: "new_product" | "product_removed";
}) {
  const color = type === "new_product" ? "#22C55E" : "#FF453A";
  const Icon = type === "new_product" ? PackagePlus : PackageX;

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {change.product_image ? (
        <img
          src={change.product_image}
          alt=""
          className="w-8 h-8 object-cover flex-shrink-0"
          style={{ border: "1px solid var(--border)" }}
        />
      ) : (
        <div
          className="w-8 h-8 flex-shrink-0 flex items-center justify-center"
          style={{ backgroundColor: `${color}14`, border: "1px solid var(--border)" }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold truncate">
          {change.product_title}
        </p>
        <span
          className="text-[9px] font-bold tracking-wider"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
        >
          {change.store_name}
        </span>
      </div>

      <span
        className="text-[9px] font-bold tracking-wider flex-shrink-0"
        style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
      >
        {formatRelativeTime(change.detected_at, tt)}
      </span>
    </div>
  );
}

// ─── Section Header Keys ───

const sectionTitleKeys: Record<ChangeType, string> = {
  price_change: "sectionPriceChanges",
  stock_change: "sectionStockChanges",
  field_update: "sectionFieldUpdates",
  new_product: "sectionNewProducts",
  product_removed: "sectionRemovedProducts",
};

// ─── Main Component ───

export function ChangeTimeline({ changes }: ChangeTimelineProps) {
  const t = useTranslations("Monitoring");
  const tt = useTranslations("Time");

  const [storeFilter, setStoreFilter] = useState<string | null>(null);
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [storeSearch, setStoreSearch] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<ChangeType>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setStoreDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Unique stores from changes
  const stores = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of changes) {
      if (!map.has(c.store_id)) map.set(c.store_id, c.store_name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [changes]);

  // Filter by store
  const filtered = useMemo(() => {
    let result = storeFilter
      ? changes.filter((c) => c.store_id === storeFilter)
      : [...changes];
    result.sort(
      (a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()
    );
    return result;
  }, [changes, storeFilter]);

  // Group by change type
  const grouped = useMemo(() => {
    const map: Record<string, ProductChange[]> = {};
    for (const c of filtered) {
      if (!map[c.change_type]) map[c.change_type] = [];
      map[c.change_type].push(c);
    }
    return map;
  }, [filtered]);

  function toggleSection(type: ChangeType) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  // Count total
  const totalCount = filtered.length;

  return (
    <div>
      {/* ── Filter Bar ── */}
      <div
        className="flex flex-wrap items-center gap-2 px-4 py-3 mb-3 border-2"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        {/* Store filter dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border transition-colors hover:border-primary/50"
            style={{
              fontFamily: "var(--font-mono)",
              backgroundColor: storeFilter ? "var(--primary-muted)" : "transparent",
              borderColor: storeFilter ? "var(--primary-muted)" : "var(--border)",
              color: storeFilter ? "var(--primary-text)" : "var(--muted-foreground)",
            }}
          >
            {storeFilter
              ? stores.find((s) => s.id === storeFilter)?.name || t("allStores")
              : t("allStores")}
            <ChevronDown className="w-3 h-3" />
          </button>

          {storeDropdownOpen && (
            <div
              className="absolute z-50 top-full left-0 mt-1 min-w-[200px] border-2"
              style={{
                backgroundColor: "var(--card)",
                borderColor: "var(--border)",
              }}
            >
              {/* Search input */}
              {stores.length > 8 && (
                <div className="px-2 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <input
                    type="text"
                    value={storeSearch}
                    onChange={(e) => setStoreSearch(e.target.value)}
                    placeholder={t("searchStores")}
                    className="w-full px-2 py-1 text-[10px] border outline-none focus:border-primary"
                    style={{
                      fontFamily: "var(--font-mono)",
                      backgroundColor: "var(--input)",
                      borderColor: "var(--border)",
                      color: "var(--foreground)",
                    }}
                    autoFocus
                  />
                </div>
              )}
              <div className="py-1 max-h-[240px] overflow-y-auto scrollbar-none">
                <button
                  onClick={() => { setStoreFilter(null); setStoreDropdownOpen(false); setStoreSearch(""); }}
                  className="w-full text-left px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-[var(--subtle-overlay)]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: !storeFilter ? "var(--primary-text)" : "var(--muted-foreground)",
                  }}
                >
                  {t("allStores")}
                </button>
                {stores
                  .filter((s) => !storeSearch || s.name.toLowerCase().includes(storeSearch.toLowerCase()))
                  .map((store) => (
                    <button
                      key={store.id}
                      onClick={() => { setStoreFilter(store.id); setStoreDropdownOpen(false); setStoreSearch(""); }}
                      className="w-full text-left px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-[var(--subtle-overlay)]"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: storeFilter === store.id ? "var(--primary-text)" : "var(--muted-foreground)",
                      }}
                    >
                      {store.name}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5" style={{ backgroundColor: "var(--border)" }} />

        {/* Section summary pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {sectionOrder.map((type) => {
            const count = grouped[type]?.length || 0;
            if (count === 0) return null;
            const color = changeColors[type];
            const Icon = changeIcons[type];

            return (
              <span
                key={type}
                className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.15em]"
                style={{
                  fontFamily: "var(--font-mono)",
                  backgroundColor: `${color}12`,
                  border: `1.5px solid ${color}30`,
                  color: color,
                }}
              >
                <Icon className="w-2.5 h-2.5" />
                {count}
              </span>
            );
          })}
        </div>

        {/* Total count */}
        <span
          className="ml-auto text-[9px] font-bold tracking-wider"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
        >
          {t("changesCount", { count: totalCount })}
        </span>
      </div>

      {/* ── Grouped Sections ── */}
      {totalCount === 0 ? (
        <div
          className="border-2 py-16 text-center"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <p
            className="text-[11px] font-bold uppercase tracking-[0.15em]"
            style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
          >
            {t("noChanges")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sectionOrder.map((type) => {
            const items = grouped[type];
            if (!items || items.length === 0) return null;

            const color = changeColors[type];
            const Icon = changeIcons[type];
            const isExpanded = expandedSections.has(type);
            const visibleItems = isExpanded ? items : items.slice(0, MAX_PER_SECTION);
            const hasMore = items.length > MAX_PER_SECTION && !isExpanded;

            return (
              <div
                key={type}
                className="border-2"
                style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
              >
                {/* Section header */}
                <div
                  className="flex items-center gap-2 px-3 py-2.5"
                  style={{
                    borderBottom: "2px solid var(--border)",
                    backgroundColor: "var(--table-header-bg)",
                  }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.15em]"
                    style={{ fontFamily: "var(--font-mono)", color }}
                  >
                    {t(sectionTitleKeys[type])}
                  </span>
                  <span
                    className="text-[9px] font-bold tracking-wider px-1.5 py-0.5"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color,
                      backgroundColor: `${color}12`,
                    }}
                  >
                    {items.length}
                  </span>
                </div>

                {/* Section rows */}
                {visibleItems.map((change) => {
                  if (type === "price_change") {
                    return <PriceChangeRow key={change.id} change={change} tt={tt} t={t} />;
                  }
                  if (type === "stock_change") {
                    return <StockChangeRow key={change.id} change={change} tt={tt} t={t} />;
                  }
                  if (type === "field_update") {
                    return <FieldUpdateRow key={change.id} change={change} tt={tt} t={t} />;
                  }
                  return <ProductRow key={change.id} change={change} tt={tt} type={type as "new_product" | "product_removed"} />;
                })}

                {/* Show more / less */}
                {hasMore && (
                  <button
                    onClick={() => toggleSection(type)}
                    className="w-full py-2 text-[9px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-[var(--subtle-overlay)]"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--muted-foreground)",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    {t("showMore", { count: items.length - MAX_PER_SECTION })}
                  </button>
                )}
                {isExpanded && items.length > MAX_PER_SECTION && (
                  <button
                    onClick={() => toggleSection(type)}
                    className="w-full py-2 text-[9px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-[var(--subtle-overlay)]"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--muted-foreground)",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    {t("showLess")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
