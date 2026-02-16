import { Skeleton } from "@/components/ui/skeleton";

export default function ProductsLoading() {
  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Search input */}
        <Skeleton className="h-9" style={{ minWidth: 220 }} />
        {/* Filter dropdowns */}
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-20" />
        {/* Price range */}
        <div className="flex items-center gap-1">
          <Skeleton className="h-8 w-[70px]" />
          <span
            className="text-[10px] font-bold"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            –
          </span>
          <Skeleton className="h-8 w-[70px]" />
        </div>
        {/* Product count */}
        <Skeleton className="h-3 w-24 ml-auto" />
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="border-2 flex flex-col"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
            }}
          >
            {/* Image placeholder */}
            <Skeleton className="w-full aspect-square rounded-none" />

            {/* Body */}
            <div className="p-4 flex flex-col flex-1">
              {/* Store badge */}
              <div className="flex items-center gap-1.5 mb-2">
                <Skeleton className="w-4 h-4" />
                <Skeleton className="h-2.5 w-16" />
              </div>
              {/* Title */}
              <Skeleton className="h-3 w-full mb-1" />
              <Skeleton className="h-3 w-3/4 mb-1" />
              {/* Brand / SKU */}
              <Skeleton className="h-2.5 w-1/2 mb-3" />
              {/* Price */}
              <div
                className="mt-auto flex items-baseline gap-2 pt-3 mb-3"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
              {/* Action buttons */}
              <div className="flex flex-wrap gap-1.5">
                <Skeleton className="h-7 w-14" />
                <Skeleton className="h-7 w-14" />
                <Skeleton className="h-7 w-14" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
