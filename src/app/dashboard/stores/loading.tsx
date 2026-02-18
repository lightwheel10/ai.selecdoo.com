import { Skeleton } from "@/components/ui/skeleton";

export default function StoresLoading() {
  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        {/* Search */}
        <Skeleton className="h-9 flex-1" style={{ maxWidth: 280 }} />
        {/* Count + Add button */}
        <div className="ml-auto flex items-center gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* Table */}
      <div
        className="border-2 overflow-hidden"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center px-4 py-2.5 border-b-2"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--table-header-bg)",
          }}
        >
          <Skeleton className="h-2.5 w-14" style={{ width: "22%" }} />
          <Skeleton className="h-2.5 w-8" style={{ width: "26%" }} />
          <Skeleton className="h-2.5 w-12" style={{ width: "12%" }} />
          <Skeleton className="h-2.5 w-16" style={{ width: "14%" }} />
          <Skeleton className="h-2.5 w-10" style={{ width: "12%" }} />
          <div style={{ width: "14%" }} />
        </div>

        {/* Rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center px-4 py-3"
            style={{
              borderBottom: i < 5 ? "1px solid var(--border)" : "none",
            }}
          >
            {/* Store name: favicon + name */}
            <div className="flex items-center gap-2.5" style={{ width: "22%" }}>
              <Skeleton className="w-7 h-7 flex-shrink-0" />
              <Skeleton className="h-3 w-20" />
            </div>
            {/* URL */}
            <div style={{ width: "26%" }}>
              <Skeleton className="h-2.5 w-3/4" />
            </div>
            {/* Products */}
            <div style={{ width: "12%" }}>
              <Skeleton className="h-3 w-8" />
            </div>
            {/* Last Scraped */}
            <div style={{ width: "14%" }}>
              <Skeleton className="h-2.5 w-16" />
            </div>
            {/* Status */}
            <div style={{ width: "12%" }}>
              <Skeleton className="h-5 w-14" />
            </div>
            {/* Actions */}
            <div className="flex items-center gap-1.5" style={{ width: "14%" }}>
              <Skeleton className="w-7 h-7" />
              <Skeleton className="w-7 h-7" />
              <Skeleton className="w-7 h-7" />
              <Skeleton className="w-7 h-7" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
