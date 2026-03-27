/**
 * StatCard — dashboard KPI display.
 *
 * DESIGN.md §4/§5: Uses border-strong + hard-shadow for the
 * "stacked module" feel. Change badges use semantic status colors
 * (green/red/neutral) — NOT primary-tinted.
 *
 * Shared component — used on dashboard overview and potentially
 * other pages. Changes here affect all consumers.
 */

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  subtitle?: string;
}

/* Semantic colors for delta indicators — intentionally NOT
   using --primary. Green = good, red = bad, neutral = unchanged. */
const changeColors = {
  positive: { color: "#22C55E", bg: "rgba(34,197,94,0.07)", border: "rgba(34,197,94,0.25)" },
  negative: { color: "#FF453A", bg: "rgba(255,69,58,0.07)", border: "rgba(255,69,58,0.25)" },
  neutral: { color: "var(--muted-foreground)", bg: "var(--status-neutral-bg)", border: "var(--status-neutral-border)" },
};

export function StatCard({ label, value, change, changeType = "neutral", subtitle }: StatCardProps) {
  const c = changeColors[changeType];

  return (
    /* Card uses border-strong (not soft --border) for the neo-brutalist
       "module" appearance per DESIGN.md §5. Hard shadow creates depth. */
    <div
      className="p-5"
      style={{
        backgroundColor: "var(--card)",
        border: "2px solid var(--border-strong)",
        boxShadow: "var(--hard-shadow)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
          }}
        >
          {label}
        </p>
        {change && (
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"
            style={{
              fontFamily: "var(--font-mono)",
              color: c.color,
              backgroundColor: c.bg,
              border: `1.5px solid ${c.border}`,
            }}
          >
            {change}
          </span>
        )}
      </div>
      {/* Value — extreme scale per DESIGN.md §6: large display font */}
      <p
        className="text-3xl font-extrabold tracking-tight mb-1"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
      {subtitle && (
        <p
          className="text-[11px] font-bold"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
