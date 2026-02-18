"use client";

import { useTranslations } from "next-intl";
import type { ProductDetail } from "@/types";

interface ProductMetadataProps {
  product: ProductDetail;
}

function MetaRow({
  label,
  value,
  na,
}: {
  label: string;
  value: string | null | undefined;
  na: string;
}) {
  return (
    <div className="flex items-baseline justify-between py-1.5">
      <span
        className="text-[9px] font-bold uppercase tracking-[0.15em]"
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--muted-foreground)",
        }}
      >
        {label}
      </span>
      <span
        className="text-[11px] font-semibold text-right max-w-[60%] truncate"
        suppressHydrationWarning
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {value || na}
      </span>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[9px] font-bold uppercase tracking-[0.15em] mt-4 mb-1 pb-1"
      style={{
        fontFamily: "var(--font-mono)",
        color: "var(--primary-text)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {children}
    </p>
  );
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ProductMetadata({ product }: ProductMetadataProps) {
  const t = useTranslations("ProductDetail");
  const na = t("na");

  const hasSource =
    product.source_retailer ||
    product.source_language ||
    product.source_created_at ||
    product.source_updated_at;

  const hasIdentifiers =
    product.hash_id || product.handle || product.gtin || product.mpn;

  const hasAI = product.ai_category || product.ai_cleaned_at;

  const hasCoupon = product.coupon_code || product.coupon_value;

  return (
    <div
      className="border-2 p-4"
      style={{
        backgroundColor: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      {/* Source */}
      {hasSource && (
        <>
          <SectionHeader>{t("source")}</SectionHeader>
          <MetaRow label={t("retailer")} value={product.source_retailer} na={na} />
          <MetaRow label={t("language")} value={product.source_language?.toUpperCase()} na={na} />
          <MetaRow label={t("sourceCreated")} value={formatDate(product.source_created_at)} na={na} />
          <MetaRow label={t("sourceUpdated")} value={formatDate(product.source_updated_at)} na={na} />
        </>
      )}

      {/* Identifiers */}
      {hasIdentifiers && (
        <>
          <SectionHeader>{t("identifiers")}</SectionHeader>
          <MetaRow label={t("hashId")} value={product.hash_id} na={na} />
          <MetaRow label={t("handle")} value={product.handle} na={na} />
          <MetaRow label={t("gtin")} value={product.gtin} na={na} />
          <MetaRow label={t("mpn")} value={product.mpn} na={na} />
        </>
      )}

      {/* AI Data */}
      {hasAI && (
        <>
          <SectionHeader>{t("aiData")}</SectionHeader>
          <MetaRow label={t("aiCategory")} value={product.ai_category} na={na} />
          <MetaRow label={t("aiCleanedAt")} value={formatDate(product.ai_cleaned_at)} na={na} />
        </>
      )}

      {/* Coupon */}
      {hasCoupon && (
        <>
          <SectionHeader>{t("coupon")}</SectionHeader>
          <MetaRow label={t("couponCode")} value={product.coupon_code} na={na} />
          <MetaRow label={t("couponValue")} value={product.coupon_value} na={na} />
        </>
      )}

      {/* Audit */}
      <SectionHeader>{t("audit")}</SectionHeader>
      <MetaRow label={t("createdAt")} value={formatDate(product.created_at)} na={na} />
      <MetaRow label={t("updatedAt")} value={formatDate(product.updated_at)} na={na} />
    </div>
  );
}
