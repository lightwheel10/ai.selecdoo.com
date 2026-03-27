/**
 * EmptyState — shown when a page/section has no data.
 *
 * DESIGN.md §5: Card uses border-strong + hard-shadow for the
 * neo-brutalist "module" appearance. Icon box uses primary-muted tint.
 *
 * Shared component — used across stores, jobs, products, etc.
 */

import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    /* Card container — border-strong + hard-shadow per DESIGN.md §5 */
    <div
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
      style={{
        backgroundColor: "var(--card)",
        border: "2px solid var(--border-strong)",
        boxShadow: "var(--hard-shadow)",
      }}
    >
      <div
        className="w-12 h-12 flex items-center justify-center mb-4"
        style={{
          border: "2px solid var(--primary-border)",
          backgroundColor: "var(--primary-muted)",
        }}
      >
        <Icon className="w-5 h-5" style={{ color: "var(--primary-text)" }} />
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
        style={{
          color: "var(--muted-foreground)",
          fontFamily: "var(--font-body)",
        }}
      >
        {description}
      </p>
      {action}
    </div>
  );
}
