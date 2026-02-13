"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

export function CopyBtn({
  text,
  label,
  buttonLabel,
}: {
  text: string;
  label: string;
  buttonLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast(label);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors hover:opacity-80"
      style={{
        fontFamily: "var(--font-mono)",
        backgroundColor: "transparent",
        borderColor: "var(--border)",
        color: "var(--muted-foreground)",
      }}
    >
      {copied ? (
        <Check className="w-3 h-3" style={{ color: "#22C55E" }} />
      ) : (
        <Copy className="w-3 h-3" />
      )}
      {buttonLabel}
    </button>
  );
}
