interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  subtitle?: string;
}

const changeColors = {
  positive: { color: "#22C55E", bg: "rgba(34,197,94,0.07)", border: "rgba(34,197,94,0.25)" },
  negative: { color: "#FF453A", bg: "rgba(255,69,58,0.07)", border: "rgba(255,69,58,0.25)" },
  neutral: { color: "#555555", bg: "rgba(85,85,85,0.07)", border: "rgba(85,85,85,0.25)" },
};

export function StatCard({ label, value, change, changeType = "neutral", subtitle }: StatCardProps) {
  const c = changeColors[changeType];

  return (
    <div
      className="p-5 border-2"
      style={{
        backgroundColor: "var(--card)",
        borderColor: "var(--border)",
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
      <p
        className="text-3xl font-bold tracking-tight mb-1"
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
