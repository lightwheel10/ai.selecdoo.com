"use client";

import { useTranslations } from "next-intl";

type Status =
  | "active" | "paused" | "error"
  | "in_stock" | "out_of_stock"
  | "pending" | "running" | "completed" | "failed";

const statusToKey: Record<Status, string> = {
  active: "active",
  paused: "paused",
  error: "error",
  in_stock: "inStock",
  out_of_stock: "outOfStock",
  pending: "pending",
  running: "running",
  completed: "completed",
  failed: "failed",
};

const statusColors: Record<Status, { color: string; bg: string; border: string }> = {
  active: { color: "#22C55E", bg: "rgba(34,197,94,0.07)", border: "rgba(34,197,94,0.25)" },
  paused: { color: "#FF9F0A", bg: "rgba(255,159,10,0.07)", border: "rgba(255,159,10,0.25)" },
  error: { color: "#FF453A", bg: "rgba(255,69,58,0.07)", border: "rgba(255,69,58,0.25)" },
  in_stock: { color: "#22C55E", bg: "rgba(34,197,94,0.07)", border: "rgba(34,197,94,0.25)" },
  out_of_stock: { color: "#FF453A", bg: "rgba(255,69,58,0.07)", border: "rgba(255,69,58,0.25)" },
  pending: { color: "#555555", bg: "rgba(85,85,85,0.07)", border: "rgba(85,85,85,0.25)" },
  running: { color: "#0A84FF", bg: "rgba(10,132,255,0.07)", border: "rgba(10,132,255,0.25)" },
  completed: { color: "#22C55E", bg: "rgba(34,197,94,0.07)", border: "rgba(34,197,94,0.25)" },
  failed: { color: "#FF453A", bg: "rgba(255,69,58,0.07)", border: "rgba(255,69,58,0.25)" },
};

interface StatusBadgeProps {
  status: Status;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const t = useTranslations("Status");
  const colors = statusColors[status];

  return (
    <span
      className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"
      style={{
        fontFamily: "var(--font-mono)",
        color: colors.color,
        backgroundColor: colors.bg,
        border: `1.5px solid ${colors.border}`,
      }}
    >
      {t(statusToKey[status])}
    </span>
  );
}
