"use client";

import {
  Tags,
  PenSquare,
  ShoppingBag,
  Trash2,
  Loader2,
} from "lucide-react";
import type { Product } from "@/types";
import type { ContentEntry } from "./utils";
import { Highlight } from "./highlight";
import { ProductImage } from "@/components/domain/product-image";

interface MiniProductCardProps {
  product: Product;
  entry: ContentEntry | undefined;
  search: string;
  isSelected: boolean;
  googleStatus: "none" | "sending" | "sent";
  t: (key: string) => string;
  canSelect?: boolean;
  canDeleteProduct?: boolean;
  canGenerateContent?: boolean;
  onOpenModal: (
    product: Product,
    contentType: "deal_post" | "social_post"
  ) => void;
  onToggleSelect: (productId: string) => void;
  onSendToGoogle: (product: Product) => void;
  onDelete?: (product: Product) => void;
}

export function MiniProductCard({
  product,
  entry,
  search,
  isSelected,
  googleStatus,
  t,
  canSelect = true,
  canDeleteProduct = false,
  canGenerateContent = true,
  onOpenModal,
  onToggleSelect,
  onSendToGoogle,
  onDelete,
}: MiniProductCardProps) {
  const hasDiscount =
    product.discount_percentage && product.discount_percentage > 0;

  const canOpenDeal = Boolean(entry?.hasDeal) || canGenerateContent;
  const canOpenPost = Boolean(entry?.hasPost) || canGenerateContent;

  return (
    <div
      className="flex items-center gap-3 px-3 py-2 border-2 group transition-colors"
      style={{
        backgroundColor: isSelected ? "var(--primary-muted)" : "var(--card)",
        borderColor: isSelected ? "var(--primary-text)" : "var(--border)",
      }}
    >
      {canSelect && (
        <label className="flex-shrink-0 cursor-pointer">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(product.id)}
            className="sr-only"
          />
          <div
            className="w-4 h-4 border-2 flex items-center justify-center transition-colors"
            style={{
              backgroundColor: isSelected ? "var(--primary)" : "transparent",
              borderColor: isSelected ? "var(--primary-text)" : "var(--border)",
            }}
          >
            {isSelected && (
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                stroke="var(--primary-foreground)"
                strokeWidth="2"
                strokeLinecap="square"
              >
                <path d="M2 5l2.5 2.5L8 3" />
              </svg>
            )}
          </div>
        </label>
      )}

      {/* Thumbnail */}
      <div
        className="w-12 h-12 flex-shrink-0 relative border"
        style={{
          backgroundColor: "var(--input)",
          borderColor: "var(--border)",
        }}
      >
        <ProductImage src={product.image_url} alt={product.title} sizes="48px" iconSize="w-4 h-4" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold truncate leading-tight">
          <Highlight text={product.title} query={search} />
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {product.brand && (
            <span
              className="text-[9px] font-bold uppercase tracking-[0.15em] truncate max-w-[100px]"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--muted-foreground)",
              }}
            >
              {product.brand}
            </span>
          )}
          <span
            className="text-[11px] font-bold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {new Intl.NumberFormat(undefined, { style: "currency", currency: product.currency || "EUR" }).format(product.price)}
          </span>
          {hasDiscount && product.original_price && (
            <span
              className="text-[9px] line-through"
              style={{ color: "var(--muted-foreground)" }}
            >
              {new Intl.NumberFormat(undefined, { style: "currency", currency: product.currency || "EUR" }).format(product.original_price)}
            </span>
          )}
          {hasDiscount && (
            <span
              className="text-[9px] font-bold px-1 py-0.5"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: "rgba(34,197,94,0.15)",
                color: "#22C55E",
              }}
            >
              -{product.discount_percentage}%
            </span>
          )}
        </div>
      </div>

      {/* Action icon buttons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Deal */}
        <button
          onClick={() => onOpenModal(product, "deal_post")}
          disabled={!canOpenDeal}
          className="w-7 h-7 flex items-center justify-center transition-all duration-150 hover:opacity-80"
          style={{
            backgroundColor: entry?.hasDeal ? "#22C55E" : "#22C55E12",
            border: entry?.hasDeal
              ? "1.5px solid #22C55E"
              : "1.5px solid #22C55E40",
            color: entry?.hasDeal ? "var(--primary-foreground)" : "#22C55E",
            opacity: canOpenDeal ? 1 : 0.45,
          }}
          title={entry?.hasDeal ? t("viewDeal") : t("generateDeal")}
        >
          <Tags className="w-3 h-3" />
        </button>

        {/* Post */}
        <button
          onClick={() => onOpenModal(product, "social_post")}
          disabled={!canOpenPost}
          className="w-7 h-7 flex items-center justify-center transition-all duration-150 hover:opacity-80"
          style={{
            backgroundColor: entry?.hasPost ? "#5AC8FA" : "#5AC8FA12",
            border: entry?.hasPost
              ? "1.5px solid #5AC8FA"
              : "1.5px solid #5AC8FA40",
            color: entry?.hasPost ? "var(--primary-foreground)" : "#5AC8FA",
            opacity: canOpenPost ? 1 : 0.45,
          }}
          title={entry?.hasPost ? t("viewPost") : t("generatePost")}
        >
          <PenSquare className="w-3 h-3" />
        </button>

        {/* Google Merchant */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (googleStatus !== "sending") onSendToGoogle(product);
          }}
          disabled={googleStatus === "sending"}
          className="w-7 h-7 flex items-center justify-center transition-all duration-150 hover:opacity-80 disabled:pointer-events-none"
          style={{
            backgroundColor:
              googleStatus === "sent" ? "#FF9F0A" : "#FF9F0A12",
            border:
              googleStatus === "sent"
                ? "1.5px solid #FF9F0A"
                : "1.5px solid #FF9F0A40",
            color: googleStatus === "sent" ? "var(--primary-foreground)" : "#FF9F0A",
          }}
          title={
            googleStatus === "sent"
              ? t("sentToGoogle")
              : googleStatus === "sending"
              ? t("sendingToGoogle")
              : t("sendToGoogle")
          }
        >
          {googleStatus === "sending" ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <ShoppingBag className="w-3 h-3" />
          )}
        </button>

        {canDeleteProduct && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(product);
            }}
            className="w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              backgroundColor: "rgba(255,69,58,0.15)",
              border: "1.5px solid rgba(255,69,58,0.4)",
            }}
            title={t("deleteProduct")}
          >
            <Trash2 className="w-3 h-3" style={{ color: "#FF453A" }} />
          </button>
        )}
      </div>
    </div>
  );
}
