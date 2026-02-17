"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail, ArrowLeft, Zap, KeyRound, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

type Step = "idle" | "otp_sent" | "magic_link_sent";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Check for error from magic link callback
  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError === "verification_failed") {
      setError("Verification failed. Please try again.");
    }
  }, [searchParams]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSendOtp = useCallback(async () => {
    if (!email) return;
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setStep("otp_sent");
      setCooldown(60);
    }
  }, [email, supabase.auth]);

  const handleSendMagicLink = useCallback(async () => {
    if (!email) return;
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
      setStep("magic_link_sent");
      setCooldown(60);
    }
  }, [email, supabase.auth]);

  const handleVerifyOtp = useCallback(async () => {
    if (!otpCode || otpCode.length !== 6) return;
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: "email",
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      router.push("/dashboard");
    }
  }, [email, otpCode, supabase.auth, router]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0) return;
    setError(null);
    setLoading(true);

    const options =
      step === "magic_link_sent"
        ? {
            shouldCreateUser: true,
            emailRedirectTo: `${window.location.origin}/auth/confirm`,
          }
        : { shouldCreateUser: true };

    const { error } = await supabase.auth.signInWithOtp({ email, options });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setCooldown(60);
    }
  }, [cooldown, step, email, supabase.auth]);

  const goBack = () => {
    setStep("idle");
    setOtpCode("");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      {/* Grid texture */}
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

        {/* Branding */}
        <div className="mb-8">
          <div className="flex items-center mb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 flex items-center justify-center text-[11px] font-bold"
                style={{
                  fontFamily: "var(--font-mono)",
                  backgroundColor: "#CAFF04",
                color: "#0A0A0A",
              }}
            >
              S
            </div>
            <span
              className="text-lg font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Selecdoo
            </span>
            </div>
          </div>
          <p
            className="text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            Shopify Product Intelligence
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
          {/* ─── IDLE: Email Entry ─── */}
          {step === "idle" && (
            <>
              <div className="mb-6">
                <h1
                  className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  Sign In
                </h1>
                <p className="text-sm" style={{ color: "var(--foreground)", opacity: 0.6 }}>
                  Enter your email to continue. Choose OTP or magic link.
                </p>
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
                    if (e.key === "Enter") handleSendOtp();
                  }}
                  autoFocus
                />
              </div>

              {/* Buttons */}
              <div className="space-y-2.5">
                <button
                  onClick={handleSendOtp}
                  disabled={!email || loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-2 transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:pointer-events-none bg-primary text-primary-foreground border-primary shadow-[3px_3px_0px] shadow-primary"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="w-3.5 h-3.5" />
                  )}
                  Send OTP
                </button>

                <button
                  onClick={handleSendMagicLink}
                  disabled={!email || loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-2 transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none"
                  style={{
                    fontFamily: "var(--font-mono)",
                    backgroundColor: "transparent",
                    color: "var(--foreground)",
                    opacity: 0.7,
                    borderColor: "var(--border)",
                  }}
                >
                  <Mail className="w-3.5 h-3.5" />
                  Send Magic Link
                </button>

                {/* TODO: Remove dev bypass once Supabase dashboard access is granted */}
                {process.env.NODE_ENV === "development" && (
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-2 transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                    style={{
                      fontFamily: "var(--font-mono)",
                      backgroundColor: "rgba(255,69,58,0.08)",
                      color: "#FF453A",
                      borderColor: "rgba(255,69,58,0.3)",
                    }}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Dev Skip
                  </button>
                )}
              </div>
            </>
          )}

          {/* ─── OTP SENT: Code Entry ─── */}
          {step === "otp_sent" && (
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
                    color: "#CAFF04",
                  }}
                >
                  Check Your Email
                </h1>
                <p className="text-sm" style={{ color: "var(--foreground)", opacity: 0.6 }}>
                  We sent a 6-digit code to{" "}
                  <span className="font-semibold" style={{ opacity: 1 }}>
                    {email}
                  </span>
                </p>
              </div>

              {/* OTP input */}
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
                    backgroundColor: "#CAFF04",
                    color: "#0A0A0A",
                    borderColor: "#CAFF04",
                    boxShadow: "3px 3px 0px #CAFF04",
                  }}
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  Verify Code
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

          {/* ─── MAGIC LINK SENT: Check Email ─── */}
          {step === "magic_link_sent" && (
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

              <div className="flex flex-col items-center text-center py-4">
                <div
                  className="w-14 h-14 flex items-center justify-center mb-5 border-2"
                  style={{
                    backgroundColor: "rgba(202,255,4,0.08)",
                    borderColor: "rgba(202,255,4,0.2)",
                  }}
                >
                  <Mail className="w-6 h-6" style={{ color: "#CAFF04" }} />
                </div>

                <h1
                  className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "#CAFF04",
                  }}
                >
                  Check Your Email
                </h1>
                <p
                  className="text-sm mb-1"
                  style={{ color: "var(--foreground)", opacity: 0.6 }}
                >
                  We sent a magic link to
                </p>
                <p className="text-sm font-semibold mb-5">{email}</p>
                <p
                  className="text-[10px] mb-6"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  Click the link in the email to sign in.
                </p>

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
                  {cooldown > 0 ? `Resend Link (${cooldown}s)` : "Resend Link"}
                </button>
              </div>
            </>
          )}

          {/* Error message */}
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

        {/* Footer */}
        <p
          className="text-center mt-6 text-[9px] font-bold uppercase tracking-[0.15em]"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
            opacity: 0.4,
          }}
        >
          Selecdoo &middot; Product Intelligence
        </p>
      </div>
    </div>
  );
}
