"use client";

import Link from "next/link";
import {
  Tags,
  PenSquare,
  Globe,
  Megaphone,
  Eye,
  Trash2,
} from "lucide-react";
import type { Product, AIContentType } from "@/types";
import type { ContentEntry } from "./utils";
import { CONTENT_TYPE_CONFIG, ACTIVE_CONTENT_TYPES } from "./utils";
import { Highlight } from "./highlight";
import { ProductImage } from "@/components/domain/product-image";

const TYPE_ICONS: Record<string, typeof Tags> = {
  deal_post: Tags,
  social_post: PenSquare,
  website_text: Globe,
  facebook_ad: Megaphone,
};

interface MiniProductCardProps {
  product: Product;
  entry: ContentEntry | undefined;
  search: string;
  isSelected: boolean;
  t: (key: string) => string;
  canSelect?: boolean;
  canDeleteProduct?: boolean;
  canGenerateContent?: boolean;
  onOpenModal: (
    product: Product,
    contentType: AIContentType
  ) => void;
  onToggleSelect: (productId: string) => void;
  onDelete?: (product: Product) => void;
}

export function MiniProductCard({
  product,
  entry,
  search,
  isSelected,
  t,
  canSelect = true,
  canDeleteProduct = false,
  canGenerateContent = true,
  onOpenModal,
  onToggleSelect,
  onDelete,
}: MiniProductCardProps) {
  const hasDiscount =
    product.discount_percentage && product.discount_percentage > 0;

  const hasContentMap: Record<string, boolean> = {
    deal_post: entry?.hasDeal || false,
    social_post: entry?.hasPost || false,
    website_text: entry?.hasWebsite || false,
    facebook_ad: entry?.hasFacebook || false,
  };
  const contentButtons = ACTIVE_CONTENT_TYPES.map((type) => ({
    type: type as AIContentType,
    hasContent: hasContentMap[type] ?? false,
  }));

  return (
    <div
      className="flex items-center gap-3 px-3 py-2 border-2 group transition-all duration-100"
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
        {contentButtons.map(({ type, hasContent }) => {
          const cfg = CONTENT_TYPE_CONFIG[type];
          const Icon = TYPE_ICONS[type] ?? Tags;
          const canOpen = hasContent || canGenerateContent;
          return (
            <button
              key={type}
              onClick={() => onOpenModal(product, type)}
              disabled={!canOpen}
              className="w-7 h-7 flex items-center justify-center transition-all duration-100 hover:opacity-80"
              style={{
                backgroundColor: hasContent ? cfg.color : `${cfg.color}12`,
                border: hasContent
                  ? `1.5px solid ${cfg.color}`
                  : `1.5px solid ${cfg.color}40`,
                color: hasContent ? "var(--primary-foreground)" : cfg.color,
                opacity: canOpen ? 1 : 0.45,
              }}
              title={hasContent ? t(cfg.viewKey) : t(cfg.genKey)}
            >
              <Icon className="w-3 h-3" />
            </button>
          );
        })}

        {/* Product Check — navigates to internal detail page.
           External store link is available on the detail page itself
           (product-detail.tsx "Visit Store" button). */}
        <Link
          href={`/dashboard/products/${product.id}`}
          className="w-7 h-7 flex items-center justify-center transition-all duration-100 hover:opacity-80"
          style={{
            backgroundColor: "var(--input)",
            border: "1.5px solid var(--border)",
            color: "var(--muted-foreground)",
          }}
          title={t("productCheck")}
          onClick={(e) => e.stopPropagation()}
        >
          <Eye className="w-3 h-3" />
        </Link>

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
