/**
 * Signup page — creates a new workspace + starts a 7-day trial.
 *
 * Six-step wizard:
 *   1. personal   First + Last + Country
 *   2. workspace  Workspace name + Email                (no API call)
 *   3. business   First store URL (optional)            (no API call)
 *   4. plan       Pick Standard or Pro (from ?plan=)    (no API call)
 *   5. payment    Card form + "Start Trial"             (sends OTP)
 *   6. verify     6-digit OTP code                      (verify + POST)
 *   — creating    Spinner while /api/workspaces runs, then /dashboard.
 *
 * Rationale for OTP at the end (not the middle): tab-switches to the
 * email app are the single biggest conversion killer in signup flows.
 * By the time the user reaches "Check your inbox" they've already
 * invested 60–90 seconds and entered a card — strong commitment signal.
 *
 * The optional Step 3 store URL is forwarded to the API which inserts
 * a stores row and kicks off the initial product import.
 *
 * Card data is never sent to our server — the card form is a mock UI
 * for the Option B scope (UI + DB only). When Stripe lands, replace
 * CardForm with Stripe Elements and route the payment-method id into
 * the POST body.
 *
 * Design: Neo-Industrial (DESIGN.md) — .landing-page scoped overrides
 * for gold #FFD700 palette, Epilogue/Inter fonts, hard shadows.
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Zap,
  Sparkles,
  CheckCircle2,
  Store as StoreIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CountryPicker } from "./_components/country-picker";
import { PlanPicker, PLANS, type PlanId } from "./_components/plan-picker";
import {
  CardForm,
  EMPTY_CARD,
  isCardComplete,
  type CardData,
} from "./_components/card-form";

type Step =
  | "personal"
  | "workspace"
  | "business"
  | "plan"
  | "payment"
  | "verify"
  | "creating";

const TRIAL_DAYS = 7;

/**
 * Lightweight client-side URL sanity check. Authoritative validation
 * (private-IP blocklist, localhost refusal, etc.) happens on the server
 * in /api/workspaces — this is just enough to catch obvious typos
 * before we advance the wizard.
 */
function isUrlFormatValid(raw: string): boolean {
  const t = raw.trim();
  if (!t) return true; // empty allowed — user is skipping this step
  try {
    const u = new URL(t.startsWith("http") ? t : `https://${t}`);
    return u.hostname.includes(".") && u.hostname.length > 3;
  } catch {
    return false;
  }
}

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // ?plan=pro|business carried from the landing pricing cards.
  // Business Class is the default for visitors from the hero/bottom
  // CTAs (no ?plan= param) since it's the "Most Popular" tier.
  const queryPlan = searchParams.get("plan");
  const initialPlan: PlanId = queryPlan === "pro" ? "pro" : "business";

  const [step, setStep] = useState<Step>("personal");

  // Step 1 state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [country, setCountry] = useState("");

  // Step 2 state
  const [workspaceName, setWorkspaceName] = useState("");
  const [email, setEmail] = useState("");

  // Step 3 state (optional)
  const [storeUrl, setStoreUrl] = useState("");

  // Step 4 state
  const [plan, setPlan] = useState<PlanId>(initialPlan);

  // Step 5 state (mock card — never leaves the browser)
  const [card, setCard] = useState<CardData>(EMPTY_CARD);
  // Discount code is a stub field — not sent to the API, not applied
  // anywhere yet. Will be wired up when real billing lands.
  const [discountCode, setDiscountCode] = useState("");

  // Step 6 state (OTP)
  const [otpCode, setOtpCode] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Shared
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Resend cooldown tick
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Both dates computed once when the page mounts. They're only
  // displayed — the server will stamp its own authoritative values on
  // workspace creation, so clock-skew between client and server is OK.
  const trialStartsAt = useMemo(() => new Date(), []);
  const trialEndsAt = useMemo(() => {
    const d = new Date(trialStartsAt);
    d.setDate(d.getDate() + TRIAL_DAYS);
    return d;
  }, [trialStartsAt]);

  const selectedPlan = PLANS.find((p) => p.id === plan)!;

  // Step validators
  const canAdvancePersonal =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    country.length === 2;
  const canAdvanceWorkspace =
    workspaceName.trim().length >= 2 && /\S+@\S+\.\S+/.test(email);
  const canAdvanceBusiness = isUrlFormatValid(storeUrl); // empty is valid
  const canStartTrial = isCardComplete(card);

  /**
   * Step 5 → 6: send OTP, show verify screen.
   * OTP lives at the end of the flow so the user has already committed
   * card details by the time they're asked to check their inbox.
   */
  const handleStartTrial = useCallback(async () => {
    if (!canStartTrial) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStep("verify");
    setCooldown(60);
  }, [canStartTrial, email, supabase.auth]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setCooldown(60);
  }, [cooldown, email, supabase.auth]);

  /**
   * Step 6 → creating: verify the OTP, then POST everything we've
   * collected to /api/workspaces. The route handles the full side-
   * effect chain (profile, workspace, member, subscription, optional
   * first store + product import trigger).
   */
  const handleVerifyAndCreate = useCallback(async () => {
    if (otpCode.length !== 6) return;
    setError(null);
    setLoading(true);

    const { error: verifyErr } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: "email",
    });
    if (verifyErr) {
      setLoading(false);
      setError(verifyErr.message);
      return;
    }

    setStep("creating");
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          country,
          name: workspaceName.trim(),
          intendedPlan: plan,
          storeUrl: storeUrl.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      router.push("/dashboard");
    } catch (err) {
      setLoading(false);
      setStep("verify");
      setError(
        err instanceof Error ? err.message : "Failed to create workspace"
      );
    }
  }, [
    otpCode,
    email,
    firstName,
    lastName,
    country,
    workspaceName,
    plan,
    storeUrl,
    router,
    supabase.auth,
  ]);

  function goBack() {
    setError(null);
    if (step === "workspace") setStep("personal");
    else if (step === "business") setStep("workspace");
    else if (step === "plan") setStep("business");
    else if (step === "payment") setStep("plan");
    else if (step === "verify") {
      // Let the user go back to change card / plan. Reset OTP state so
      // a fresh code is sent if they re-click Start Trial.
      setOtpCode("");
      setCooldown(0);
      setStep("payment");
    }
    // No back from personal (link home) or creating.
  }

  const fmtDate = (d: Date) =>
    d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const trialStartLabel = fmtDate(trialStartsAt);
  const trialEndLabel = fmtDate(trialEndsAt);

  const headerCopy: Record<Step, { kicker: string; title: string }> = {
    personal: { kicker: "Step 1 of 6", title: "Tell us about you" },
    workspace: { kicker: "Step 2 of 6", title: "Create your workspace" },
    business: { kicker: "Step 3 of 6", title: "Add your first store" },
    plan: { kicker: "Step 4 of 6", title: "Choose a plan" },
    payment: { kicker: "Step 5 of 6", title: "Payment details" },
    verify: { kicker: "Step 6 of 6", title: "Check your inbox" },
    creating: { kicker: "Almost there", title: "Setting up your workspace" },
  };

  return (
    /* .landing-page scopes Neo-Industrial CSS variables
       (gold #FFD700 primary, #F9F9F9/#000 surfaces, hard shadows) */
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

      {/* Wrapper widens on step 5 so the summary + card panels get
          enough room to breathe side by side. Other steps stay tight. */}
      <div
        className={`relative z-10 w-full ${
          step === "payment" ? "max-w-[820px]" : "max-w-[600px]"
        }`}
      >
        {step !== "creating" && (
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 mb-6 text-[10px] font-bold uppercase tracking-[0.15em] transition-opacity duration-100 hover:opacity-100"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
              opacity: 0.6,
            }}
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Home
          </Link>
        )}

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
          <p
            className="text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            Start your 7-day free trial
          </p>
        </div>

        {/* Main card — renders for every step EXCEPT payment. Step 5
            has its own two-panel layout below because a single card
            can't do side-by-side summary + card-details gracefully. */}
        {step !== "payment" && (
        <div
          className="p-6"
          style={{
            backgroundColor: "var(--card)",
            border: "2px solid var(--border-strong)",
            boxShadow: "var(--hard-shadow)",
          }}
        >
          <div className="mb-6">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5"
              style={{
                fontFamily: "var(--font-mono)",
                color:
                  step === "verify" || step === "creating"
                    ? "var(--primary-text)"
                    : "var(--muted-foreground)",
              }}
            >
              {headerCopy[step].kicker}
            </p>
            <h1
              className="text-lg font-extrabold tracking-tight"
              style={{
                fontFamily: "var(--font-display)",
                letterSpacing: "-0.02em",
              }}
            >
              {headerCopy[step].title}
            </h1>
          </div>

          {/* ─── STEP 1: Personal ─── */}
          {step === "personal" && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <LabeledInput
                  label="First Name"
                  value={firstName}
                  onChange={setFirstName}
                  placeholder="Ada"
                  autoFocus
                />
                <LabeledInput
                  label="Last Name"
                  value={lastName}
                  onChange={setLastName}
                  placeholder="Lovelace"
                />
              </div>

              <div>
                <label
                  className="block text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--foreground)",
                    opacity: 0.5,
                  }}
                >
                  Country
                </label>
                <CountryPicker value={country} onChange={setCountry} />
              </div>

              <PrimaryButton
                onClick={() => setStep("workspace")}
                disabled={!canAdvancePersonal}
                label="Continue"
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              />

              <p
                className="text-center text-[10px] font-bold uppercase tracking-[0.15em]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                }}
              >
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="transition-colors duration-100 hover:opacity-80"
                  style={{ color: "var(--primary-text)" }}
                >
                  Sign In
                </Link>
              </p>
            </div>
          )}

          {/* ─── STEP 2: Workspace + Email ─── */}
          {step === "workspace" && (
            <div className="flex flex-col gap-4">
              <LabeledInput
                label="Workspace Name"
                value={workspaceName}
                onChange={setWorkspaceName}
                placeholder="My Company"
                autoFocus
              />
              <LabeledInput
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                onEnter={() =>
                  canAdvanceWorkspace && setStep("business")
                }
              />

              <div className="flex gap-2">
                <SecondaryButton onClick={goBack} label="Back" />
                <PrimaryButton
                  onClick={() => setStep("business")}
                  disabled={!canAdvanceWorkspace}
                  label="Continue"
                  icon={<ArrowRight className="w-3.5 h-3.5" />}
                  className="flex-1"
                />
              </div>
            </div>
          )}

          {/* ─── STEP 3: First Store URL (optional) ─── */}
          {step === "business" && (
            <div className="flex flex-col gap-4">
              <p
                className="text-[12px] leading-relaxed -mt-3"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--muted-foreground)",
                }}
              >
                Paste any Shopify or WooCommerce shop URL and
                we&apos;ll start importing products as soon as your workspace
                is ready. You can skip this step and add stores later.
              </p>

              <div>
                <label
                  className="block text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--foreground)",
                    opacity: 0.5,
                  }}
                >
                  Store URL (optional)
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={storeUrl}
                    onChange={(e) => setStoreUrl(e.target.value)}
                    placeholder="example-shop.com"
                    className="w-full pl-9 pr-3 py-2.5 text-xs outline-none transition-all duration-100"
                    style={{
                      fontFamily: "var(--font-mono)",
                      backgroundColor: "var(--input)",
                      border: "2px solid var(--border)",
                      color: "var(--foreground)",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.border =
                        "4px solid var(--primary)";
                      e.currentTarget.style.padding = "8px 10px 8px 34px";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.border = "2px solid var(--border)";
                      e.currentTarget.style.padding = "10px 12px 10px 36px";
                    }}
                    autoFocus
                  />
                  <StoreIcon
                    className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ opacity: 0.5 }}
                  />
                </div>
                {storeUrl && !canAdvanceBusiness && (
                  <p
                    className="mt-1.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "#FF453A",
                    }}
                  >
                    Enter a valid URL or leave blank to skip
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <SecondaryButton onClick={goBack} label="Back" />
                <PrimaryButton
                  onClick={() => setStep("plan")}
                  disabled={!canAdvanceBusiness}
                  label={storeUrl.trim() ? "Continue" : "Skip for now"}
                  icon={<ArrowRight className="w-3.5 h-3.5" />}
                  className="flex-1"
                />
              </div>
            </div>
          )}

          {/* ─── STEP 4: Plan Picker ─── */}
          {step === "plan" && (
            <div className="flex flex-col gap-4">
              <p
                className="text-[11px] leading-relaxed -mt-3"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--muted-foreground)",
                }}
              >
                You&apos;ll start with a 7-day free trial of the plan you pick.
                You can switch or cancel before {trialEndLabel}.
              </p>

              <PlanPicker value={plan} onChange={setPlan} />

              <div className="flex gap-2">
                <SecondaryButton onClick={goBack} label="Back" />
                <PrimaryButton
                  onClick={() => setStep("payment")}
                  label="Continue"
                  icon={<ArrowRight className="w-3.5 h-3.5" />}
                  className="flex-1"
                />
              </div>
            </div>
          )}

          {/* Step 5 (payment) renders OUTSIDE this card as two separate
              panels — see the {step === "payment" && ...} block below the
              main card below. */}

          {/* ─── STEP 6: Verify OTP ─── */}
          {step === "verify" && (
            <div className="flex flex-col gap-4">
              <p
                className="text-sm -mt-3"
                style={{
                  color: "var(--foreground)",
                  opacity: 0.6,
                  fontFamily: "var(--font-body)",
                }}
              >
                One last thing — enter the 6-digit code we just sent to{" "}
                <span className="font-semibold" style={{ opacity: 1 }}>
                  {email}
                </span>
                .
              </p>

              <div>
                <label
                  className="block text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--foreground)",
                    opacity: 0.5,
                  }}
                >
                  Verification Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) =>
                    setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="000000"
                  className="w-full px-3 py-3 text-2xl font-bold text-center outline-none transition-all duration-100"
                  style={{
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.5em",
                    backgroundColor: "var(--input)",
                    border: "2px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.border = "4px solid var(--primary)";
                    e.currentTarget.style.padding = "10px 12px";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = "2px solid var(--border)";
                    e.currentTarget.style.padding = "12px 12px";
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && otpCode.length === 6)
                      handleVerifyAndCreate();
                  }}
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <SecondaryButton onClick={goBack} label="Back" />
                <PrimaryButton
                  onClick={handleVerifyAndCreate}
                  disabled={otpCode.length !== 6 || loading}
                  loading={loading}
                  label="Confirm & Start Trial"
                  icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  className="flex-1"
                />
              </div>

              <button
                onClick={handleResend}
                disabled={cooldown > 0 || loading}
                className="w-full px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-100 disabled:opacity-30 disabled:pointer-events-none"
                style={{
                  fontFamily: "var(--font-mono)",
                  backgroundColor: "transparent",
                  color: "var(--muted-foreground)",
                  border: "2px solid var(--border)",
                }}
              >
                {cooldown > 0
                  ? `Resend Code (${cooldown}s)`
                  : "Resend Code"}
              </button>
            </div>
          )}

          {/* ─── CREATING ─── */}
          {step === "creating" && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Sparkles
                className="w-6 h-6 animate-pulse"
                style={{ color: "var(--primary-text)" }}
              />
              <p
                className="text-[10px] font-bold uppercase tracking-[0.15em]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                }}
              >
                Creating your workspace…
              </p>
            </div>
          )}

          {error && (
            <div
              className="mt-4 p-3 text-[10px] font-bold uppercase tracking-wider"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: "rgba(255,69,58,0.08)",
                border: "2px solid rgba(255,69,58,0.3)",
                borderLeftWidth: "4px",
                borderLeftColor: "#FF453A",
                color: "#FF453A",
              }}
            >
              {error}
            </div>
          )}
        </div>
        )}

        {/* ─── STEP 5 — Two standalone panels side by side ───
            The wrapper div is widened to max-w-[820px] for this step
            so each panel gets enough room. Mobile stacks them. */}
        {step === "payment" && (
          <>
            {/* Standalone step header — sits above the panels, not
                wrapped in a card. Checkout-page aesthetic. */}
            <div className="mb-5">
              <p
                className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                }}
              >
                {headerCopy.payment.kicker}
              </p>
              <h1
                className="text-lg font-extrabold tracking-tight"
                style={{
                  fontFamily: "var(--font-display)",
                  letterSpacing: "-0.02em",
                }}
              >
                {headerCopy.payment.title}
              </h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5 items-stretch">
              {/* ── LEFT PANEL — Order summary + discount ── */}
              <div
                className="p-6 flex flex-col"
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
                  Order Summary
                </p>

                <div className="flex flex-col gap-3">
                  <SummaryRow
                    label="Plan"
                    value={`${selectedPlan.name} · ${selectedPlan.price}${selectedPlan.priceSuffix}`}
                  />
                  <SummaryRow
                    label="Trial Starts"
                    value={trialStartLabel}
                  />
                  <SummaryRow
                    label="Trial Ends"
                    value={trialEndLabel}
                  />
                </div>

                {/* Discount code — optional, stub for now. */}
                <div
                  className="mt-5 pt-5"
                  style={{ borderTop: "2px solid var(--border)" }}
                >
                  <label
                    className="block text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--foreground)",
                      opacity: 0.5,
                    }}
                  >
                    Discount Code
                  </label>
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) =>
                      setDiscountCode(e.target.value.toUpperCase())
                    }
                    placeholder="SAVE10"
                    className="w-full px-3 py-2.5 text-xs outline-none transition-all duration-100"
                    style={{
                      fontFamily: "var(--font-mono)",
                      backgroundColor: "var(--input)",
                      border: "2px solid var(--border)",
                      color: "var(--foreground)",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.border =
                        "4px solid var(--primary)";
                      e.currentTarget.style.padding = "8px 10px";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.border = "2px solid var(--border)";
                      e.currentTarget.style.padding = "10px 12px";
                    }}
                  />
                  {discountCode.trim() && (
                    <p
                      className="mt-1.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--primary-text)",
                      }}
                    >
                      Code saved · will apply at checkout
                    </p>
                  )}
                </div>

                {/* Charge footer — mt-auto pushes it to the bottom of
                    the panel so the summary aligns with the card panel
                    height when they sit side by side. */}
                <div
                  className="mt-auto pt-5"
                  style={{ borderTop: "2px solid var(--border)" }}
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    After trial
                  </p>
                  <p
                    className="text-[11px] leading-relaxed"
                    style={{
                      fontFamily: "var(--font-body)",
                      color: "var(--foreground)",
                      opacity: 0.85,
                    }}
                  >
                    Your card will be charged{" "}
                    <span className="font-bold">
                      {selectedPlan.price}
                      {selectedPlan.priceSuffix}
                    </span>{" "}
                    on <span className="font-bold">{trialEndLabel}</span>{" "}
                    unless you cancel before then.
                  </p>
                </div>
              </div>

              {/* ── RIGHT PANEL — Card details ── */}
              <div
                className="p-6 flex flex-col"
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
                  Card Details
                </p>
                <CardForm value={card} onChange={setCard} />
              </div>
            </div>

            <div className="flex gap-2">
              <SecondaryButton onClick={goBack} label="Back" />
              <PrimaryButton
                onClick={handleStartTrial}
                disabled={!canStartTrial || loading}
                loading={loading}
                label="Start Trial"
                icon={<Zap className="w-3.5 h-3.5" />}
                className="flex-1"
              />
            </div>

            <p
              className="text-[9px] text-center mt-4"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--muted-foreground)",
                opacity: 0.6,
              }}
            >
              By starting your trial you agree to the Terms and Privacy
              Policy.
            </p>

            {error && (
              <div
                className="mt-4 p-3 text-[10px] font-bold uppercase tracking-wider"
                style={{
                  fontFamily: "var(--font-mono)",
                  backgroundColor: "rgba(255,69,58,0.08)",
                  border: "2px solid rgba(255,69,58,0.3)",
                  borderLeftWidth: "4px",
                  borderLeftColor: "#FF453A",
                  color: "#FF453A",
                }}
              >
                {error}
              </div>
            )}
          </>
        )}

        <p
          className="text-center mt-6 text-[9px] font-bold uppercase tracking-[0.15em]"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
            opacity: 0.4,
          }}
        >
          MarketForce One · Product Intelligence
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Small in-file primitives for the signup inputs.
   Brutalist focus animation shared across steps.
   ───────────────────────────────────────────── */

interface LabeledInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoFocus?: boolean;
  onEnter?: () => void;
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoFocus,
  onEnter,
}: LabeledInputProps) {
  return (
    <div>
      <label
        className="block text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5"
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--foreground)",
          opacity: 0.5,
        }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 text-xs outline-none transition-all duration-100"
        style={{
          fontFamily: "var(--font-mono)",
          backgroundColor: "var(--input)",
          border: "2px solid var(--border)",
          color: "var(--foreground)",
        }}
        onFocus={(e) => {
          e.currentTarget.style.border = "4px solid var(--primary)";
          e.currentTarget.style.padding = "8px 10px";
        }}
        onBlur={(e) => {
          e.currentTarget.style.border = "2px solid var(--border)";
          e.currentTarget.style.padding = "10px 12px";
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) onEnter();
        }}
        autoFocus={autoFocus}
      />
    </div>
  );
}

interface PrimaryButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  label: string;
  icon?: React.ReactNode;
  className?: string;
}

function PrimaryButton({
  onClick,
  disabled,
  loading,
  label,
  icon,
  className = "",
}: PrimaryButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground transition-all duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:pointer-events-none ${className}`}
      style={{
        fontFamily: "var(--font-mono)",
        border: "2px solid var(--border-strong)",
        boxShadow: "var(--hard-shadow)",
      }}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      {label}
    </button>
  );
}

function SecondaryButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-100"
      style={{
        fontFamily: "var(--font-mono)",
        backgroundColor: "transparent",
        color: "var(--muted-foreground)",
        border: "2px solid var(--border)",
      }}
    >
      <ArrowLeft className="w-3 h-3" />
      {label}
    </button>
  );
}

/** Single key/value row used in the order-summary block on step 5. */
function SummaryRow({ label, value }: { label: string; value: string }) {
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
