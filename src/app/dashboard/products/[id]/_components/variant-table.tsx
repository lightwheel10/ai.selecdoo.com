"use client";

import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/domain/status-badge";
import type { ProductVariant } from "@/types";

interface VariantTableProps {
  variants: ProductVariant[];
  currency: string;
}

export function VariantTable({ variants, currency }: VariantTableProps) {
  const t = useTranslations("ProductDetail");

  const fmt = (value: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "EUR",
    }).format(value);

  if (variants.length === 0) {
    return (
      <div
        className="border-2 py-8 text-center"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
          }}
        >
          {t("noVariants")}
        </p>
      </div>
    );
  }

  return (
    <div
      className="border-2 overflow-auto scrollbar-none"
      style={{
        backgroundColor: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      <Table>
        <TableHeader>
          <TableRow
            className="border-b-2 hover:bg-transparent"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--table-header-bg)",
            }}
          >
            {[t("variant"), t("sku"), t("price"), t("previousPrice"), t("stock")].map(
              (header, i) => (
                <TableHead
                  key={i}
                  className="text-[9px] font-bold uppercase tracking-[0.15em] h-9 text-center"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  {header}
                </TableHead>
              )
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {variants
            .sort((a, b) => a.position - b.position)
            .map((v, i) => (
              <TableRow
                key={i}
                className="border-b hover:bg-[var(--table-header-bg)]"
                style={{ borderColor: "var(--border)" }}
              >
                <TableCell className="text-center">
                  <span
                    className="text-[11px] font-semibold"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {v.title || "—"}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span
                    className="text-[10px] font-bold tracking-wider"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    {v.sku || "—"}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span
                    className="text-[11px] font-bold"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {fmt(v.price)}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  {v.original_price != null ? (
                    <span
                      className="text-[10px] line-through"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {fmt(v.original_price)}
                    </span>
                  ) : (
                    <span
                      className="text-[10px]"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      —
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <StatusBadge
                      status={v.in_stock ? "in_stock" : "out_of_stock"}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
