"use client";

import { CONTENT_TYPE_CONFIG, ACTIVE_CONTENT_TYPES } from "./utils";

const TOTAL_TYPES = ACTIVE_CONTENT_TYPES.length;

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
  const allFlags: Record<string, boolean> = {
    deal_post: hasDeal, social_post: hasPost, website_text: hasWebsite, facebook_ad: hasFacebook,
  };
  const count = ACTIVE_CONTENT_TYPES.filter((t) => allFlags[t]).length;

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
