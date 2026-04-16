"use client";

import { useEffect, useState, useCallback } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface BillingStatus {
  hasSubscription: boolean;
  plan: string | null;
  status: string | null;
  intendedPlan: string | null;
  trialStartsAt: string | null;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
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

const PLAN_LABELS: Record<string, string> = {
  trial: "Trial",
  pro: "Pro",
  business: "Business Class",
  canceled: "Canceled",
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
        {ta("billingTab")}
      </p>

      <div className="flex flex-col gap-3 mb-6">
        <Row label="Plan" value={PLAN_LABELS[data.plan ?? ""] ?? data.plan ?? "—"} />
        <Row
          label="Status"
          value={STATUS_LABELS[data.status ?? ""] ?? data.status ?? "—"}
        />
        {data.intendedPlan && (
          <Row
            label="After Trial"
            value={PLAN_LABELS[data.intendedPlan] ?? data.intendedPlan}
          />
        )}
        {data.status === "trialing" && data.trialEndsAt && (
          <Row
            label="Trial Ends"
            value={`${fmtDate(data.trialEndsAt)}${
              daysLeft !== null ? ` (${daysLeft} day${daysLeft !== 1 ? "s" : ""} left)` : ""
            }`}
          />
        )}
        {data.currentPeriodEnd && data.status === "active" && (
          <Row label="Next Billing" value={fmtDate(data.currentPeriodEnd)} />
        )}
      </div>

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
        className="mt-3 text-[10px]"
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--muted-foreground)",
          opacity: 0.6,
        }}
      >
        Invoices, card updates, and cancellation are handled via our
        secure billing portal powered by Stripe.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
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
