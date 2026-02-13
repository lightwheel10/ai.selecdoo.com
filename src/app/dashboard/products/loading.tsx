import { Skeleton } from "@/components/ui/skeleton";

export default function ProductsLoading() {
  return (
    <>
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="border-2 p-4"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
            }}
          >
            <Skeleton className="h-4 w-3/4 mb-3" />
            <Skeleton className="h-3 w-1/2 mb-4" />
            <div className="flex justify-between">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-5 w-14" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
