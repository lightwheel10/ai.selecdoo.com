/**
 * JobStats — summary stat cards for the jobs page.
 *
 * DESIGN.md §5: Cards use border-strong + hard-shadow.
 * Values use semantic status colors (green/blue/red) — NOT primary.
 * Total uses --foreground for neutral emphasis.
 */

interface JobStatsLabels {
  totalJobs: string;
  completed: string;
  running: string;
  failed: string;
}

interface JobStatsProps {
  total: number;
  completed: number;
  failed: number;
  running: number;
  labels: JobStatsLabels;
}

export function JobStats({ total, completed, failed, running, labels }: JobStatsProps) {
  const stats = [
    { label: labels.totalJobs, value: total, color: "var(--foreground)" },
    { label: labels.completed, value: completed, color: "#22C55E" },
    { label: labels.running, value: running, color: "#5AC8FA" },
    { label: labels.failed, value: failed, color: "#FF453A" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="px-4 py-3"
          style={{
            backgroundColor: "var(--card)",
            border: "2px solid var(--border-strong)",
            boxShadow: "var(--hard-shadow)",
          }}
        >
          <p
            className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            {stat.label}
          </p>
          {/* Value — font-extrabold for extreme scale per DESIGN.md §6 */}
          <p
            className="text-2xl font-extrabold"
            style={{
              fontFamily: "var(--font-display)",
              color: stat.color,
            }}
          >
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
