import { Skeleton } from "@/components/ui/skeleton";

export default function JobsLoading() {
  return (
    <>
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border-2 px-4 py-3"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
            }}
          >
            <Skeleton className="h-2 w-16 mb-2" />
            <Skeleton className="h-7 w-10" />
          </div>
        ))}
      </div>

      {/* Table card */}
      <div
        className="border-2"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        {/* Search bar + count */}
        <div
          className="flex items-center justify-between gap-4 px-4 py-3"
          style={{ borderBottom: "2px solid var(--border)" }}
        >
          <Skeleton className="h-2.5 w-28" />
          <Skeleton className="h-8 w-48" />
        </div>

        {/* Table header */}
        <div
          className="flex items-center px-4 h-10"
          style={{
            borderBottom: "2px solid var(--border)",
            backgroundColor: "rgba(255,255,255,0.02)",
          }}
        >
          <div style={{ width: "15%" }}>
            <Skeleton className="h-2 w-10" />
          </div>
          <div style={{ width: "10%" }}>
            <Skeleton className="h-2 w-10" />
          </div>
          <div style={{ width: "12%" }}>
            <Skeleton className="h-2 w-16" />
          </div>
          <div style={{ width: "12%" }}>
            <Skeleton className="h-2 w-12" />
          </div>
          <div style={{ width: "14%" }}>
            <Skeleton className="h-2 w-12" />
          </div>
          <div style={{ width: "10%" }}>
            <Skeleton className="h-2 w-12" />
          </div>
          <div style={{ width: "12%" }}>
            <Skeleton className="h-2 w-8" />
          </div>
          <div style={{ width: "15%" }}>
            <Skeleton className="h-2 w-12" />
          </div>
        </div>

        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center px-4 py-3"
            style={{
              borderBottom: i < 7 ? "1px solid var(--border)" : "none",
            }}
          >
            {/* Store: favicon + name */}
            <div
              className="flex items-center gap-2"
              style={{ width: "15%" }}
            >
              <Skeleton className="w-7 h-7 flex-shrink-0" />
              <Skeleton className="h-2.5 w-16" />
            </div>
            {/* Status */}
            <div style={{ width: "10%" }}>
              <Skeleton className="h-5 w-16" />
            </div>
            {/* Products Found */}
            <div style={{ width: "12%" }}>
              <Skeleton className="h-3 w-8" />
            </div>
            {/* Updated */}
            <div style={{ width: "12%" }}>
              <Skeleton className="h-3 w-6" />
            </div>
            {/* Started */}
            <div style={{ width: "14%" }}>
              <Skeleton className="h-2.5 w-20" />
            </div>
            {/* Duration */}
            <div style={{ width: "10%" }}>
              <Skeleton className="h-2.5 w-12" />
            </div>
            {/* Error */}
            <div style={{ width: "12%" }}>
              <Skeleton className="h-2.5 w-4" />
            </div>
            {/* Actions: View + Delete buttons */}
            <div
              className="flex items-center gap-1.5"
              style={{ width: "15%" }}
            >
              <Skeleton className="h-6 w-14" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
