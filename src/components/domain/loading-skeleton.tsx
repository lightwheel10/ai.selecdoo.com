import { Skeleton } from "@/components/ui/skeleton";

export function PageHeaderSkeleton() {
  return (
    <div className="mb-6">
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-4 w-72" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div
      className="p-5 border-2"
      style={{
        backgroundColor: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      <Skeleton className="h-3 w-24 mb-3" />
      <Skeleton className="h-9 w-32 mb-1" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div
      className="border-2"
      style={{
        backgroundColor: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-4 px-4 py-3 border-b-2"
        style={{ borderColor: "var(--border)" }}
      >
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border-b"
          style={{ borderColor: "var(--border)" }}
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
