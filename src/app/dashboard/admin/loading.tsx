import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <>
      {/* Title */}
      <div className="mb-6">
        <Skeleton className="h-3 w-32" />
      </div>

      {/* Tab bar skeleton */}
      <div className="flex gap-4 mb-6">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-28" />
      </div>

      {/* Toolbar skeleton */}
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-8 w-[280px]" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-3 w-20 ml-auto" />
      </div>

      {/* Table skeleton */}
      <div
        className="border-2"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-4 px-4 py-3"
          style={{
            borderBottom: "2px solid var(--border)",
            backgroundColor: "rgba(255,255,255,0.02)",
          }}
        >
          {[120, 100, 90, 60, 50, 40].map((w, i) => (
            <Skeleton key={i} className="h-2.5" style={{ width: w }} />
          ))}
        </div>

        {/* Rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3"
            style={{
              borderBottom:
                i < 7 ? "1px solid var(--border)" : "none",
            }}
          >
            <div className="flex items-center gap-2.5" style={{ width: "20%" }}>
              <Skeleton className="h-7 w-7 flex-shrink-0" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-7 w-7" />
          </div>
        ))}
      </div>
    </>
  );
}
