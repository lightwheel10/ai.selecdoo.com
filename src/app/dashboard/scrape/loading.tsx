import { Skeleton } from "@/components/ui/skeleton";

export default function ScrapeLoading() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <div
          className="border-2 p-6"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          <Skeleton className="h-3 w-24 mb-6" />
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <div className="lg:col-span-2">
        <Skeleton className="h-3 w-20 mb-4" />
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
              className="flex items-center gap-4 px-4 py-3"
              style={{
                borderBottom: i < 4 ? "1px solid var(--border)" : "none",
              }}
            >
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
