import { TableSkeleton } from "@/components/domain/loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function JobsLoading() {
  return (
    <>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border-2 p-4"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
            }}
          >
            <Skeleton className="h-2.5 w-16 mb-2" />
            <Skeleton className="h-7 w-10" />
          </div>
        ))}
      </div>
      <TableSkeleton rows={8} />
    </>
  );
}
