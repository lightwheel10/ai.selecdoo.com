import { Skeleton } from "@/components/ui/skeleton";

export default function ScrapeLoading() {
  return (
    <div className="space-y-6">
      {/* Form card */}
      <div
        className="border-2 p-6"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        {/* Header */}
        <Skeleton className="h-3 w-24 mb-5" />

        {/* Label */}
        <Skeleton className="h-2.5 w-16 mb-1.5" />

        {/* URL input + button row */}
        <div className="flex items-end gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-36" />
        </div>

        {/* Quick re-scrape divider */}
        <div
          className="mt-5 pt-5"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-2.5 w-16" />
          </div>

          {/* Store chips */}
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-7"
                style={{ width: `${60 + (i % 3) * 20}px` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
