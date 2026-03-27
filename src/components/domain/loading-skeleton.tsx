/**
 * Loading skeletons — placeholder UI while data loads.
 *
 * These must visually match the real components they replace
 * (StatCard, tables) so the transition from loading → loaded
 * feels seamless. Border and shadow styles mirror DESIGN.md §5.
 *
 * Shared component — used across dashboard loading states.
 */

import { Skeleton } from "@/components/ui/skeleton";

export function PageHeaderSkeleton() {
  return (
    <div className="mb-6">
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-4 w-72" />
    </div>
  );
}

/* Matches StatCard: border-strong + hard-shadow */
export function StatCardSkeleton() {
  return (
    <div
      className="p-5"
      style={{
        backgroundColor: "var(--card)",
        border: "2px solid var(--border-strong)",
        boxShadow: "var(--hard-shadow)",
      }}
    >
      <Skeleton className="h-3 w-24 mb-3" />
      <Skeleton className="h-9 w-32 mb-1" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

/* Matches table containers: border-strong + hard-shadow on outer,
   soft --border on internal dividers */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div
      style={{
        backgroundColor: "var(--card)",
        border: "2px solid var(--border-strong)",
        boxShadow: "var(--hard-shadow)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-4 px-4 py-3"
        style={{ borderBottom: "2px solid var(--border)" }}
      >
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
      </div>
      {/* Rows — soft border dividers for internal hierarchy */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3"
          style={{ borderBottom: i < rows - 1 ? "1px solid var(--border)" : "none" }}
        >
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="h-7 w-7" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-14" />
        </div>
      ))}
    </div>
  );
}
