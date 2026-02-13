import { StatCardSkeleton } from "@/components/domain/loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <>
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Two-column: Recent Jobs + Latest Products */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        {/* Recent Jobs skeleton */}
        <div>
          <Skeleton className="h-3 w-24 mb-3" />
          <div
            className="border-2"
            style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: i < 4 ? "1px solid var(--border)" : "none" }}
              >
                <Skeleton className="h-6 w-6 flex-shrink-0" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-3 w-12 ml-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Latest Products skeleton */}
        <div>
          <Skeleton className="h-3 w-28 mb-3" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="border-2 p-4"
                style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
              >
                <Skeleton className="h-4 w-12 mb-3" />
                <Skeleton className="h-3 w-full mb-1" />
                <Skeleton className="h-3 w-2/3 mb-3" />
                <Skeleton className="h-5 w-16 mb-2" />
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity skeleton */}
      <Skeleton className="h-3 w-28 mb-4" />
      <div
        className="border-2"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: i < 4 ? "1px solid var(--border)" : "none" }}
          >
            <Skeleton className="h-7 w-7" />
            <div className="flex-1">
              <Skeleton className="h-3 w-32 mb-1.5" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    </>
  );
}
