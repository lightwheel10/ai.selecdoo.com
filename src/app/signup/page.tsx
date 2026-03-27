/**
 * Signup page — creates a new workspace + user account.
 *
 * Flow:
 * 1. User enters workspace name + email
 * 2. OTP code sent to email (same as login flow)
 * 3. User verifies OTP
 * 4. POST /api/workspaces creates the workspace + admin membership
 * 5. Redirect to /dashboard
 *
 * Design: Neo-Industrial (DESIGN.md) — .landing-page scoped overrides
 * for gold #FFD700 palette, Epilogue/Inter fonts, hard shadows.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, ArrowRight, Loader2, Zap, Sparkles } from "lucide-react";
import Link from "next/link";

type Step = "details" | "code_sent" | "creating";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [workspaceName, setWorkspaceName] = useState("");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("details");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Cooldown timer for resend button
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Step 1: Send OTP code to email
  const handleSendCode = useCallback(async () => {
    if (!email || !workspaceName.trim()) return;
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
    } else {
      setStep("code_sent");
      setCooldown(60);
    }
  }, [email, workspaceName, supabase.auth]);

  // Step 2: Verify OTP, then create workspace
  const handleVerifyOtp = useCallback(async () => {
    if (!otpCode || otpCode.length !== 6) return;
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

    // OTP verified — now create the workspace
    setStep("creating");

    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workspaceName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      router.push("/dashboard");
    } catch (err) {
      setLoading(false);
      setStep("code_sent");
      setError(err instanceof Error ? err.message : "Failed to create workspace");
    }
  }, [email, otpCode, workspaceName, supabase.auth, router]);

  // Resend OTP code
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
    if (error) {
      setError(error.message);
    } else {
      setCooldown(60);
    }
  }, [cooldown, email, supabase.auth]);

  const goBack = () => {
    setStep("details");
    setOtpCode("");
    setError(null);
  };

  return (
    /* .landing-page scopes the Neo-Industrial CSS variable overrides
       (gold #FFD700 primary, #F9F9F9/#000 backgrounds, hard shadows) */
    <div className="landing-page min-h-screen bg-background flex items-center justify-center px-4">
      {/* 20px blueprint grid — DESIGN.md §2 signature texture */}
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

      <div className="relative z-10 w-full max-w-[400px]">
        {/* Back to home */}
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

        {/* Branding — Epilogue display font, border-strong on logo */}
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
            Create Your Workspace
          </p>
        </div>

        {/* Card — DESIGN.md §5: 2px border-strong border, hard shadow */}
        <div
          className="p-6"
          style={{
            backgroundColor: "var(--card)",
            border: "2px solid var(--border-strong)",
            boxShadow: "var(--hard-shadow)",
          }}
        >
          {/* ─── STEP 1: Workspace Name + Email ─── */}
          {step === "details" && (
            <>
              <div className="mb-6">
                <h1
                  className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  Get Started
                </h1>
                <p
                  className="text-sm"
                  style={{
                    color: "var(--foreground)",
                    opacity: 0.6,
                    fontFamily: "var(--font-body)",
                  }}
                >
                  Name your workspace and enter your email to get started.
                </p>
              </div>

              {/* Workspace name input — DESIGN.md §5: monospaced, 2px border,
                  focus = 4px primary border */}
              <div className="mb-4">
                <label
                  className="block text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--foreground)",
                    opacity: 0.5,
                  }}
                >
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="My Company"
                  className="w-full px-3 py-2.5 text-xs outline-none transition-all duration-100"
                  style={{
                    fontFamily: "var(--font-mono)",
                    backgroundColor: "var(--input)",
                    border: "2px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                  onFocus={(e) => {
                    /* DESIGN.md §5: Focus = border increases to 4px + primary glow */
                    e.currentTarget.style.border = "4px solid var(--primary)";
                    e.currentTarget.style.padding = "8px 10px";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = "2px solid var(--border)";
                    e.currentTarget.style.padding = "10px 12px";
                  }}
                  autoFocus
                />
              </div>

              {/* Email input */}
              <div className="mb-5">
                <label
                  className="block text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--foreground)",
                    opacity: 0.5,
                  }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
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
                    if (e.key === "Enter") handleSendCode();
                  }}
                />
              </div>

              {/* Primary button — DESIGN.md §5: primary bg, 2px border-strong,
                  4px hard shadow, retracts on active */}
              <button
                onClick={handleSendCode}
                disabled={!email || !workspaceName.trim() || loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground transition-all duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:pointer-events-none"
                style={{
                  fontFamily: "var(--font-mono)",
                  border: "2px solid var(--border-strong)",
                  boxShadow: "var(--hard-shadow)",
                }}
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
                Continue
              </button>

              {/* Link to login */}
              <p
                className="text-center mt-5 text-[10px] font-bold uppercase tracking-[0.15em]"
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
            </>
          )}

          {/* ─── STEP 2: OTP Code Entry ─── */}
          {step === "code_sent" && (
            <>
              <button
                onClick={goBack}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] mb-5 transition-opacity duration-100 hover:opacity-100"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                  opacity: 0.7,
                }}
              >
                <ArrowLeft className="w-3 h-3" />
                Back
              </button>

              <div className="mb-6">
                <h1
                  className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--primary-text)",
                  }}
                >
                  Check Your Email
                </h1>
                <p
                  className="text-sm"
                  style={{
                    color: "var(--foreground)",
                    opacity: 0.6,
                    fontFamily: "var(--font-body)",
                  }}
                >
                  Enter the 6-digit code we sent to{" "}
                  <span className="font-semibold" style={{ opacity: 1 }}>
                    {email}
                  </span>
                </p>
              </div>

              {/* OTP input — DESIGN.md §5: monospaced, 2px border,
                  focus = 4px primary border */}
              <div className="mb-5">
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
                  value={otpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtpCode(val);
                  }}
                  placeholder="000000"
                  inputMode="numeric"
                  maxLength={6}
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
                    if (e.key === "Enter" && otpCode.length === 6) handleVerifyOtp();
                  }}
                  autoFocus
                />
              </div>

              {/* Buttons */}
              <div className="space-y-2.5">
                {/* Verify — primary button with hard shadow */}
                <button
                  onClick={handleVerifyOtp}
                  disabled={otpCode.length !== 6 || loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground transition-all duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:pointer-events-none"
                  style={{
                    fontFamily: "var(--font-mono)",
                    border: "2px solid var(--border-strong)",
                    boxShadow: "var(--hard-shadow)",
                  }}
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  Verify & Create Workspace
                </button>

                {/* Resend — secondary button, no shadow per DESIGN.md §5 */}
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
                  {cooldown > 0 ? `Resend Code (${cooldown}s)` : "Resend Code"}
                </button>
              </div>
            </>
          )}

          {/* ─── STEP 3: Creating Workspace ─── */}
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
                Creating your workspace...
              </p>
            </div>
          )}

          {/* Error message — DESIGN.md §2 semantic colors: #FF453A */}
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

        {/* Footer */}
        <p
          className="text-center mt-6 text-[9px] font-bold uppercase tracking-[0.15em]"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
            opacity: 0.4,
          }}
        >
          MarketForce One &middot; Product Intelligence
        </p>
      </div>
    </div>
  );
}
