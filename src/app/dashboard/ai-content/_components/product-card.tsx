"use client";

import { Tags, PenSquare, ShoppingBag, Trash2, Loader2 } from "lucide-react";
import type { Product, Store } from "@/types";
import type { ContentEntry } from "./utils";
import { Highlight } from "./highlight";
import { ContentStatusBadge } from "./content-status-badge";
import { StatusBadge } from "@/components/domain/status-badge";
import { ProductImage } from "@/components/domain/product-image";

interface ProductCardProps {
  product: Product;
  store: Store | undefined;
  entry: ContentEntry | undefined;
  search: string;
  isSelected: boolean;
  googleStatus: "none" | "sending" | "sent";
  t: (key: string) => string;
  onOpenModal: (product: Product, contentType: "deal_post" | "social_post") => void;
  onToggleSelect: (productId: string) => void;
  onSendToGoogle: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export function ProductCard({
  product,
  store,
  entry,
  search,
  isSelected,
  googleStatus,
  t,
  onOpenModal,
  onToggleSelect,
  onSendToGoogle,
  onDelete,
}: ProductCardProps) {
  const hasDiscount =
    product.discount_percentage && product.discount_percentage > 0;

  return (
    <div
      className="border-2 flex flex-col relative group"
      style={{
        backgroundColor: "var(--card)",
        borderColor: isSelected ? "#CAFF04" : "var(--border)",
      }}
    >
      {/* Checkbox */}
      <label className="absolute top-2 left-2 z-10 cursor-pointer">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(product.id)}
          className="sr-only"
        />
        <div
          className="w-4 h-4 border-2 flex items-center justify-center transition-colors"
          style={{
            backgroundColor: isSelected ? "#CAFF04" : "rgba(0,0,0,0.5)",
            borderColor: isSelected ? "#CAFF04" : "var(--border)",
          }}
        >
          {isSelected && (
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              stroke="#0A0A0A"
              strokeWidth="2"
              strokeLinecap="square"
            >
              <path d="M2 5l2.5 2.5L8 3" />
            </svg>
          )}
        </div>
      </label>

      {/* Delete button (top-right, visible on hover) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(product);
        }}
        className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          backgroundColor: "rgba(255,69,58,0.15)",
          border: "1.5px solid rgba(255,69,58,0.4)",
        }}
        title={t("deleteProduct")}
      >
        <Trash2 className="w-3 h-3" style={{ color: "#FF453A" }} />
      </button>

      {/* Image */}
      <div
        className="relative w-full aspect-square"
        style={{ backgroundColor: "var(--input)" }}
      >
        <ProductImage src={product.image_url} alt={product.title} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" />
        {/* Discount badge */}
        {hasDiscount && (
          <span
            className="absolute bottom-2 left-2 text-[10px] font-bold px-1.5 py-0.5"
            style={{
              fontFamily: "var(--font-mono)",
              backgroundColor: "rgba(34,197,94,0.9)",
              color: "#fff",
            }}
          >
            -{product.discount_percentage}%
          </span>
        )}
        {/* Content status badge */}
        <div className="absolute bottom-2 right-2">
          <ContentStatusBadge
            hasDeal={entry?.hasDeal || false}
            hasPost={entry?.hasPost || false}
            t={t}
          />
        </div>
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col flex-1">
        {/* Store */}
        <div className="flex items-center gap-1.5 mb-2">
          <div
            className="w-4 h-4 flex-shrink-0 flex items-center justify-center text-[7px] font-bold"
            style={{
              fontFamily: "var(--font-mono)",
              backgroundColor: "rgba(202,255,4,0.10)",
              color: "#CAFF04",
            }}
          >
            {store?.name[0] || "?"}
          </div>
          <span
            className="text-[9px] font-bold uppercase tracking-[0.15em]"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            {store?.name || "Unknown"}
          </span>
        </div>

        {/* Title */}
        <p className="text-[12px] font-semibold line-clamp-2 mb-1 min-h-[2.5em]">
          <Highlight text={product.title} query={search} />
        </p>

        {/* Stock status */}
        <div className="mb-3">
          <StatusBadge status={product.stock_status} />
        </div>

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

        {/* Action Buttons */}
        <div className="flex flex-col gap-1.5">
          {/* Row 1: Deal + Post */}
          <div className="flex gap-1.5">
            <button
              onClick={() => onOpenModal(product, "deal_post")}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] transition-all duration-150 hover:opacity-80"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: entry?.hasDeal ? "#22C55E" : "#22C55E12",
                border: entry?.hasDeal
                  ? "1.5px solid #22C55E"
                  : "1.5px solid #22C55E40",
                color: entry?.hasDeal ? "#0A0A0A" : "#22C55E",
              }}
            >
              <Tags className="w-3 h-3" />
              {entry?.hasDeal ? t("viewDeal") : t("generateDeal")}
            </button>

            <button
              onClick={() => onOpenModal(product, "social_post")}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] transition-all duration-150 hover:opacity-80"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: entry?.hasPost ? "#5AC8FA" : "#5AC8FA12",
                border: entry?.hasPost
                  ? "1.5px solid #5AC8FA"
                  : "1.5px solid #5AC8FA40",
                color: entry?.hasPost ? "#0A0A0A" : "#5AC8FA",
              }}
            >
              <PenSquare className="w-3 h-3" />
              {entry?.hasPost ? t("viewPost") : t("generatePost")}
            </button>
          </div>

          {/* Row 2: Product Check (full width) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (googleStatus !== "sending") onSendToGoogle(product);
            }}
            disabled={googleStatus === "sending"}
            className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] transition-all duration-150 hover:opacity-80 disabled:pointer-events-none"
            style={{
              fontFamily: "var(--font-mono)",
              backgroundColor: googleStatus === "sent" ? "#FF9F0A" : "#FF9F0A12",
              border:
                googleStatus === "sent"
                  ? "1.5px solid #FF9F0A"
                  : "1.5px solid #FF9F0A40",
              color: googleStatus === "sent" ? "#0A0A0A" : "#FF9F0A",
            }}
          >
            {googleStatus === "sending" ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <ShoppingBag className="w-3 h-3" />
            )}
            {googleStatus === "sent"
              ? t("sentToGoogle")
              : googleStatus === "sending"
              ? t("sendingToGoogle")
              : t("sendToGoogle")}
          </button>
        </div>
      </div>
    </div>
  );
}
