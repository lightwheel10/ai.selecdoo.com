"use client";

import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div
        className="p-6 border-2 max-w-md w-full"
        style={{
          borderColor: "var(--destructive)",
          backgroundColor: "var(--card)",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4" style={{ color: "var(--destructive)" }} />
          <p
            className="text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--destructive)",
            }}
          >
            Something went wrong
          </p>
        </div>
        <p
          className="text-sm mb-4"
          style={{ color: "var(--muted-foreground)" }}
        >
          {error.message}
        </p>
        {/* Primary button — DESIGN.md §5: border-strong + hard-shadow */}
        <button
          onClick={reset}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground transition-all duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          style={{
            fontFamily: "var(--font-mono)",
            border: "2px solid var(--border-strong)",
            boxShadow: "var(--hard-shadow)",
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
