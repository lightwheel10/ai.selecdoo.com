import { TableSkeleton } from "@/components/domain/loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function MonitoringLoading() {
  return (
    <div className="space-y-6">
      {/* Store table skeleton */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-3 w-28" />
        </div>
        <TableSkeleton rows={6} />
      </div>

      {/* Metric cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border-2 px-4 py-3"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-2.5 w-20" />
            </div>
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>

      {/* Timeline skeleton */}
      <div>
        <Skeleton className="h-3 w-28 mb-3" />

        {/* Filter bar skeleton */}
        <div
          className="flex items-center gap-2 px-4 py-3 mb-3 border-2"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-5 w-px" />
          <Skeleton className="h-6 w-14" />
          <Skeleton className="h-6 w-14" />
          <Skeleton className="h-6 w-14" />
        </div>

        {/* Timeline items skeleton */}
        <div
          className="border-2"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-4 px-5 py-4"
              style={{
                borderBottom:
                  i < 4 ? "1px solid var(--border)" : "none",
              }}
            >
              <Skeleton className="h-16 w-16 flex-shrink-0" />
              <div className="flex-1 py-0.5">
                <div className="flex items-center gap-2 mb-1">
                  <Skeleton className="h-4 w-14" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-3.5 w-3/4 mb-1" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
