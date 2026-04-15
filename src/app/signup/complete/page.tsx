/**
 * /signup/complete — landing page when the user returns from Stripe
 * Checkout after successfully entering their card.
 *
 * Stripe redirects here with ?session_id={CHECKOUT_SESSION_ID} (see
 * success_url in /api/billing/checkout). The session_id is
 * informational only — we don't use it for authorization.
 *
 * Why a polling loop:
 *   The webhook handler (/api/billing/webhook) is what actually writes
 *   the subscription row when Stripe confirms the Checkout Session.
 *   Webhook delivery is fast (typically 1–3s) but not instant. The
 *   browser might land on this page before the webhook has finished
 *   writing the row. So we poll /api/billing/status every ~1.5s until
 *   we see a confirmed subscription (status='trialing' or 'active'),
 *   then navigate to /dashboard.
 *
 *   30s timeout → fall back to a "this is taking longer than expected"
 *   message + direct link to the dashboard. The webhook may still land
 *   a moment later; the user just missed the polling window.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 30_000;

type ViewState = "polling" | "success" | "timeout" | "unauthenticated";

export default function SignupCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id"); // informational

  const [view, setView] = useState<ViewState>("polling");
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const startTime = Date.now();
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      if (cancelled) return;
      setAttempts((n) => n + 1);

      let res: Response;
      try {
        res = await fetch("/api/billing/status", { cache: "no-store" });
      } catch {
        // Network blip — retry unless timed out.
        if (Date.now() - startTime > POLL_TIMEOUT_MS) {
          setView("timeout");
          return;
        }
        timer = setTimeout(poll, POLL_INTERVAL_MS);
        return;
      }

      // 401 = session lost somehow (e.g. they were signed out during
      // the Stripe redirect). Push to login; they can sign in again.
      if (res.status === 401) {
        setView("unauthenticated");
        return;
      }

      if (!res.ok) {
        // Any other error: keep polling until timeout.
        if (Date.now() - startTime > POLL_TIMEOUT_MS) {
          setView("timeout");
          return;
        }
        timer = setTimeout(poll, POLL_INTERVAL_MS);
        return;
      }

      const data = await res.json().catch(() => null);
      const ready =
        data?.hasSubscription === true &&
        (data.status === "trialing" || data.status === "active");

      if (ready) {
        setView("success");
        // Brief pause so the user sees the success state before the
        // page transition — feels less jarring than instant redirect.
        setTimeout(() => {
          if (!cancelled) router.replace("/dashboard");
        }, 600);
        return;
      }

      if (Date.now() - startTime > POLL_TIMEOUT_MS) {
        setView("timeout");
        return;
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    }

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [router]);

  return (
    /* .landing-page scopes Neo-Industrial CSS variables, matching the
       rest of the signup / login flow for visual continuity. */
    <div className="landing-page min-h-screen bg-background flex items-center justify-center px-4 py-8">
      {/* 20px blueprint grid — DESIGN.md §2 */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(128,128,128,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(128,128,128,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
        }}
      />

      <div className="relative z-10 w-full max-w-[480px]">
        {/* Branding */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground"
              style={{
                fontFamily: "var(--font-mono)",
                border: "2px solid var(--border-strong)",
              }}
            >
              MF
            </div>
            <span
              className="text-lg font-black tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              MarketForce One
            </span>
          </div>
        </div>

        <div
          className="p-8"
          style={{
            backgroundColor: "var(--card)",
            border: "2px solid var(--border-strong)",
            boxShadow: "var(--hard-shadow)",
          }}
        >
          {view === "polling" && <PollingView attempts={attempts} />}
          {view === "success" && <SuccessView />}
          {view === "timeout" && <TimeoutView />}
          {view === "unauthenticated" && <UnauthenticatedView />}
        </div>

        {/* Footer — tiny debug hint when a session id was passed */}
        {sessionId && (
          <p
            className="text-center mt-6 text-[9px] tracking-wider"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
              opacity: 0.3,
            }}
          >
            ref: {sessionId.slice(0, 20)}…
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Views ─────────────────────────────────────── */

function PollingView({ attempts }: { attempts: number }) {
  return (
    <div className="flex flex-col items-center text-center">
      <Loader2
        className="w-8 h-8 animate-spin mb-4"
        style={{ color: "var(--primary-text)" }}
      />
      <p
        className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--primary-text)",
        }}
      >
        Finalizing your trial
      </p>
      <h1
        className="text-lg font-extrabold tracking-tight mb-3"
        style={{
          fontFamily: "var(--font-display)",
          letterSpacing: "-0.02em",
        }}
      >
        Almost there…
      </h1>
      <p
        className="text-[12px] leading-relaxed max-w-[320px]"
        style={{
          fontFamily: "var(--font-body)",
          color: "var(--muted-foreground)",
        }}
      >
        We&apos;re confirming your payment with Stripe. This usually takes
        a few seconds.
      </p>
      {attempts > 4 && (
        <p
          className="mt-4 text-[10px] tracking-wider"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
            opacity: 0.6,
          }}
        >
          Still working…
        </p>
      )}
    </div>
  );
}

function SuccessView() {
  return (
    <div className="flex flex-col items-center text-center">
      <CheckCircle2
        className="w-8 h-8 mb-4"
        style={{ color: "var(--primary-text)" }}
      />
      <p
        className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--primary-text)",
        }}
      >
        Trial active
      </p>
      <h1
        className="text-lg font-extrabold tracking-tight mb-3"
        style={{
          fontFamily: "var(--font-display)",
          letterSpacing: "-0.02em",
        }}
      >
        You&apos;re all set.
      </h1>
      <p
        className="text-[12px] leading-relaxed"
        style={{
          fontFamily: "var(--font-body)",
          color: "var(--muted-foreground)",
        }}
      >
        Redirecting to your dashboard…
      </p>
    </div>
  );
}

function TimeoutView() {
  return (
    <div className="flex flex-col items-center text-center">
      <AlertTriangle
        className="w-8 h-8 mb-4"
        style={{ color: "#FF9F0A" }}
      />
      <p
        className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
        style={{ fontFamily: "var(--font-mono)", color: "#FF9F0A" }}
      >
        Still syncing
      </p>
      <h1
        className="text-lg font-extrabold tracking-tight mb-3"
        style={{
          fontFamily: "var(--font-display)",
          letterSpacing: "-0.02em",
        }}
      >
        Your payment went through — give us a moment
      </h1>
      <p
        className="text-[12px] leading-relaxed mb-5 max-w-[360px]"
        style={{
          fontFamily: "var(--font-body)",
          color: "var(--muted-foreground)",
        }}
      >
        Stripe confirmed the payment but our backend hasn&apos;t finished
        recording it yet. You can go to your dashboard now — the
        subscription status will update automatically within a minute.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.15em] bg-primary text-primary-foreground transition-all duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        style={{
          fontFamily: "var(--font-mono)",
          border: "2px solid var(--border-strong)",
          boxShadow: "var(--hard-shadow)",
        }}
      >
        Go to Dashboard
      </Link>
    </div>
  );
}

function UnauthenticatedView() {
  return (
    <div className="flex flex-col items-center text-center">
      <AlertTriangle
        className="w-8 h-8 mb-4"
        style={{ color: "#FF453A" }}
      />
      <p
        className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
        style={{ fontFamily: "var(--font-mono)", color: "#FF453A" }}
      >
        Session expired
      </p>
      <h1
        className="text-lg font-extrabold tracking-tight mb-3"
        style={{
          fontFamily: "var(--font-display)",
          letterSpacing: "-0.02em",
        }}
      >
        Please sign in again
      </h1>
      <p
        className="text-[12px] leading-relaxed mb-5 max-w-[360px]"
        style={{
          fontFamily: "var(--font-body)",
          color: "var(--muted-foreground)",
        }}
      >
        Your sign-in session lapsed during checkout. Your subscription
        is safe — sign back in to reach your dashboard.
      </p>
      <Link
        href="/login"
        className="inline-flex items-center gap-2 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.15em] bg-primary text-primary-foreground transition-all duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        style={{
          fontFamily: "var(--font-mono)",
          border: "2px solid var(--border-strong)",
          boxShadow: "var(--hard-shadow)",
        }}
      >
        Sign In
      </Link>
    </div>
  );
}
