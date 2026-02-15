"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  TrendingDown,
  TrendingUp,
  PackageX,
  PackagePlus,
  RefreshCw,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ProductChange, ChangeType } from "@/types";

interface ChangeTimelineProps {
  changes: ProductChange[];
}

const ITEMS_PER_PAGE = 6;

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

const changeToKey: Record<ChangeType, string> = {
  price_change: "price",
  stock_change: "stock",
  new_product: "new",
  product_removed: "removed",
  field_update: "update",
};

const allChangeTypes: ChangeType[] = [
  "price_change",
  "stock_change",
  "new_product",
  "product_removed",
  "field_update",
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

function formatChangeDescription(
  change: ProductChange,
  t: (key: string) => string
) {
  if (
    change.change_type === "price_change" &&
    change.old_value &&
    change.new_value
  ) {
    const oldPrice = parseFloat(change.old_value);
    const newPrice = parseFloat(change.new_value);
    const diff = Math.abs(newPrice - oldPrice);
    const pct = ((diff / oldPrice) * 100).toFixed(0);
    const direction = newPrice < oldPrice ? t("dropped") : t("increased");
    return {
      text: `$${change.old_value} → $${change.new_value}`,
      detail: `${direction} ${pct}%`,
      isDropped: newPrice < oldPrice,
    };
  }
  if (change.change_type === "stock_change") {
    const isBack =
      change.new_value === "true" || change.new_value === "in_stock";
    return {
      text: isBack ? t("backInStock") : t("wentOutOfStock"),
      detail: null,
      isDropped: !isBack,
    };
  }
  if (change.change_type === "new_product") {
    return {
      text: t("productAdded"),
      detail: null,
      isDropped: false,
    };
  }
  if (change.change_type === "product_removed") {
    return {
      text: t("productRemoved"),
      detail: null,
      isDropped: true,
    };
  }
  return {
    text: `${change.field_changed}: ${change.old_value || "—"} → ${change.new_value || "—"}`,
    detail: null,
    isDropped: false,
  };
}

export function ChangeTimeline({ changes }: ChangeTimelineProps) {
  const t = useTranslations("Monitoring");
  const tt = useTranslations("Time");

  const [storeFilter, setStoreFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<ChangeType | null>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
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

  // Change type counts (respecting store filter)
  const typeCounts = useMemo(() => {
    const base = storeFilter
      ? changes.filter((c) => c.store_id === storeFilter)
      : changes;
    const counts: Record<string, number> = {};
    for (const c of base) {
      counts[c.change_type] = (counts[c.change_type] || 0) + 1;
    }
    return counts;
  }, [changes, storeFilter]);

  // Filtered changes
  const filtered = useMemo(() => {
    let result = [...changes];
    if (storeFilter)
      result = result.filter((c) => c.store_id === storeFilter);
    if (typeFilter)
      result = result.filter((c) => c.change_type === typeFilter);
    result.sort(
      (a, b) =>
        new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()
    );
    return result;
  }, [changes, storeFilter, typeFilter]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [storeFilter, typeFilter]);

  return (
    <div>
      {/* ── Filter Bar (separate full-width bar above timeline) ── */}
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
              backgroundColor: storeFilter
                ? "rgba(202,255,4,0.07)"
                : "transparent",
              borderColor: storeFilter
                ? "rgba(202,255,4,0.25)"
                : "var(--border)",
              color: storeFilter ? "#CAFF04" : "var(--muted-foreground)",
            }}
          >
            {storeFilter
              ? stores.find((s) => s.id === storeFilter)?.name ||
                t("allStores")
              : t("allStores")}
            <ChevronDown className="w-3 h-3" />
          </button>

          {storeDropdownOpen && (
            <div
              className="absolute z-50 top-full left-0 mt-1 min-w-[180px] border-2 py-1"
              style={{
                backgroundColor: "var(--card)",
                borderColor: "var(--border)",
              }}
            >
              <button
                onClick={() => {
                  setStoreFilter(null);
                  setStoreDropdownOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-white/[0.04]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: !storeFilter
                    ? "#CAFF04"
                    : "var(--muted-foreground)",
                }}
              >
                {t("allStores")}
              </button>
              {stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => {
                    setStoreFilter(store.id);
                    setStoreDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-white/[0.04]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color:
                      storeFilter === store.id
                        ? "#CAFF04"
                        : "var(--muted-foreground)",
                  }}
                >
                  {store.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div
          className="w-px h-5"
          style={{ backgroundColor: "var(--border)" }}
        />

        {/* Change type filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {allChangeTypes.map((type) => {
            const count = typeCounts[type] || 0;
            if (count === 0) return null;
            const color = changeColors[type];
            const isActive = typeFilter === type;

            return (
              <button
                key={type}
                onClick={() => setTypeFilter(isActive ? null : type)}
                className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.15em] transition-colors"
                style={{
                  fontFamily: "var(--font-mono)",
                  backgroundColor: isActive ? `${color}20` : "transparent",
                  border: `1.5px solid ${isActive ? `${color}60` : "var(--border)"}`,
                  color: isActive ? color : "var(--muted-foreground)",
                }}
              >
                {t(changeToKey[type])}
                <span className="text-[8px]" style={{ opacity: 0.7 }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Result count */}
        <span
          className="ml-auto text-[9px] font-bold tracking-wider"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
          }}
        >
          {t("changesCount", { count: filtered.length })}
        </span>
      </div>

      {/* ── Timeline entries (full-width) ── */}
      <div
        className="border-2"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        {visible.length === 0 ? (
          <div className="py-16 text-center">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.15em]"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--muted-foreground)",
              }}
            >
              {t("noChanges")}
            </p>
          </div>
        ) : (
          <>
            {visible.map((change, i) => {
              const color = changeColors[change.change_type];
              const Icon = changeIcons[change.change_type];
              const label = t(changeToKey[change.change_type]);
              const desc = formatChangeDescription(change, t);

              const PriceIcon =
                change.change_type === "price_change" &&
                change.old_value &&
                change.new_value &&
                parseFloat(change.new_value) > parseFloat(change.old_value)
                  ? TrendingUp
                  : Icon;

              return (
                <div
                  key={change.id}
                  className="flex gap-3 px-4 py-3"
                  style={{
                    borderBottom:
                      i < visible.length - 1
                        ? "1px solid var(--border)"
                        : "none",
                  }}
                >
                  {/* Product Image (40px) or Icon fallback */}
                  {change.product_image ? (
                    <div
                      className="w-10 h-10 flex-shrink-0 overflow-hidden relative mt-0.5"
                      style={{
                        border: `1.5px solid ${color}40`,
                      }}
                    >
                      <img
                        src={change.product_image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <div
                        className="absolute bottom-0 right-0 w-4 h-4 flex items-center justify-center"
                        style={{ backgroundColor: `${color}CC` }}
                      >
                        <PriceIcon
                          className="w-2.5 h-2.5"
                          style={{ color: "#0A0A0A" }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div
                      className="w-10 h-10 flex-shrink-0 flex items-center justify-center mt-0.5"
                      style={{
                        backgroundColor: `${color}12`,
                        border: `1.5px solid ${color}40`,
                      }}
                    >
                      <PriceIcon
                        className="w-4 h-4"
                        style={{ color }}
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Row 1: Type badge + Store */}
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="text-[10px] font-bold uppercase tracking-[0.15em] px-1.5 py-0.5"
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: color,
                          backgroundColor: `${color}12`,
                        }}
                      >
                        {label}
                      </span>
                      <span
                        className="text-[9px] font-bold tracking-wider"
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        {change.store_name}
                      </span>
                    </div>

                    {/* Row 2: Product title */}
                    <p className="text-[11px] font-semibold truncate">
                      {change.product_title}
                    </p>

                    {/* Row 3: Change description */}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-[10px] font-bold tracking-wider"
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: desc.isDropped ? "#FF453A" : "#22C55E",
                        }}
                      >
                        {desc.text}
                      </span>
                      {desc.detail && (
                        <span
                          className="text-[9px] font-bold tracking-wider px-1 py-0.5"
                          style={{
                            fontFamily: "var(--font-mono)",
                            color: desc.isDropped ? "#FF453A" : "#22C55E",
                            backgroundColor: desc.isDropped
                              ? "rgba(255,69,58,0.08)"
                              : "rgba(34,197,94,0.08)",
                          }}
                        >
                          {desc.detail}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right side: Time + View — vertically centered */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="text-[9px] font-bold tracking-wider"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {formatRelativeTime(change.detected_at, tt)}
                    </span>
                    <button
                      onClick={() => {
                        // TODO: navigate to product detail
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.15em] border transition-colors hover:border-primary/50"
                      style={{
                        fontFamily: "var(--font-mono)",
                        backgroundColor: "transparent",
                        borderColor: "var(--border)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      <ExternalLink className="w-3 h-3" />
                      {t("viewProduct")}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Load More */}
            {hasMore && (
              <button
                onClick={() =>
                  setVisibleCount((prev) => prev + ITEMS_PER_PAGE)
                }
                className="w-full py-3 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-white/[0.04]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                  borderTop: "1px solid var(--border)",
                }}
              >
                {t("loadMore", {
                  remaining: filtered.length - visibleCount,
                })}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
