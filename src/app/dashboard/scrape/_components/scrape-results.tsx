"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye, Package, Tags, PenSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/domain/status-badge";
import type { Product } from "@/types";

interface ScrapeResultsProps {
  products: Product[];
}

export function ScrapeResults({ products }: ScrapeResultsProps) {
  const t = useTranslations("Scrape");

  return (
    <div>
      <p
        className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3"
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--muted-foreground)",
        }}
      >
        {t("scrapeResults")}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
        {products.map((product) => {
          const hasDiscount =
            product.discount_percentage && product.discount_percentage > 0;

          return (
            <div
              key={product.id}
              className="border-2 flex flex-col"
              style={{
                backgroundColor: "var(--card)",
                borderColor: "var(--border)",
              }}
            >
              {/* Image */}
              <div
                className="relative w-full aspect-square"
                style={{ backgroundColor: "var(--input)" }}
              >
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt={product.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Package
                      className="w-8 h-8"
                      style={{
                        color: "var(--muted-foreground)",
                        opacity: 0.3,
                      }}
                    />
                  </div>
                )}
                {hasDiscount && (
                  <span
                    className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5"
                    style={{
                      fontFamily: "var(--font-mono)",
                      backgroundColor: "rgba(34,197,94,0.9)",
                      color: "#fff",
                    }}
                  >
                    -{product.discount_percentage}%
                  </span>
                )}
                <div className="absolute top-2 right-2">
                  <StatusBadge status={product.stock_status} />
                </div>
              </div>

              {/* Body */}
              <div className="p-3 flex flex-col flex-1">
                {/* Title */}
                <p className="text-[12px] font-semibold line-clamp-2 mb-1">
                  {product.title}
                </p>

                {/* Brand */}
                <p
                  className="text-[9px] font-bold uppercase tracking-[0.15em] mb-3"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  {product.brand || t("noBrand")}
                </p>

                {/* Price */}
                <div
                  className="mt-auto flex items-baseline gap-2 pt-3 mb-3"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <span
                    className="text-sm font-bold"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    ${product.price.toFixed(2)}
                  </span>
                  {hasDiscount && product.original_price && (
                    <span
                      className="text-[10px] line-through"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      ${product.original_price.toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1.5">
                  {/* Ghost — View */}
                  <Link
                    href={`/dashboard/products/${product.id}`}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] border-2 transition-all duration-150 hover:opacity-80"
                    style={{
                      fontFamily: "var(--font-mono)",
                      backgroundColor: "transparent",
                      borderColor: "var(--border)",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    <Eye className="w-3 h-3" />
                    {t("viewProduct")}
                  </Link>
                  {/* Success semantic — Deals */}
                  <button
                    onClick={() => {/* TODO: deal workflow */}}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] transition-all duration-150 hover:opacity-80"
                    style={{
                      fontFamily: "var(--font-mono)",
                      backgroundColor: "#22C55E12",
                      border: "1.5px solid #22C55E40",
                      color: "#22C55E",
                    }}
                  >
                    <Tags className="w-3 h-3" />
                    {t("deals")}
                  </button>
                  {/* Info semantic — Posts */}
                  <button
                    onClick={() => {/* TODO: post workflow */}}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] transition-all duration-150 hover:opacity-80"
                    style={{
                      fontFamily: "var(--font-mono)",
                      backgroundColor: "#5AC8FA12",
                      border: "1.5px solid #5AC8FA40",
                      color: "#5AC8FA",
                    }}
                  >
                    <PenSquare className="w-3 h-3" />
                    {t("posts")}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
