"use client";

import { Tags, PenSquare, Globe, Megaphone, ExternalLink, Trash2 } from "lucide-react";
import type { Product, Store, AIContentType } from "@/types";
import type { ContentEntry } from "./utils";
import { CONTENT_TYPE_CONFIG } from "./utils";
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
  t: (key: string) => string;
  canSelect?: boolean;
  canDeleteProduct?: boolean;
  canGenerateContent?: boolean;
  onOpenModal: (product: Product, contentType: AIContentType) => void;
  onToggleSelect: (productId: string) => void;
  onDelete?: (product: Product) => void;
}

export function ProductCard({
  product,
  store,
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
}: ProductCardProps) {
  const hasDiscount =
    product.discount_percentage && product.discount_percentage > 0;

  const contentButtons: {
    type: AIContentType;
    icon: typeof Tags;
    hasContent: boolean;
  }[] = [
    { type: "deal_post", icon: Tags, hasContent: entry?.hasDeal || false },
    { type: "social_post", icon: PenSquare, hasContent: entry?.hasPost || false },
    { type: "website_text", icon: Globe, hasContent: entry?.hasWebsite || false },
    { type: "facebook_ad", icon: Megaphone, hasContent: entry?.hasFacebook || false },
  ];

  return (
    <div
      className="border-2 flex flex-col relative group"
      style={{
        backgroundColor: "var(--card)",
        borderColor: isSelected ? "var(--primary-text)" : "var(--border)",
      }}
    >
      {canSelect && (
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
              backgroundColor: isSelected ? "var(--primary)" : "rgba(0,0,0,0.5)",
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

      {canDeleteProduct && onDelete && (
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
      )}

      {/* Image */}
      <div
        className="relative w-full aspect-square"
        style={{ backgroundColor: "var(--input)" }}
      >
        <ProductImage src={product.image_url} alt={product.title} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" />
        {/* Content status badge */}
        <div className="absolute bottom-2 right-2">
          <ContentStatusBadge
            hasDeal={entry?.hasDeal || false}
            hasPost={entry?.hasPost || false}
            hasWebsite={entry?.hasWebsite || false}
            hasFacebook={entry?.hasFacebook || false}
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
              backgroundColor: "var(--primary-muted)",
              color: "var(--primary-text)",
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
            {new Intl.NumberFormat(undefined, { style: "currency", currency: product.currency || "EUR" }).format(product.price)}
          </span>
          {hasDiscount && product.original_price && (
            <span
              className="text-[10px] line-through"
              style={{ color: "var(--muted-foreground)" }}
            >
              {new Intl.NumberFormat(undefined, { style: "currency", currency: product.currency || "EUR" }).format(product.original_price)}
            </span>
          )}
          {hasDiscount && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: "rgba(34,197,94,0.9)",
                color: "#fff",
              }}
            >
              -{product.discount_percentage}%
            </span>
          )}
        </div>

        {/* Action Buttons — 2x2 grid */}
        <div className="grid grid-cols-2 gap-1.5">

          {contentButtons.map(({ type, icon: Icon, hasContent }) => {
            const cfg = CONTENT_TYPE_CONFIG[type];
            const canOpen = hasContent || canGenerateContent;
            return (
              <button
                key={type}
                onClick={() => onOpenModal(product, type)}
                disabled={!canOpen}
                className="flex items-center justify-center gap-1 px-1.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.1em] transition-all duration-150 hover:opacity-80"
                style={{
                  fontFamily: "var(--font-mono)",
                  backgroundColor: hasContent ? cfg.color : `${cfg.color}12`,
                  border: hasContent
                    ? `1.5px solid ${cfg.color}`
                    : `1.5px solid ${cfg.color}40`,
                  color: hasContent ? "var(--primary-foreground)" : cfg.color,
                  opacity: canOpen ? 1 : 0.45,
                }}
              >
                <Icon className="w-3 h-3 flex-shrink-0" />
                {hasContent ? t(cfg.viewKey) : t(cfg.genKey)}
              </button>
            );
          })}
        </div>

        {/* Visit Product */}
        {product.product_url && (
          <a
            href={product.product_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 w-full flex items-center justify-center gap-1 px-2 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] transition-all duration-150 hover:opacity-80"
            style={{
              fontFamily: "var(--font-mono)",
              backgroundColor: "var(--input)",
              border: "1.5px solid var(--border)",
              color: "var(--muted-foreground)",
            }}
          >
            <ExternalLink className="w-3 h-3" />
            {t("productCheck")}
          </a>
        )}
      </div>
    </div>
  );
}
