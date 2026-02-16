"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/domain/status-badge";
import { ImageGallery } from "./image-gallery";
import { VariantTable } from "./variant-table";
import { ProductMetadata } from "./product-metadata";
import type { ProductDetail, RecommendedProduct, Store } from "@/types";

interface ProductDetailViewProps {
  product: ProductDetail;
  store: Store | null;
}

export function ProductDetailView({ product, store }: ProductDetailViewProps) {
  const t = useTranslations("ProductDetail");
  const [copied, setCopied] = useState(false);
  const [descLang, setDescLang] = useState<"de" | "en">(
    product.description_de ? "de" : "en"
  );

  const fmt = (value: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: product.currency || "EUR",
    }).format(value);

  const hasDiscount =
    product.discount_percentage != null && product.discount_percentage > 0;

  function handleCopyLink() {
    if (product.product_url) {
      navigator.clipboard.writeText(product.product_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const descriptionHtml =
    descLang === "de"
      ? product.description_de
      : product.description_en;

  const hasDescription = product.description_de || product.description_en;

  return (
    <div>
      {/* Back link */}
      <Link
        href="/dashboard/products"
        className="inline-flex items-center gap-1.5 mb-6 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:opacity-80"
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--muted-foreground)",
        }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {t("backToProducts")}
      </Link>

      {/* Hero: two-column desktop, single mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Left: Gallery */}
        <ImageGallery
          medias={product.medias}
          mainImage={product.image_url}
          title={product.title}
        />

        {/* Right: Info */}
        <div>
          {/* Store name */}
          <div className="flex items-center gap-1.5 mb-2">
            {store?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={store.logo_url}
                alt={store.name}
                className="w-4 h-4 object-contain"
              />
            )}
            <span
              className="text-[9px] font-bold uppercase tracking-[0.15em]"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--muted-foreground)",
              }}
            >
              {product.store_name || store?.name || "—"}
            </span>
          </div>

          {/* Title */}
          <h1
            className="text-lg font-bold leading-tight mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {product.title}
          </h1>

          {/* Brand / SKU / Condition */}
          <p
            className="text-[10px] font-bold uppercase tracking-[0.15em] mb-4"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            {product.brand || "—"}
            {product.sku && (
              <>
                {" / "}
                {product.sku}
              </>
            )}
            {product.condition && (
              <>
                {" / "}
                {product.condition}
              </>
            )}
          </p>

          {/* Price row */}
          <div
            className="flex items-baseline gap-3 mb-3 pb-3"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <span
              className="text-2xl font-bold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {fmt(product.price)}
            </span>
            {hasDiscount && product.original_price && (
              <>
                <span
                  className="text-sm line-through"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {fmt(product.original_price)}
                </span>
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
              </>
            )}
          </div>

          {/* Stock */}
          <div className="mb-4">
            <StatusBadge
              status={product.in_stock ? "in_stock" : "out_of_stock"}
            />
          </div>

          {/* Categories / Options */}
          {product.product_type && (
            <div className="flex items-baseline gap-2 mb-2">
              <span
                className="text-[9px] font-bold uppercase tracking-[0.15em]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                }}
              >
                {t("categories")}:
              </span>
              <span
                className="text-[11px] font-semibold"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {product.product_type}
              </span>
            </div>
          )}

          {product.options.filter(
            (opt) => opt.name !== "Title" && !opt.values.every((v) => v === "Default Title")
          ).length > 0 && (
            <div className="mb-4">
              {product.options.filter(
                (opt) => opt.name !== "Title" && !opt.values.every((v) => v === "Default Title")
              ).map((opt, i) => (
                <div key={i} className="flex items-baseline gap-2 mb-1">
                  <span
                    className="text-[9px] font-bold uppercase tracking-[0.15em]"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    {t("options")}: {opt.name}
                  </span>
                  <span
                    className="text-[11px]"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--foreground)",
                    }}
                  >
                    {opt.values.join(", ")}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Actions: Visit Store + Copy Link */}
          <div className="flex flex-wrap gap-2 mb-4">
            {product.product_url && (
              <a
                href={product.product_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-all duration-150 hover:opacity-80"
                style={{
                  fontFamily: "var(--font-mono)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {t("visitStore")}
              </a>
            )}
            {product.product_url && (
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-all duration-150 hover:opacity-80"
                style={{
                  fontFamily: "var(--font-mono)",
                  borderColor: "var(--border)",
                  color: "var(--muted-foreground)",
                }}
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-[#22C55E]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copied ? t("linkCopied") : t("copyLink")}
              </button>
            )}
          </div>

          {/* Publish / Featured flags */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span
                className="text-[9px] font-bold uppercase tracking-[0.15em]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                }}
              >
                {t("published")}
              </span>
              <div
                className="w-5 h-5 flex items-center justify-center"
                style={{
                  backgroundColor: product.is_published
                    ? "rgba(34,197,94,0.15)"
                    : "rgba(239,68,68,0.10)",
                  border: `1.5px solid ${product.is_published ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.3)"}`,
                  color: product.is_published ? "#22C55E" : "#EF4444",
                }}
              >
                {product.is_published ? (
                  <Check className="w-2.5 h-2.5" />
                ) : (
                  <X className="w-2.5 h-2.5" />
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="text-[9px] font-bold uppercase tracking-[0.15em]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                }}
              >
                {t("featured")}
              </span>
              <div
                className="w-5 h-5 flex items-center justify-center"
                style={{
                  backgroundColor: product.is_featured
                    ? "rgba(34,197,94,0.15)"
                    : "rgba(239,68,68,0.10)",
                  border: `1.5px solid ${product.is_featured ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.3)"}`,
                  color: product.is_featured ? "#22C55E" : "#EF4444",
                }}
              >
                {product.is_featured ? (
                  <Check className="w-2.5 h-2.5" />
                ) : (
                  <X className="w-2.5 h-2.5" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Variants Section — hide when only variant is Shopify's "Default Title" placeholder */}
      {product.variants.length > 0 &&
        !(product.variants.length === 1 && product.variants[0].title === "Default Title") && (
        <div className="mb-8">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3"
            style={{
              fontFamily: "var(--font-mono)",
              color: "#CAFF04",
            }}
          >
            {t("variants")}
          </p>
          <VariantTable variants={product.variants} currency={product.currency} />
        </div>
      )}

      {/* Description Section */}
      {hasDescription && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.15em]"
              style={{
                fontFamily: "var(--font-mono)",
                color: "#CAFF04",
              }}
            >
              {t("description")}
            </p>

            {/* Language tabs */}
            {product.description_de && product.description_en && (
              <div className="flex gap-1">
                {(["de", "en"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setDescLang(lang)}
                    className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] transition-all duration-150"
                    style={{
                      fontFamily: "var(--font-mono)",
                      backgroundColor:
                        descLang === lang
                          ? "rgba(202,255,4,0.10)"
                          : "transparent",
                      border:
                        descLang === lang
                          ? "1.5px solid rgba(202,255,4,0.3)"
                          : "1.5px solid var(--border)",
                      color:
                        descLang === lang
                          ? "#CAFF04"
                          : "var(--muted-foreground)",
                    }}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div
            className="border-2 p-4"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
            }}
          >
            {descriptionHtml ? (
              <div
                className="prose prose-invert prose-sm max-w-none text-[12px] leading-relaxed [&_*]:!bg-transparent"
                style={{ fontFamily: "var(--font-mono)" }}
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            ) : (
              <p
                className="text-[10px] font-bold uppercase tracking-[0.15em]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                }}
              >
                {t("noDescription")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Metadata Section */}
      <div className="mb-8">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3"
          style={{
            fontFamily: "var(--font-mono)",
            color: "#CAFF04",
          }}
        >
          {t("metadata")}
        </p>
        <ProductMetadata product={product} />
      </div>

      {/* Recommended Products Section */}
      {product.recommend_products.length > 0 && (
        <div className="mb-8">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3"
            style={{
              fontFamily: "var(--font-mono)",
              color: "#CAFF04",
            }}
          >
            {t("recommendedProducts")}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {product.recommend_products.map((rec, i) => (
              <RecommendedProductCard
                key={i}
                product={rec}
                currency={product.currency}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RecommendedProductCard({
  product,
  currency,
}: {
  product: RecommendedProduct;
  currency: string;
}) {
  const fmt = (value: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "EUR",
    }).format(value);

  const content = (
    <div
      className="border-2 overflow-hidden transition-all duration-150 hover:opacity-80"
      style={{
        backgroundColor: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      {product.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.image_url}
          alt={product.title}
          className="w-full aspect-square object-cover"
          style={{ backgroundColor: "var(--muted)" }}
        />
      ) : (
        <div
          className="w-full aspect-square flex items-center justify-center"
          style={{ backgroundColor: "var(--muted)" }}
        >
          <span
            className="text-[9px] font-bold uppercase tracking-[0.15em]"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            No image
          </span>
        </div>
      )}

      <div className="p-2">
        <p
          className="text-[10px] font-semibold leading-tight mb-1 line-clamp-2"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {product.title}
        </p>

        <div className="flex items-center justify-between gap-1">
          <span
            className="text-[11px] font-bold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {fmt(product.price)}
          </span>
          <span
            className="text-[8px] font-bold uppercase px-1 py-0.5"
            style={{
              fontFamily: "var(--font-mono)",
              backgroundColor: product.in_stock
                ? "rgba(34,197,94,0.15)"
                : "rgba(239,68,68,0.10)",
              border: `1px solid ${product.in_stock ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.3)"}`,
              color: product.in_stock ? "#22C55E" : "#EF4444",
            }}
          >
            {product.in_stock ? "In Stock" : "OOS"}
          </span>
        </div>
      </div>
    </div>
  );

  if (product.product_url) {
    return (
      <a
        href={product.product_url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {content}
      </a>
    );
  }

  return content;
}
