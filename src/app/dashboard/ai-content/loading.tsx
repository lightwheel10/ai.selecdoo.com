import { Skeleton } from "@/components/ui/skeleton";

export default function AIContentLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Card skeletons — match product cards: border-strong + hard-shadow */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="p-5"
          style={{
            backgroundColor: "var(--card)",
            border: "2px solid var(--border-strong)",
            boxShadow: "var(--hard-shadow)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-3 w-full mb-2" />
          <Skeleton className="h-3 w-full mb-2" />
          <Skeleton className="h-3 w-2/3 mb-4" />
          <Skeleton className="h-2.5 w-24" />
        </div>
      ))}
    </div>
  );
}
