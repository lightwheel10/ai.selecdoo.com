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
    { label: labels.running, value: running, color: "#0A84FF" },
    { label: labels.failed, value: failed, color: "#FF453A" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="border-2 px-4 py-3"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
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
          <p
            className="text-2xl font-bold"
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
