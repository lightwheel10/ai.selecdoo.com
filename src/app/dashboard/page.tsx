import {
  TrendingDown,
  PackagePlus,
  PackageX,
  PackageMinus,
  RefreshCw,
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
  getDashboardStats,
  getRecentActivity,
  getRecentJobs,
  getRecentProducts,
  getStores,
} from "@/lib/queries";
import { getAuthContext } from "@/lib/auth/session";
import type { ActivityType } from "@/types";

const activityIcons: Record<ActivityType, { icon: typeof TrendingDown; color: string }> = {
  price_change: { icon: TrendingDown, color: "#FF9F0A" },
  stock_change: { icon: PackageX, color: "#FF453A" },
  field_update: { icon: RefreshCw, color: "#AF52DE" },
  new_product: { icon: PackagePlus, color: "#22C55E" },
  product_removed: { icon: PackageMinus, color: "#FF6961" },
  store_added: { icon: Store, color: "#5AC8FA" },
  scrape_complete: { icon: Scan, color: "#C4A500" },  /* gold-dim — matches --chart-5 */
  monitoring_alert: { icon: Bell, color: "#FF9F0A" },
  ai_content_generated: { icon: Sparkles, color: "var(--primary-text)" },
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

function formatDelta(
  delta: number,
  invertColor = false,
): { change: string; changeType: "positive" | "negative" | "neutral" } {
  if (delta === 0) return { change: "0", changeType: "neutral" };
  const change = delta > 0 ? `+${delta}` : String(delta);
  let changeType: "positive" | "negative" | "neutral";
  if (invertColor) {
    changeType = delta > 0 ? "negative" : "positive";
  } else {
    changeType = delta > 0 ? "positive" : "negative";
  }
  return { change, changeType };
}

export default async function DashboardPage() {
  const { workspaceId } = await getAuthContext();

  // Subscription check — soft-lock: if the workspace has an explicitly
  // non-active subscription (past_due, canceled, expired, unpaid), show
  // an empty state with an upgrade CTA instead of the full dashboard.
  // No subscription row at all (null) or status in (trialing, active,
  // incomplete) → normal dashboard. This matches the D3 soft-lock
  // decision; full enforcement (blocking API routes) is in P4.x.
  const { createAdminClient: createAdmin } = await import("@/lib/supabase/admin");
  const adminSb = createAdmin();
  const { data: subRow } = await adminSb
    .from("workspace_subscriptions")
    .select("status")
    .eq("workspace_id", workspaceId!)
    .maybeSingle();

  const subStatus = subRow?.status ?? null;
  const isLocked =
    subStatus !== null &&
    subStatus !== "trialing" &&
    subStatus !== "active" &&
    subStatus !== "incomplete";

  if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div
          className="w-12 h-12 flex items-center justify-center mb-5"
          style={{
            backgroundColor: "rgba(255,69,58,0.08)",
            border: "2px solid rgba(255,69,58,0.25)",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FF453A"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" x2="12" y1="9" y2="13" />
            <line x1="12" x2="12.01" y1="17" y2="17" />
          </svg>
        </div>
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
          style={{ fontFamily: "var(--font-mono)", color: "#FF453A" }}
        >
          Subscription {subStatus === "past_due" ? "past due" : "ended"}
        </p>
        <h1
          className="text-xl font-extrabold tracking-tight mb-3"
          style={{
            fontFamily: "var(--font-display)",
            letterSpacing: "-0.02em",
          }}
        >
          {subStatus === "past_due"
            ? "We couldn't charge your card"
            : "Your trial or subscription has ended"}
        </h1>
        <p
          className="text-[13px] leading-relaxed mb-6 max-w-md"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--muted-foreground)",
          }}
        >
          {subStatus === "past_due"
            ? "Update your payment method to restore access to all features. Your data is safe — nothing has been deleted."
            : "Subscribe to continue using AI content generation, product monitoring, and store management. Your data is safe."}
        </p>
        <a
          href="/dashboard/settings?tab=billing"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.15em] bg-primary text-primary-foreground transition-all duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          style={{
            fontFamily: "var(--font-mono)",
            border: "2px solid var(--border-strong)",
            boxShadow: "var(--hard-shadow)",
          }}
        >
          {subStatus === "past_due" ? "Update Payment" : "Subscribe"}
        </a>
      </div>
    );
  }

  const t = await getTranslations("Overview");
  const tt = await getTranslations("Time");

  const [stats, recentJobs, latestProducts, recentActivity, allStores] =
    await Promise.all([
      getDashboardStats(workspaceId!),
      getRecentJobs(5, workspaceId!),
      getRecentProducts(3, workspaceId!),
      getRecentActivity(workspaceId!),
      getStores(workspaceId!),
    ]);
  const storeMap = Object.fromEntries(allStores.map((s) => [s.id, s]));

  const productsDelta = formatDelta(stats.total_products_delta);
  const storesDelta = formatDelta(stats.active_stores_delta);
  const jobsDelta = formatDelta(stats.total_jobs_delta);
  const alertsDelta = formatDelta(stats.alerts_today_delta, true);
  const aiDelta = formatDelta(stats.ai_generated_delta);

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          label={t("totalProducts")}
          value={stats.total_products.toLocaleString()}
          change={productsDelta.change}
          changeType={productsDelta.changeType}
          subtitle={t("last7days")}
        />
        <StatCard
          label={t("activeStores")}
          value={String(stats.active_stores)}
          change={storesDelta.change}
          changeType={storesDelta.changeType}
          subtitle={t("sinceYesterday")}
        />
        <StatCard
          label={t("totalJobs")}
          value={String(stats.total_jobs)}
          change={jobsDelta.change}
          changeType={jobsDelta.changeType}
          subtitle={t("vs24h")}
        />
        <StatCard
          label={t("alertsToday")}
          value={String(stats.alerts_today)}
          change={alertsDelta.change}
          changeType={alertsDelta.changeType}
          subtitle={t("vsYesterday")}
        />
        <StatCard
          label={t("aiGenerated")}
          value={String(stats.ai_generated)}
          change={aiDelta.change}
          changeType={aiDelta.changeType}
          subtitle={t("last7days")}
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
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-100 hover:opacity-80"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--primary-text)",
              }}
            >
              {t("viewAll")}
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          {/* Recent Jobs card — DESIGN.md §5: border-strong + hard-shadow.
              Internal row dividers use soft --border for hierarchy. */}
          <div
            className="flex-1 flex flex-col"
            style={{
              backgroundColor: "var(--card)",
              border: "2px solid var(--border-strong)",
              boxShadow: "var(--hard-shadow)",
            }}
          >
            {recentJobs.map((job, i) => (
              <div
                key={job.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  borderBottom:
                    i < recentJobs.length - 1
                      ? "1px solid var(--border)"
                      : "none",
                }}
              >
                {/* Store avatar */}
                <div
                  className="w-7 h-7 flex-shrink-0 relative flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: "transparent" }}
                >
                  {(() => {
                    const store = allStores.find((s) => s.name === job.store_name);
                    if (store?.url) {
                      const hostname = new URL(store.url).hostname;
                      return (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
                          alt={job.store_name}
                          className="w-5 h-5 object-contain"
                        />
                      );
                    }
                    return (
                      <span
                        className="text-[9px] font-bold"
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--primary-text)",
                        }}
                      >
                        {job.store_name[0]}
                      </span>
                    );
                  })()}
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
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-100 hover:opacity-80"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--primary-text)",
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
                /* Product card — DESIGN.md §5: border-strong + hard-shadow */
                <div
                  key={product.id}
                  className="flex flex-col"
                  style={{
                    backgroundColor: "var(--card)",
                    border: "2px solid var(--border-strong)",
                    boxShadow: "var(--hard-shadow)",
                  }}
                >
                  {/* Product Image */}
                  <div
                    className="relative w-full aspect-square"
                    style={{
                      backgroundColor: "var(--input)",
                    }}
                  >
                    {product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Package
                          className="w-8 h-8"
                          style={{ color: "var(--muted-foreground)", opacity: 0.3 }}
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
                        {new Intl.NumberFormat(undefined, { style: "currency", currency: product.currency || "EUR" }).format(product.price)}
                      </span>
                      {hasDiscount && product.original_price && (
                        <span
                          className="text-[10px] line-through"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {new Intl.NumberFormat(undefined, { style: "currency", currency: product.currency || "EUR" }).format(product.original_price)}
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

        {/* Activity feed card — DESIGN.md §5: border-strong + hard-shadow.
            Internal row dividers use soft --border for hierarchy. */}
        <div
          style={{
            backgroundColor: "var(--card)",
            border: "2px solid var(--border-strong)",
            boxShadow: "var(--hard-shadow)",
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
      <div className="mt-12 pt-6" style={{ borderTop: "2px solid var(--border)" }}>
        <div className="flex flex-col items-center gap-1 text-center">
          <p
            className="text-[10px] font-bold tracking-wider"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
              opacity: 0.5,
            }}
          >
            &copy; 2025-{new Date().getFullYear()} MarketForce One. All rights reserved.
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
            {" "}by the MarketForce One Team
          </p>
        </div>
      </div>
    </>
  );
}
