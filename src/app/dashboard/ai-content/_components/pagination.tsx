"use client";

import { ChevronsLeft, ChevronsRight } from "lucide-react";

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="w-7 h-7 flex items-center justify-center border-2 transition-colors disabled:opacity-30"
        style={{
          borderColor: "var(--border)",
          color: "var(--muted-foreground)",
        }}
      >
        <ChevronsLeft className="w-3 h-3" />
      </button>
      {pages.map((page, i) =>
        page === "..." ? (
          <span
            key={`e${i}`}
            className="w-7 h-7 flex items-center justify-center text-[10px] font-bold"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className="w-7 h-7 flex items-center justify-center text-[10px] font-bold border-2 transition-colors"
            style={{
              fontFamily: "var(--font-mono)",
              backgroundColor:
                currentPage === page ? "rgba(202,255,4,0.06)" : "transparent",
              borderColor:
                currentPage === page
                  ? "rgba(202,255,4,0.3)"
                  : "var(--border)",
              color:
                currentPage === page ? "#CAFF04" : "var(--muted-foreground)",
            }}
          >
            {page}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="w-7 h-7 flex items-center justify-center border-2 transition-colors disabled:opacity-30"
        style={{
          borderColor: "var(--border)",
          color: "var(--muted-foreground)",
        }}
      >
        <ChevronsRight className="w-3 h-3" />
      </button>
    </div>
  );
}
