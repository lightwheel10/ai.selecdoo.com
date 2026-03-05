"use client";

import {
  ChevronDown,
  ChevronRight,
  Tags,
  PenSquare,
  Globe,
  Megaphone,
  Loader2,
} from "lucide-react";
import type { Product, AIContentType } from "@/types";
import type { ContentEntry, StoreGroupData } from "./utils";
import { CONTENT_TYPE_CONFIG } from "./utils";
import { MiniProductCard } from "./mini-product-card";

const BULK_ICONS: Record<string, typeof Tags> = {
  deal_post: Tags,
  social_post: PenSquare,
  website_text: Globe,
  facebook_ad: Megaphone,
};

interface StoreGroupViewProps {
  storeGroups: StoreGroupData[];
  expandedStores: Set<string>;
  contentMap: Map<string, ContentEntry>;
  search: string;
  selectedProducts: Set<string>;
  allowSelection: boolean;
  allowDeleteProduct: boolean;
  allowGenerateContent: boolean;
  bulkGenerating: {
    storeId: string;
    type: AIContentType;
    current: number;
    total: number;
  } | null;
  t: (key: string, values?: Record<string, string | number>) => string;
  onToggleStore: (storeId: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onBulkGenerate: (
    storeId: string,
    products: Product[],
    type: AIContentType
  ) => void;
  onOpenModal: (
    product: Product,
    contentType: AIContentType
  ) => void;
  onToggleSelect: (productId: string) => void;
  onToggleStoreProducts: (productIds: string[]) => void;
  onDeleteProduct?: (product: Product) => void;
}

export function StoreGroupView({
  storeGroups,
  expandedStores,
  contentMap,
  search,
  selectedProducts,
  allowSelection,
  allowDeleteProduct,
  allowGenerateContent,
  bulkGenerating,
  t,
  onToggleStore,
  onExpandAll,
  onCollapseAll,
  onBulkGenerate,
  onOpenModal,
  onToggleSelect,
  onToggleStoreProducts,
  onDeleteProduct,
}: StoreGroupViewProps) {
  return (
    <>
      {/* Expand/Collapse controls */}
      {storeGroups.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={onExpandAll}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:opacity-80"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            <ChevronDown className="w-3 h-3" />
            {t("expandAll")}
          </button>
          <button
            onClick={onCollapseAll}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:opacity-80"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            <ChevronRight className="w-3 h-3" />
            {t("collapseAll")}
          </button>
        </div>
      )}

      {storeGroups.length === 0 ? (
        <div
          className="border-2 py-16 text-center"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          <p
            className="text-[11px] font-bold uppercase tracking-[0.15em]"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            {t("noProducts")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {storeGroups.map((group) => {
            const isExpanded = expandedStores.has(group.store.id);
            const isBulkGen = bulkGenerating?.storeId === group.store.id;

            // Per-store selection
            const storeProductIds = group.products.map((p) => p.id);
            const allStoreSelected =
              storeProductIds.length > 0 &&
              storeProductIds.every((id) => selectedProducts.has(id));

            return (
              <div
                key={group.store.id}
                className="border-2"
                style={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                }}
              >
                {/* ── Store Header ── */}
                <button
                  onClick={() => onToggleStore(group.store.id)}
                  className="w-full text-left px-4 py-3 transition-colors hover:bg-[var(--table-header-bg)]"
                >
                  {/* Row 1: Name + Stats */}
                  <div className="flex items-center gap-3">
                    <ChevronRight
                      className="w-4 h-4 flex-shrink-0 transition-transform duration-150"
                      style={{
                        color: "var(--primary-text)",
                        transform: isExpanded
                          ? "rotate(90deg)"
                          : "rotate(0deg)",
                      }}
                    />

                    {/* Store monogram */}
                    <div
                      className="w-7 h-7 flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                      style={{
                        fontFamily: "var(--font-mono)",
                        backgroundColor: "var(--primary-muted)",
                        color: "var(--primary-text)",
                      }}
                    >
                      {group.store.name[0]}
                    </div>

                    <span className="text-[12px] font-semibold">
                      {group.store.name}
                    </span>

                    {/* Stats pills */}
                    <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                      <StatPill
                        label={t("storeProducts", {
                          count: group.products.length,
                        })}
                        color="var(--muted-foreground)"
                      />
                      <StatPill
                        label={t("storeDeals", {
                          count: group.dealCount,
                        })}
                        color="#22C55E"
                      />
                      <StatPill
                        label={t("storePosts", {
                          count: group.postCount,
                        })}
                        color="#5AC8FA"
                      />
                      {group.avgDiscount > 0 && (
                        <StatPill
                          label={t("storeAvgDiscount", {
                            percent: group.avgDiscount,
                          })}
                          color="var(--muted-foreground)"
                        />
                      )}
                    </div>
                  </div>

                </button>

                {/* ── Expanded Content ── */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid var(--border)" }}>
                    {/* Action bar */}
                    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                      {/* Per-store Select All */}
                      {allowSelection && (
                        <>
                          <label
                            className="flex items-center gap-1.5 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={allStoreSelected}
                              onChange={() =>
                                onToggleStoreProducts(storeProductIds)
                              }
                              className="sr-only"
                            />
                            <div
                              className="w-4 h-4 border-2 flex items-center justify-center transition-colors"
                              style={{
                                backgroundColor: allStoreSelected
                                  ? "var(--primary)"
                                  : "transparent",
                                borderColor: allStoreSelected
                                  ? "var(--primary-text)"
                                  : "var(--border)",
                              }}
                            >
                              {allStoreSelected && (
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
                            <span
                              className="text-[10px] font-bold uppercase tracking-[0.15em]"
                              style={{
                                fontFamily: "var(--font-mono)",
                                color: "var(--muted-foreground)",
                              }}
                            >
                              {t("selectAll")}
                            </span>
                          </label>

                          <div
                            className="w-px h-4 mx-1"
                            style={{
                              backgroundColor: "var(--border)",
                            }}
                          />
                        </>
                      )}

                      {allowGenerateContent &&
                        Object.entries(CONTENT_TYPE_CONFIG).map(([type, cfg]) => {
                          const Icon = BULK_ICONS[type] ?? Tags;
                          const isThisBulk = isBulkGen && bulkGenerating?.type === type;
                          return (
                            <button
                              key={type}
                              onClick={(e) => {
                                e.stopPropagation();
                                onBulkGenerate(
                                  group.store.id,
                                  group.products,
                                  type as AIContentType
                                );
                              }}
                              disabled={!!bulkGenerating}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-150 hover:opacity-80 disabled:opacity-40 disabled:pointer-events-none"
                              style={{
                                fontFamily: "var(--font-mono)",
                                backgroundColor: `${cfg.color}12`,
                                border: `1.5px solid ${cfg.color}40`,
                                color: cfg.color,
                              }}
                            >
                              {isThisBulk ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  {t("generatingAll", {
                                    current: bulkGenerating!.current,
                                    total: bulkGenerating!.total,
                                  })}
                                </>
                              ) : (
                                <>
                                  <Icon className="w-3 h-3" />
                                  {t(cfg.genKey)}
                                </>
                              )}
                            </button>
                          );
                        })}

                    </div>

                    {/* Mini product cards grid */}
                    <div
                      className="grid gap-1.5 p-4 pt-0"
                      style={{
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(360px, 1fr))",
                      }}
                    >
                      {group.products.map((product) => (
                        <MiniProductCard
                          key={product.id}
                          product={product}
                          entry={contentMap.get(product.id)}
                          search={search}
                          isSelected={selectedProducts.has(product.id)}
                          t={t}
                          canSelect={allowSelection}
                          canDeleteProduct={allowDeleteProduct}
                          canGenerateContent={allowGenerateContent}
                          onOpenModal={onOpenModal}
                          onToggleSelect={onToggleSelect}
                          onDelete={onDeleteProduct}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── Stat Pill ───

function StatPill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-[0.15em] px-1.5 py-0.5"
      style={{
        fontFamily: "var(--font-mono)",
        color,
        backgroundColor: "var(--subtle-overlay)",
      }}
    >
      {label}
    </span>
  );
}
