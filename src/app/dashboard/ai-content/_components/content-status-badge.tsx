"use client";

export function ContentStatusBadge({
  hasDeal,
  hasPost,
  t,
}: {
  hasDeal: boolean;
  hasPost: boolean;
  t: (key: string) => string;
}) {
  if (hasDeal && hasPost) {
    return (
      <span
        className="text-[8px] font-bold uppercase tracking-[0.15em] px-1.5 py-0.5"
        style={{
          fontFamily: "var(--font-mono)",
          color: "#22C55E",
          backgroundColor: "#22C55E12",
          border: "1.5px solid #22C55E40",
        }}
      >
        {t("complete")}
      </span>
    );
  }
  if (hasDeal) {
    return (
      <span
        className="text-[8px] font-bold uppercase tracking-[0.15em] px-1.5 py-0.5"
        style={{
          fontFamily: "var(--font-mono)",
          color: "#FF9F0A",
          backgroundColor: "#FF9F0A12",
          border: "1.5px solid #FF9F0A40",
        }}
      >
        {t("dealsOnly")}
      </span>
    );
  }
  if (hasPost) {
    return (
      <span
        className="text-[8px] font-bold uppercase tracking-[0.15em] px-1.5 py-0.5"
        style={{
          fontFamily: "var(--font-mono)",
          color: "#5AC8FA",
          backgroundColor: "#5AC8FA12",
          border: "1.5px solid #5AC8FA40",
        }}
      >
        {t("postsOnly")}
      </span>
    );
  }
  return (
    <span
      className="text-[8px] font-bold uppercase tracking-[0.15em] px-1.5 py-0.5"
      style={{
        fontFamily: "var(--font-mono)",
        color: "var(--muted-foreground)",
        backgroundColor: "var(--subtle-overlay)",
        border: "1.5px solid var(--border)",
      }}
    >
      {t("noContent")}
    </span>
  );
}
