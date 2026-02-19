import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-4">
      {/* Page title */}
      <Skeleton className="h-3 w-20" />

      {/* Tab bar */}
      <div className="flex gap-4">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>

      {/* Team tab content */}
      <div
        className="border-2 p-6"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        {/* Section header */}
        <Skeleton className="h-2.5 w-24 mb-2" />
        <Skeleton className="h-3 w-64 mb-5" />

        {/* Invite form: email + role select + button */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-2 mb-5">
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9 w-40" />
        </div>

        {/* Members subtitle + refresh */}
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>

        {/* Members table */}
        <div
          className="border-2 overflow-hidden"
          style={{
            borderColor: "var(--border)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-4 px-4 py-2.5 border-b-2"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--table-header-bg)",
            }}
          >
            <Skeleton className="h-2.5" style={{ width: "25%" }} />
            <Skeleton className="h-2.5" style={{ width: "12%" }} />
            <Skeleton className="h-2.5" style={{ width: "15%" }} />
            <Skeleton className="h-2.5" style={{ width: "15%" }} />
            <Skeleton className="h-2.5" style={{ width: "15%" }} />
          </div>

          {/* Rows */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3"
              style={{
                borderBottom: i < 3 ? "1px solid var(--border)" : "none",
              }}
            >
              <Skeleton className="h-3 w-36" style={{ width: "25%" }} />
              <Skeleton className="h-5 w-16" style={{ width: "12%" }} />
              <Skeleton className="h-3 w-20" style={{ width: "15%" }} />
              <Skeleton className="h-3 w-20" style={{ width: "15%" }} />
              <Skeleton className="h-3 w-16" style={{ width: "15%" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
