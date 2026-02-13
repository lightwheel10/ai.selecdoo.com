import {
  TrendingDown,
  PackagePlus,
  PackageX,
  Scan,
  Store,
  Bell,
  Sparkles,
  ExternalLink,
  Package,
} from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { StatCard } from "@/components/domain/stat-card";
import { StatusBadge } from "@/components/domain/status-badge";
import {
  mockStats,
  mockActivity,
  mockScrapeJobs,
  mockProducts,
  mockStores,
} from "@/lib/mock-data";
import type { ActivityType } from "@/types";

const activityIcons: Record<ActivityType, { icon: typeof TrendingDown; color: string }> = {
  price_change: { icon: TrendingDown, color: "#FF9F0A" },
  stock_change: { icon: PackageX, color: "#FF453A" },
  new_product: { icon: PackagePlus, color: "#22C55E" },
  store_added: { icon: Store, color: "#5AC8FA" },
  scrape_complete: { icon: Scan, color: "#9ABF03" },
  monitoring_alert: { icon: Bell, color: "#FF9F0A" },
  ai_content_generated: { icon: Sparkles, color: "#CAFF04" },
};

function formatDuration(start: string, end: string | null, inProgressText: string) {
  if (!end) return inProgressText;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
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

export default async function DashboardPage() {
  const t = await getTranslations("Overview");
  const tt = await getTranslations("Time");

  // TODO: Replace with real Supabase queries
  const stats = mockStats;
  const recentJobs = mockScrapeJobs.slice(0, 5);
  const latestProducts = mockProducts.slice(0, 3);
  const recentActivity = mockActivity.slice(0, 5);
  const storeMap = Object.fromEntries(mockStores.map((s) => [s.id, s]));

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          label={t("totalProducts")}
          value={stats.total_products.toLocaleString()}
          change="+3.2%"
          changeType="positive"
        />
        <StatCard
          label={t("activeStores")}
          value={String(stats.active_stores)}
          change="+1"
          changeType="positive"
        />
        <StatCard
          label={t("totalJobs")}
          value={String(stats.total_jobs)}
          change="+14"
          changeType="neutral"
        />
        <StatCard
          label={t("alertsToday")}
          value={String(stats.alerts_today)}
          change="+12"
          changeType="negative"
        />
        <StatCard
          label={t("aiGenerated")}
          value={String(stats.ai_generated)}
          change="+8"
          changeType="neutral"
        />
      </div>

      {/* Two-column: Recent Jobs + Latest Products */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        {/* Recent Jobs */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.15em]"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--muted-foreground)",
              }}
            >
              {t("recentJobs")}
            </p>
            <Link
              href="/dashboard/jobs"
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:opacity-80"
              style={{
                fontFamily: "var(--font-mono)",
                color: "#CAFF04",
              }}
            >
              {t("viewAll")}
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <div
            className="border-2 flex-1 flex flex-col"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
            }}
          >
            {recentJobs.map((job, i) => (
              <div
                key={job.id}
                className="flex items-center gap-3 px-4 py-3 flex-1"
                style={{
                  borderBottom:
                    i < recentJobs.length - 1
                      ? "1px solid var(--border)"
                      : "none",
                }}
              >
                {/* Store avatar */}
                <div
                  className="w-6 h-6 flex-shrink-0 flex items-center justify-center text-[9px] font-bold"
                  style={{
                    fontFamily: "var(--font-mono)",
                    backgroundColor: "rgba(202,255,4,0.10)",
                    color: "#CAFF04",
                  }}
                >
                  {job.store_name[0]}
                </div>

                {/* Store name */}
                <span className="text-[11px] font-semibold w-24 truncate">
                  {job.store_name}
                </span>

                {/* Status */}
                <StatusBadge status={job.status} />

                {/* Products */}
                <span
                  className="text-[10px] font-bold tracking-wider hidden sm:inline"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  {job.products_found > 0
                    ? `${job.products_found.toLocaleString()} ${t("products")}`
                    : "—"}
                </span>

                {/* Duration + Time */}
                <div className="ml-auto text-right flex-shrink-0">
                  <p
                    className="text-[9px] font-bold tracking-wider"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    {formatDuration(job.started_at, job.completed_at, t("inProgress"))}
                  </p>
                  <p
                    className="text-[9px] font-bold tracking-wider mt-0.5"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--muted-foreground)",
                      opacity: 0.5,
                    }}
                  >
                    {formatRelativeTime(job.started_at, tt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Latest Products */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.15em]"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--muted-foreground)",
              }}
            >
              {t("latestProducts")}
            </p>
            <Link
              href="/dashboard/products"
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:opacity-80"
              style={{
                fontFamily: "var(--font-mono)",
                color: "#CAFF04",
              }}
            >
              {t("viewAll")}
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
            {latestProducts.map((product) => {
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
                  {/* Product Image Placeholder */}
                  <div
                    className="relative w-full aspect-square flex items-center justify-center"
                    style={{
                      backgroundColor: "var(--input)",
                    }}
                  >
                    <Package
                      className="w-8 h-8"
                      style={{ color: "var(--muted-foreground)", opacity: 0.3 }}
                    />
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
                  </div>

                  {/* Card Body */}
                  <div className="p-3 flex flex-col flex-1">
                    {/* Title */}
                    <p className="text-[12px] font-semibold line-clamp-2 mb-1">
                      {product.title}
                    </p>

                    {/* Brand */}
                    <p
                      className="text-[9px] font-bold uppercase tracking-[0.15em] mb-2"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {store?.name || t("unknown")}
                    </p>

                    {/* Price */}
                    <div className="mt-auto flex items-baseline gap-2">
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

                    {/* Stock */}
                    <div className="mt-2">
                      <StatusBadge status={product.stock_status} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em] mb-4"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
          }}
        >
          {t("recentActivity")}
        </p>

        <div
          className="border-2"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          {recentActivity.map((item, i) => {
            const config = activityIcons[item.type];
            const Icon = config.icon;

            return (
              <div
                key={item.id}
                className="flex items-start gap-3 px-4 py-3"
                style={{
                  borderBottom:
                    i < recentActivity.length - 1
                      ? "1px solid var(--border)"
                      : "none",
                }}
              >
                <div
                  className="w-7 h-7 flex-shrink-0 flex items-center justify-center mt-0.5"
                  style={{
                    backgroundColor: `${config.color}12`,
                    border: `1.5px solid ${config.color}40`,
                  }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold">
                    {item.title}
                  </p>
                  <p
                    className="text-[11px] mt-0.5 truncate"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {item.description}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p
                    className="text-[9px] font-bold uppercase tracking-[0.15em]"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    {formatRelativeTime(item.timestamp, tt)}
                  </p>
                  <p
                    className="text-[9px] font-bold tracking-wider mt-0.5"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--muted-foreground)",
                      opacity: 0.6,
                    }}
                  >
                    {item.store_name}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="flex flex-col items-center gap-1 text-center">
          <p
            className="text-[10px] font-bold tracking-wider"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
              opacity: 0.5,
            }}
          >
            &copy; 2023-2024 Selecdoo. All rights reserved.
          </p>
          <p
            className="text-[10px] tracking-wider"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
              opacity: 0.35,
            }}
          >
            Made with{" "}
            <span style={{ color: "#FF453A", opacity: 1 }}>&hearts;</span>
            {" "}by the Selecdoo Team
          </p>
        </div>
      </div>
    </>
  );
}
