"use client";

import { CONTENT_TYPE_CONFIG } from "./utils";

const TOTAL_TYPES = Object.keys(CONTENT_TYPE_CONFIG).length;

export function ContentStatusBadge({
  hasDeal,
  hasPost,
  hasWebsite = false,
  hasFacebook = false,
  t,
}: {
  hasDeal: boolean;
  hasPost: boolean;
  hasWebsite?: boolean;
  hasFacebook?: boolean;
  t: (key: string) => string;
}) {
  const count = [hasDeal, hasPost, hasWebsite, hasFacebook].filter(Boolean).length;

  if (count === 0) {
    return (
      <Badge color="var(--muted-foreground)" bg="var(--subtle-overlay)" border="var(--border)">
        {t("noContent")}
      </Badge>
    );
  }

  if (count === TOTAL_TYPES) {
    return (
      <Badge color="#22C55E" bg="#22C55E12" border="#22C55E40">
        {t("complete")}
      </Badge>
    );
  }

  // Partial — show count
  return (
    <Badge color="#FF9F0A" bg="#FF9F0A12" border="#FF9F0A40">
      {count}/{TOTAL_TYPES}
    </Badge>
  );
}

function Badge({
  color,
  bg,
  border,
  children,
}: {
  color: string;
  bg: string;
  border: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className="text-[8px] font-bold uppercase tracking-[0.15em] px-1.5 py-0.5"
      style={{
        fontFamily: "var(--font-mono)",
        color,
        backgroundColor: bg,
        border: `1.5px solid ${border}`,
      }}
    >
      {children}
    </span>
  );
}
