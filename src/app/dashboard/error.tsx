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
        <button
          onClick={reset}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider border-2 transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none bg-primary text-primary-foreground border-primary shadow-[3px_3px_0px] shadow-primary"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
