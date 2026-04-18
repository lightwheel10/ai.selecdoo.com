"use client";

import { useEffect, useState, useCallback } from "react";
import { ExternalLink, Loader2, Check, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { PLANS } from "@/app/signup/_components/plan-picker";

interface BillingStatus {
  hasSubscription: boolean;
  plan: string | null;
  status: string | null;
  intendedPlan: string | null;
  trialStartsAt: string | null;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  usage: {
    stores: number;
    products: number;
    generationsThisMonth: number;
    checksThisMonth: number;
  } | null;
  limits: {
    maxStores: number;
    maxProducts: number;
    maxGenerationsPerMonth: number;
    maxChecksPerMonth: number;
  } | null;
}

const STATUS_LABELS: Record<string, string> = {
  trialing: "Trial",
  active: "Active",
  past_due: "Past Due",
  canceled: "Canceled",
  expired: "Expired",
  incomplete: "Incomplete",
  unpaid: "Unpaid",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AdminBillingTab() {
  const ta = useTranslations("Admin");
  const [data, setData] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetch("/api/billing/status")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const handlePortal = useCallback(async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const result = await res.json();
      if (result.url) window.location.href = result.url;
    } catch {
      // Swallow — user can retry
    } finally {
      setPortalLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2
          className="w-5 h-5 animate-spin"
          style={{ color: "var(--muted-foreground)" }}
        />
      </div>
    );
  }

  if (!data?.hasSubscription) {
    return (
      <div
        className="p-6"
        style={{
          backgroundColor: "var(--card)",
          border: "2px solid var(--border-strong)",
          boxShadow: "var(--hard-shadow)",
        }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--primary-text)",
          }}
        >
          {ta("billingTab")}
        </p>
        <p
          className="text-sm mb-4"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--muted-foreground)",
          }}
        >
          No subscription found for this workspace. Complete the signup
          flow to start your trial.
        </p>
      </div>
    );
  }

  // Resolve which plan to display pricing for.
  // During trial, the actual plan is "trial" — display is the intended plan.
  const displayPlanId =
    data.plan === "trial" ? data.intendedPlan : data.plan;
  const planInfo = PLANS.find((p) => p.id === displayPlanId);

  const daysLeft =
    data.status === "trialing" && data.trialEndsAt
      ? Math.max(
          0,
          Math.ceil(
            (new Date(data.trialEndsAt).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : null;

  return (
    <div className="space-y-4">
      {/* ── Section 1: Subscription Overview ── */}
      <div
        className="p-6"
        style={{
          backgroundColor: "var(--card)",
          border: "2px solid var(--border-strong)",
          boxShadow: "var(--hard-shadow)",
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--primary-text)",
            }}
          >
            Subscription
          </p>
          <StatusBadge status={data.status ?? "incomplete"} />
        </div>

        {/* Plan name + price */}
        <div className="mb-4">
          <h2
            className="text-xl font-extrabold tracking-tight"
            style={{
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.02em",
            }}
          >
            {data.status === "trialing" && planInfo ? (
              <>
                <span style={{ color: "var(--muted-foreground)" }}>
                  Trial of{" "}
                </span>
                {planInfo.name}
              </>
            ) : (
              planInfo?.name ?? "—"
            )}
            {planInfo && (
              <span
                className="ml-2 text-sm font-bold"
                style={{ color: "var(--muted-foreground)" }}
              >
                {planInfo.price}
                {planInfo.priceSuffix}
              </span>
            )}
          </h2>
          {planInfo && (
            <p
              className="text-[12px] mt-1"
              style={{
                fontFamily: "var(--font-body)",
                color: "var(--muted-foreground)",
              }}
            >
              {planInfo.description}
            </p>
          )}
        </div>

        {/* Trial info + activate CTA */}
        {data.status === "trialing" && (
          <div
            className="p-3 mb-4 flex flex-col gap-3"
            style={{
              backgroundColor: "var(--primary-muted)",
              border: "2px solid var(--primary-border)",
            }}
          >
            <p
              className="text-[11px] leading-relaxed"
              style={{
                fontFamily: "var(--font-body)",
                color: "var(--foreground)",
              }}
            >
              <span className="font-bold">
                {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
              </span>
              {" in your trial — full plan limits unlock the moment you activate. "}
              {planInfo && (
                <>
                  Otherwise we&apos;ll auto-charge{" "}
                  <span className="font-bold">
                    {planInfo.price}
                    {planInfo.priceSuffix}
                  </span>{" "}
                  on{" "}
                  <span className="font-bold">
                    {fmtDate(data.trialEndsAt)}
                  </span>
                  .
                </>
              )}
            </p>
            <button
              onClick={handlePortal}
              disabled={portalLoading}
              className="self-start inline-flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] bg-primary text-primary-foreground transition-all duration-100 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-40"
              style={{
                fontFamily: "var(--font-mono)",
                border: "2px solid var(--border-strong)",
                boxShadow: "var(--hard-shadow)",
              }}
            >
              {portalLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <ArrowRight className="w-3 h-3" />
              )}
              Activate {planInfo?.name ?? "now"}
            </button>
          </div>
        )}

        {/* Active billing info */}
        {data.status === "active" && data.currentPeriodEnd && (
          <div className="flex flex-col gap-2">
            <InfoRow label="Next Billing" value={fmtDate(data.currentPeriodEnd)} />
          </div>
        )}

        {/* Past due / canceled info */}
        {(data.status === "past_due" ||
          data.status === "canceled" ||
          data.status === "expired") && (
          <div
            className="p-3 mb-4"
            style={{
              backgroundColor: "rgba(255,69,58,0.06)",
              border: "2px solid rgba(255,69,58,0.25)",
            }}
          >
            <p
              className="text-[11px] leading-relaxed"
              style={{
                fontFamily: "var(--font-body)",
                color: "#FF453A",
              }}
            >
              {data.status === "past_due"
                ? "Your last payment failed. Update your payment method to avoid service interruption."
                : "Your subscription has ended. Resubscribe via the billing portal to restore access."}
            </p>
          </div>
        )}
      </div>

      {/* ── Section 2: Usage & Limits ── */}
      {data.usage && data.limits && (
        <div
          className="p-6"
          style={{
            backgroundColor: "var(--card)",
            border: "2px solid var(--border-strong)",
            boxShadow: "var(--hard-shadow)",
          }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-[0.15em] mb-4"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--primary-text)",
            }}
          >
            {data.status === "trialing" ? "Trial Usage" : "Usage"}
          </p>

          <div className="flex flex-col gap-4">
            <UsageMeter
              label="Stores"
              used={data.usage.stores}
              max={data.limits.maxStores}
              upgradeMax={
                data.status === "trialing" ? planInfo?.limits.stores : undefined
              }
              upgradePlanName={
                data.status === "trialing" ? planInfo?.name : undefined
              }
            />
            <UsageMeter
              label="Products"
              used={data.usage.products}
              max={data.limits.maxProducts}
              upgradeMax={
                data.status === "trialing" ? planInfo?.limits.products : undefined
              }
              upgradePlanName={
                data.status === "trialing" ? planInfo?.name : undefined
              }
            />
            <UsageMeter
              label="AI Generations (this month)"
              used={data.usage.generationsThisMonth}
              max={data.limits.maxGenerationsPerMonth}
              upgradeMax={
                data.status === "trialing"
                  ? planInfo?.limits.generationsPerMonth
                  : undefined
              }
              upgradePlanName={
                data.status === "trialing" ? planInfo?.name : undefined
              }
            />
            <UsageMeter
              label="Monitoring Checks (this month)"
              used={data.usage.checksThisMonth}
              max={data.limits.maxChecksPerMonth}
              upgradeMax={
                data.status === "trialing"
                  ? planInfo?.limits.checksPerMonth
                  : undefined
              }
              upgradePlanName={
                data.status === "trialing" ? planInfo?.name : undefined
              }
            />
          </div>
        </div>
      )}

      {/* ── Section 3: Plan Comparison ── */}
      <div
        className="p-6"
        style={{
          backgroundColor: "var(--card)",
          border: "2px solid var(--border-strong)",
          boxShadow: "var(--hard-shadow)",
        }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em] mb-4"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--primary-text)",
          }}
        >
          Plans
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PLANS.map((p) => {
            const isTrialPick =
              data.status === "trialing" && p.id === displayPlanId;
            const isCurrent =
              data.status !== "trialing" && p.id === displayPlanId;
            const isHighlighted = isTrialPick || isCurrent;
            return (
              <div
                key={p.id}
                className="relative flex flex-col p-4"
                style={{
                  border: isHighlighted
                    ? "2px solid var(--primary)"
                    : "2px solid var(--border)",
                  backgroundColor: isHighlighted
                    ? "var(--primary-muted)"
                    : "transparent",
                }}
              >
                {isCurrent && (
                  <span
                    className="absolute -top-2.5 right-3 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.15em]"
                    style={{
                      fontFamily: "var(--font-mono)",
                      backgroundColor: "var(--primary)",
                      color: "var(--primary-foreground)",
                      border: "2px solid var(--border-strong)",
                    }}
                  >
                    Current Plan
                  </span>
                )}
                {isTrialPick && (
                  <span
                    className="absolute -top-2.5 right-3 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.15em]"
                    style={{
                      fontFamily: "var(--font-mono)",
                      backgroundColor: "var(--card)",
                      color: "var(--primary-text)",
                      border: "2px solid var(--primary)",
                    }}
                  >
                    Trial Pick
                  </span>
                )}

                <p
                  className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  {p.name}
                </p>

                <div className="flex items-baseline gap-1 mb-2">
                  <span
                    className="text-xl font-black"
                    style={{
                      fontFamily: "var(--font-display)",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {p.price}
                  </span>
                  <span
                    className="text-[10px] font-bold"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    {p.priceSuffix}
                  </span>
                </div>

                <ul className="flex flex-col gap-1 mb-3 mt-auto">
                  {p.features.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-1.5 text-[10px]"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      <Check
                        className="w-2.5 h-2.5 shrink-0"
                        strokeWidth={3}
                        style={{ color: "var(--primary-text)" }}
                      />
                      {f}
                    </li>
                  ))}
                </ul>

                {!isCurrent && (
                  <button
                    onClick={handlePortal}
                    disabled={portalLoading}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] bg-primary text-primary-foreground transition-all duration-100 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-40"
                    style={{
                      fontFamily: "var(--font-mono)",
                      border: "2px solid var(--border-strong)",
                      boxShadow: "var(--hard-shadow)",
                    }}
                  >
                    {portalLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <ArrowRight className="w-3 h-3" />
                    )}
                    {isTrialPick
                      ? `Activate ${p.name}`
                      : `${displayPlanId === "pro" ? "Upgrade" : "Switch"} to ${p.name}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p
          className="mt-3 text-[10px]"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
            opacity: 0.6,
          }}
        >
          Plan changes take effect immediately with prorated billing.
        </p>
      </div>

      {/* ── Section 4: Actions ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={handlePortal}
          disabled={portalLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground transition-all duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:pointer-events-none"
          style={{
            fontFamily: "var(--font-mono)",
            border: "2px solid var(--border-strong)",
            boxShadow: "var(--hard-shadow)",
          }}
        >
          {portalLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ExternalLink className="w-3.5 h-3.5" />
          )}
          Manage Billing
        </button>

        <p
          className="text-[10px]"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
            opacity: 0.6,
          }}
        >
          Invoices, card updates, and cancellation
        </p>
      </div>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const palette: Record<
    string,
    { bg: string; border: string; text: string }
  > = {
    trialing: {
      bg: "var(--primary-muted)",
      border: "var(--primary-border)",
      text: "var(--primary-text)",
    },
    active: {
      bg: "rgba(34,197,94,0.08)",
      border: "rgba(34,197,94,0.3)",
      text: "#22C55E",
    },
    past_due: {
      bg: "rgba(255,159,10,0.06)",
      border: "rgba(255,159,10,0.3)",
      text: "#FF9F0A",
    },
    canceled: {
      bg: "rgba(255,69,58,0.06)",
      border: "rgba(255,69,58,0.25)",
      text: "#FF453A",
    },
    expired: {
      bg: "rgba(255,69,58,0.06)",
      border: "rgba(255,69,58,0.25)",
      text: "#FF453A",
    },
    incomplete: {
      bg: "var(--status-neutral-bg)",
      border: "var(--status-neutral-border)",
      text: "var(--muted-foreground)",
    },
  };
  const c = palette[status] ?? palette.incomplete;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em]"
      style={{
        fontFamily: "var(--font-mono)",
        backgroundColor: c.bg,
        border: `1.5px solid ${c.border}`,
        color: c.text,
      }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function UsageMeter({
  label,
  used,
  max,
  upgradeMax,
  upgradePlanName,
}: {
  label: string;
  used: number;
  max: number;
  /** When set (and > max), shows an inline "→ X on {upgradePlanName}" hint. */
  upgradeMax?: number;
  upgradePlanName?: string;
}) {
  const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0;
  const atLimit = max > 0 && used >= max;
  const showUpgradeHint =
    typeof upgradeMax === "number" && upgradeMax > max;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5 gap-3">
        <span
          className="text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
          }}
        >
          {label}
        </span>
        <span
          className="text-[11px] font-bold flex items-baseline gap-2"
          style={{
            fontFamily: "var(--font-body)",
            color: atLimit ? "#FF453A" : "var(--foreground)",
          }}
        >
          <span>
            {used.toLocaleString()} / {max.toLocaleString()}
          </span>
          {showUpgradeHint && (
            <span
              className="text-[10px] font-bold uppercase tracking-[0.1em]"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--primary-text)",
              }}
            >
              → {upgradeMax!.toLocaleString()}
              {upgradePlanName ? ` on ${upgradePlanName}` : ""}
            </span>
          )}
        </span>
      </div>
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: "var(--border)" }}
      >
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            backgroundColor: atLimit ? "#FF453A" : "var(--primary)",
          }}
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span
        className="text-[10px] font-bold uppercase tracking-[0.15em]"
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--muted-foreground)",
        }}
      >
        {label}
      </span>
      <span
        className="text-[12px] font-bold text-right"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {value}
      </span>
    </div>
  );
}
