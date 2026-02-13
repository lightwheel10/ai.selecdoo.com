import { TableSkeleton } from "@/components/domain/loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function MonitoringLoading() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <div className="xl:col-span-3">
        <Skeleton className="h-3 w-28 mb-3" />
        <TableSkeleton rows={6} />
      </div>
      <div className="xl:col-span-2">
        <Skeleton className="h-3 w-28 mb-3" />
        <div
          className="border-2 p-4"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 mb-4 last:mb-0">
              <Skeleton className="h-6 w-6 flex-shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-3 w-3/4 mb-2" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
