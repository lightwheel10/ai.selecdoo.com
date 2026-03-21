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
 * Design matches the login page exactly (brutalist, monospace labels,
 * 2px borders, hard shadows, grid texture background).
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

    // Verify the OTP code
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

      // Workspace created — redirect to dashboard
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
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      {/* Grid texture — matches login page */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(202,255,4,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(202,255,4,0.02) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 w-full max-w-[400px]">
        {/* Back to home */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 mb-6 text-[10px] font-bold uppercase tracking-[0.15em] transition-opacity hover:opacity-100"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
            opacity: 0.6,
          }}
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Home
        </Link>

        {/* Branding — same as login */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 flex items-center justify-center text-[10px] font-bold"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              MF
            </div>
            <span
              className="text-lg font-bold tracking-tight"
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

        {/* Card */}
        <div
          className="p-6 border-2"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
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
                <p className="text-sm" style={{ color: "var(--foreground)", opacity: 0.6 }}>
                  Name your workspace and enter your email to get started.
                </p>
              </div>

              {/* Workspace name input */}
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
                  className="w-full px-3 py-2.5 text-xs border-2 outline-none transition-colors duration-150 focus:border-primary"
                  style={{
                    backgroundColor: "var(--input)",
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
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
                  className="w-full px-3 py-2.5 text-xs border-2 outline-none transition-colors duration-150 focus:border-primary"
                  style={{
                    backgroundColor: "var(--input)",
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendCode();
                  }}
                />
              </div>

              {/* Submit button */}
              <button
                onClick={handleSendCode}
                disabled={!email || !workspaceName.trim() || loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-2 transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:pointer-events-none bg-primary text-primary-foreground border-primary shadow-[3px_3px_0px] shadow-primary"
                style={{ fontFamily: "var(--font-mono)" }}
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
                  className="transition-colors hover:opacity-80"
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
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] mb-5 transition-opacity hover:opacity-100"
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
                <p className="text-sm" style={{ color: "var(--foreground)", opacity: 0.6 }}>
                  Enter the 6-digit code we sent to{" "}
                  <span className="font-semibold" style={{ opacity: 1 }}>
                    {email}
                  </span>
                </p>
              </div>

              {/* OTP input — same style as login */}
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
                  className="w-full px-3 py-3 text-2xl font-bold text-center border-2 outline-none transition-colors duration-150 focus:border-primary"
                  style={{
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.5em",
                    backgroundColor: "var(--input)",
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && otpCode.length === 6) handleVerifyOtp();
                  }}
                  autoFocus
                />
              </div>

              {/* Buttons */}
              <div className="space-y-2.5">
                <button
                  onClick={handleVerifyOtp}
                  disabled={otpCode.length !== 6 || loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-2 transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:pointer-events-none"
                  style={{
                    fontFamily: "var(--font-mono)",
                    backgroundColor: "var(--primary)",
                    color: "var(--primary-foreground)",
                    borderColor: "var(--primary)",
                    boxShadow: "3px 3px 0px var(--primary)",
                  }}
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  Verify & Create Workspace
                </button>

                <button
                  onClick={handleResend}
                  disabled={cooldown > 0 || loading}
                  className="w-full px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-2 transition-all duration-150 disabled:opacity-30 disabled:pointer-events-none"
                  style={{
                    fontFamily: "var(--font-mono)",
                    backgroundColor: "transparent",
                    color: "var(--muted-foreground)",
                    borderColor: "var(--border)",
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

          {/* Error message — same style as login */}
          {error && (
            <div
              className="mt-4 p-3 text-[10px] font-bold uppercase tracking-wider border-2"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: "rgba(255,69,58,0.08)",
                borderColor: "rgba(255,69,58,0.3)",
                color: "#FF453A",
                borderLeftWidth: "4px",
                borderLeftColor: "#FF453A",
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer — same as login */}
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
