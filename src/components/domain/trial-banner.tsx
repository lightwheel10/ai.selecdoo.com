"use client";

import { useAuthAccess } from "@/components/domain/role-provider";
import { AlertTriangle, Clock, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Thin horizontal banner above the dashboard main content. Only
 * visible when subscription status is something the user should
 * act on: trialing (shows countdown), past_due (card problem),
 * or canceled/expired (subscribe prompt).
 *
 * Active subscriptions: banner hidden — no noise.
 * No subscription at all (null): also hidden — handled by the
 * dashboard empty state (P3.4) with a full-page CTA.
 */
export function TrialBanner() {
  const { subscription } = useAuthAccess();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!subscription) return null;

  const { status, trialEndsAt } = subscription;

  // Happy path: active subscription → banner hidden.
  if (status === "active") return null;
  // Incomplete means checkout hasn't finished — also silent.
  if (status === "incomplete") return null;

  async function handleManageBilling() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Swallow — portal isn't critical; worst case user retries.
    } finally {
      setLoading(false);
    }
  }

  // Trialing: show remaining days.
  if (status === "trialing" && trialEndsAt) {
    const daysLeft = Math.max(
      0,
      Math.ceil(
        (new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    );
    return (
      <Banner
        icon={<Clock className="w-3.5 h-3.5" />}
        bg="var(--primary-muted)"
        border="var(--primary-border)"
        color="var(--primary-text)"
      >
        <span className="font-bold">{daysLeft} day{daysLeft !== 1 ? "s" : ""}</span>
        {" left in your trial."}
        <button
          onClick={handleManageBilling}
          disabled={loading}
          className="ml-2 underline underline-offset-2 font-bold hover:opacity-80 transition-opacity"
        >
          {loading ? "Loading…" : "Upgrade now"}
        </button>
      </Banner>
    );
  }

  // Past due: card problem.
  if (status === "past_due") {
    return (
      <Banner
        icon={<AlertTriangle className="w-3.5 h-3.5" />}
        bg="rgba(255,159,10,0.06)"
        border="rgba(255,159,10,0.3)"
        color="#FF9F0A"
      >
        Payment failed.{" "}
        <button
          onClick={handleManageBilling}
          disabled={loading}
          className="underline underline-offset-2 font-bold hover:opacity-80 transition-opacity"
        >
          {loading ? "Loading…" : "Update billing info"}
        </button>
      </Banner>
    );
  }

  // Canceled / expired / unpaid.
  if (
    status === "canceled" ||
    status === "expired" ||
    status === "unpaid"
  ) {
    return (
      <Banner
        icon={<XCircle className="w-3.5 h-3.5" />}
        bg="rgba(255,69,58,0.06)"
        border="rgba(255,69,58,0.25)"
        color="#FF453A"
      >
        Your subscription has ended.{" "}
        <button
          onClick={() => router.push("/signup")}
          className="underline underline-offset-2 font-bold hover:opacity-80 transition-opacity"
        >
          Resubscribe
        </button>
      </Banner>
    );
  }

  return null;
}

function Banner({
  icon,
  bg,
  border,
  color,
  children,
}: {
  icon: React.ReactNode;
  bg: string;
  border: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-2.5 px-4 py-2.5 text-[11px]"
      style={{
        fontFamily: "var(--font-mono)",
        backgroundColor: bg,
        borderBottom: `2px solid ${border}`,
        color,
      }}
    >
      {icon}
      <span>{children}</span>
    </div>
  );
}
