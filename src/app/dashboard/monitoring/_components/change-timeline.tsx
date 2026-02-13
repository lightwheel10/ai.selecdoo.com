"use client";

import { TrendingDown, TrendingUp, PackageX, PackagePlus, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ProductChange, ChangeType } from "@/types";

interface ChangeTimelineProps {
  changes: ProductChange[];
}

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
  if (change.change_type === "price_change" && change.old_value && change.new_value) {
    const oldPrice = parseFloat(change.old_value);
    const newPrice = parseFloat(change.new_value);
    const direction = newPrice < oldPrice ? t("dropped") : t("increased");
    return `$${change.old_value} → $${change.new_value} (${direction})`;
  }
  if (change.change_type === "stock_change") {
    return `${change.old_value} → ${change.new_value}`;
  }
  return `${change.field_changed}: ${change.old_value || "—"} → ${change.new_value || "—"}`;
}

export function ChangeTimeline({ changes }: ChangeTimelineProps) {
  const t = useTranslations("Monitoring");
  const tt = useTranslations("Time");

  return (
    <div
      className="border-2"
      style={{
        backgroundColor: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      {changes.map((change, i) => {
        const color = changeColors[change.change_type];
        const Icon = changeIcons[change.change_type];
        const label = t(changeToKey[change.change_type]);

        // For price changes, use TrendingUp if price went up
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
              borderBottom: i < changes.length - 1 ? "1px solid var(--border)" : "none",
            }}
          >
            {/* Icon */}
            <div
              className="w-7 h-7 flex-shrink-0 flex items-center justify-center mt-0.5"
              style={{
                backgroundColor: `${color}12`,
                border: `1.5px solid ${color}40`,
              }}
            >
              <PriceIcon className="w-3.5 h-3.5" style={{ color }} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
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

              <p className="text-[11px] font-semibold truncate">
                {change.product_title}
              </p>

              <p
                className="text-[10px] font-bold tracking-wider mt-0.5"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                }}
              >
                {formatChangeDescription(change, t)}
              </p>
            </div>

            {/* Time */}
            <span
              className="text-[9px] font-bold tracking-wider flex-shrink-0 mt-1"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--muted-foreground)",
              }}
            >
              {formatRelativeTime(change.detected_at, tt)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
