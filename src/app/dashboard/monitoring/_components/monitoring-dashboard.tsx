"use client";

import { useMemo, useState } from "react";
import {
  TrendingDown,
  PackagePlus,
  PackageX,
  Activity,
  ChevronDown,
  ChevronRight,
  Zap,
  Info,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { MonitoringConfig, MonitoringLog, ProductChange } from "@/types";
import { MonitoringTable } from "./monitoring-table";
import { ChangeTimeline } from "./change-timeline";

function formatCheckTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const time = `${hours}:${minutes}`;

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear();

  if (isToday) return `Today, ${time}`;
  if (isTomorrow) return `Tomorrow, ${time}`;
  return `${date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, ${time}`;
}

interface MonitoringDashboardProps {
  configs: MonitoringConfig[];
  logs: MonitoringLog[];
  changes: ProductChange[];
}

export function MonitoringDashboard({
  configs,
  logs,
  changes,
}: MonitoringDashboardProps) {
  const t = useTranslations("Monitoring");
  const [tableCollapsed, setTableCollapsed] = useState(true);

  // Compute monitoring status
  const monitoringStatus = useMemo(() => {
    const enabledCount = configs.filter((c) => c.enabled).length;
    const isActive = enabledCount > 0;

    // Find soonest next check
    let soonestConfig: MonitoringConfig | null = null;
    for (const c of configs) {
      if (!c.enabled || !c.next_check_at) continue;
      if (
        !soonestConfig ||
        !soonestConfig.next_check_at ||
        c.next_check_at < soonestConfig.next_check_at
      ) {
        soonestConfig = c;
      }
    }

    return { enabledCount, isActive, soonestConfig };
  }, [configs]);

  // Compute metrics from changes and logs
  const metrics = useMemo(() => {
    const priceChanges = changes.filter(
      (c) => c.change_type === "price_change"
    ).length;
    const newProducts = changes.filter(
      (c) => c.change_type === "new_product"
    ).length;
    const removedProducts = changes.filter(
      (c) => c.change_type === "product_removed"
    ).length;
    const totalChecks = logs.length;

    return { priceChanges, newProducts, removedProducts, totalChecks };
  }, [changes, logs]);

  const metricCards: {
    label: string;
    value: number;
    color: string;
    icon: typeof TrendingDown;
  }[] = [
    {
      label: t("metricPriceChanges"),
      value: metrics.priceChanges,
      color: "#FF9F0A",
      icon: TrendingDown,
    },
    {
      label: t("metricNewProducts"),
      value: metrics.newProducts,
      color: "#22C55E",
      icon: PackagePlus,
    },
    {
      label: t("metricRemovedProducts"),
      value: metrics.removedProducts,
      color: "#FF453A",
      icon: PackageX,
    },
    {
      label: t("metricTotalChecks"),
      value: metrics.totalChecks,
      color: "#5AC8FA",
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── 1. Store Schedules Table (full-width, collapsible) ── */}
      <div>
        <button
          onClick={() => setTableCollapsed(!tableCollapsed)}
          className="w-full flex items-center gap-2.5 px-4 py-3 border-2 transition-colors hover:bg-white/[0.02] group"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
            marginBottom: tableCollapsed ? 0 : "-2px",
          }}
        >
          {tableCollapsed ? (
            <ChevronRight
              className="w-4 h-4 transition-transform"
              style={{ color: "#CAFF04" }}
            />
          ) : (
            <ChevronDown
              className="w-4 h-4 transition-transform"
              style={{ color: "#CAFF04" }}
            />
          )}
          <span
            className="text-[11px] font-bold uppercase tracking-[0.15em]"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--foreground)",
            }}
          >
            {t("storeSchedules")}
          </span>
          <span
            className="text-[10px] font-bold tracking-wider"
            style={{
              fontFamily: "var(--font-mono)",
              color: "#CAFF04",
            }}
          >
            {configs.length}
          </span>
          <span
            className="ml-auto text-[9px] font-bold uppercase tracking-[0.15em] transition-colors"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            {tableCollapsed
              ? t("clickToExpand")
              : t("clickToCollapse")}
          </span>
        </button>
        {!tableCollapsed && (
          <MonitoringTable configs={configs} logs={logs} />
        )}
      </div>

      {/* ── 2. Monitoring Status Panel ── */}
      <div
        className="border-2 grid grid-cols-1 md:grid-cols-2"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        {/* Left: Status + Next Check */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2.5 mb-3">
            <Zap
              className="w-4 h-4"
              style={{
                color: monitoringStatus.isActive ? "#CAFF04" : "#555555",
              }}
            />
            <span
              className="text-[10px] font-bold uppercase tracking-[0.15em]"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--muted-foreground)",
              }}
            >
              {t("automationStatus")}
            </span>
            <span
              className="text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-0.5"
              style={{
                fontFamily: "var(--font-mono)",
                color: monitoringStatus.isActive ? "#22C55E" : "#555555",
                backgroundColor: monitoringStatus.isActive
                  ? "rgba(34,197,94,0.07)"
                  : "rgba(85,85,85,0.07)",
                border: `1.5px solid ${monitoringStatus.isActive ? "rgba(34,197,94,0.25)" : "rgba(85,85,85,0.25)"}`,
              }}
            >
              {monitoringStatus.isActive ? t("enabled") : t("disabled")}
            </span>
          </div>

          <p
            className="text-[11px] mb-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            {t("activeStoresCount", {
              count: monitoringStatus.enabledCount,
              total: configs.length,
            })}
          </p>

          {monitoringStatus.soonestConfig &&
            monitoringStatus.soonestConfig.next_check_at && (
              <p
                className="text-[11px] font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                {t("nextCheckDetailed", {
                  time: formatCheckTime(
                    monitoringStatus.soonestConfig.next_check_at
                  ),
                  store: monitoringStatus.soonestConfig.store_name,
                })}
              </p>
            )}
        </div>

        {/* Right: Info about what monitoring tracks */}
        <div
          className="px-5 py-4"
          style={{
            borderLeft: "1px solid var(--border)",
          }}
        >
          <div className="flex items-start gap-2.5">
            <Info
              className="w-4 h-4 flex-shrink-0 mt-0.5"
              style={{ color: "#5AC8FA" }}
            />
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "#5AC8FA",
                }}
              >
                {t("monitoringInfo")}
              </p>
              <p
                className="text-[11px] leading-relaxed"
                style={{ color: "var(--muted-foreground)" }}
              >
                {t("monitoringDescription")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Metric Cards (full-width row) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="border-2 px-4 py-3"
              style={{
                backgroundColor: "var(--card)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-6 h-6 flex-shrink-0 flex items-center justify-center"
                  style={{
                    backgroundColor: `${card.color}12`,
                    border: `1.5px solid ${card.color}40`,
                  }}
                >
                  <Icon
                    className="w-3 h-3"
                    style={{ color: card.color }}
                  />
                </div>
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.15em]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  {card.label}
                </span>
              </div>
              <p
                className="text-2xl font-bold"
                style={{ color: card.color }}
              >
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── 4. Recent Changes Timeline (full-width) ── */}
      <div>
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
          }}
        >
          {t("recentChanges")}
        </p>
        <ChangeTimeline changes={changes} />
      </div>
    </div>
  );
}
