import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-6 border-2 text-center"
      style={{
        backgroundColor: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      <div
        className="w-12 h-12 flex items-center justify-center mb-4 border-2"
        style={{
          borderColor: "rgba(202,255,4,0.2)",
          backgroundColor: "rgba(202,255,4,0.05)",
        }}
      >
        <Icon className="w-5 h-5" style={{ color: "#CAFF04" }} />
      </div>
      <p
        className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--foreground)",
        }}
      >
        {title}
      </p>
      <p
        className="text-sm mb-5 max-w-sm"
        style={{ color: "var(--muted-foreground)" }}
      >
        {description}
      </p>
      {action}
    </div>
  );
}
