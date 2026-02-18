"use client";

import { useEffect, useRef } from "react";
import {
  Check,
  X,
  Loader2,
  Sparkles,
  RefreshCw,
  Send,
  Pencil,
  Tags,
  PenSquare,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Product, Store, AIGeneratedContent } from "@/types";
import { CopyBtn } from "./copy-btn";
import type { ContentEntry } from "./utils";
import { ProductImage } from "@/components/domain/product-image";

interface ContentDialogProps {
  modal: { product: Product; contentType: "deal_post" | "social_post" } | null;
  contentMap: Map<string, ContentEntry>;
  isGenerating: boolean;
  editingContent: string | null;
  editText: string;
  storeMap: Record<string, Store>;
  t: (key: string, values?: Record<string, string | number>) => string;
  onClose: () => void;
  onGenerate: (product: Product, contentType: "deal_post" | "social_post") => void;
  onRegenerate: (product: Product, contentType: "deal_post" | "social_post") => void;
  onSendToWebhook: (product: Product, contentType: "deal_post" | "social_post") => void;
  onStartEdit: (contentId: string, text: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (productId: string, contentType: "deal_post" | "social_post") => void;
  onEditTextChange: (text: string) => void;
}

export function ContentDialog({
  modal,
  contentMap,
  isGenerating,
  editingContent,
  editText,
  storeMap,
  t,
  onClose,
  onGenerate,
  onRegenerate,
  onSendToWebhook,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditTextChange,
}: ContentDialogProps) {
  const contentType = modal?.contentType ?? "deal_post";
  const entry = modal ? contentMap.get(modal.product.id) : undefined;
  const currentContent =
    contentType === "deal_post" ? entry?.deal : entry?.post;

  const hasDiscount =
    modal?.product.discount_percentage &&
    modal.product.discount_percentage > 0;

  const accentColor = contentType === "deal_post" ? "#22C55E" : "#5AC8FA";
  const TypeIcon = contentType === "deal_post" ? Tags : PenSquare;
  const typeLabel = contentType === "deal_post" ? t("dealPost") : t("socialPost");

  // Auto-generate when dialog opens with no existing content
  const autoGenerateRef = useRef<string | null>(null);
  useEffect(() => {
    if (!modal) {
      autoGenerateRef.current = null;
      return;
    }
    const key = `${modal.product.id}:${modal.contentType}`;
    const hasContent =
      modal.contentType === "deal_post" ? entry?.hasDeal : entry?.hasPost;
    if (!hasContent && !isGenerating && autoGenerateRef.current !== key) {
      autoGenerateRef.current = key;
      onGenerate(modal.product, modal.contentType);
    }
  }, [modal, entry, isGenerating, onGenerate]);

  return (
    <Dialog
      open={modal !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="border-2 p-0 gap-0 sm:max-w-2xl"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--card)",
          borderRadius: 0,
        }}
      >
        {modal && (
          <>
            {/* ── Product Header ── */}
            <DialogHeader className="p-0">
              <div className="flex gap-4 p-5 pb-4">
                {/* Product Image */}
                <div
                  className="w-20 h-20 flex-shrink-0 relative border-2"
                  style={{
                    backgroundColor: "var(--input)",
                    borderColor: "var(--border)",
                  }}
                >
                  <ProductImage src={modal.product.image_url} alt={modal.product.title} sizes="80px" iconSize="w-6 h-6" />
                  {hasDiscount && (
                    <span
                      className="absolute bottom-0 left-0 right-0 text-center text-[9px] font-bold py-0.5"
                      style={{
                        fontFamily: "var(--font-mono)",
                        backgroundColor: "rgba(34,197,94,0.9)",
                        color: "#fff",
                      }}
                    >
                      -{modal.product.discount_percentage}%
                    </span>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  {/* Store badge */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className="w-4 h-4 flex-shrink-0 flex items-center justify-center text-[7px] font-bold"
                      style={{
                        fontFamily: "var(--font-mono)",
                        backgroundColor: "var(--primary-muted)",
                        color: "var(--primary-text)",
                      }}
                    >
                      {storeMap[modal.product.store_id]?.name[0] || "?"}
                    </div>
                    <span
                      className="text-[9px] font-bold uppercase tracking-[0.15em]"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {storeMap[modal.product.store_id]?.name}
                    </span>
                  </div>

                  <DialogTitle
                    className="text-[13px] font-semibold leading-snug mb-1.5"
                    style={{ color: "var(--foreground)" }}
                  >
                    {modal.product.title}
                  </DialogTitle>

                  {/* Price + Brand row */}
                  <div className="flex items-center gap-2.5">
                    <span
                      className="text-base font-bold"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      ${modal.product.price.toFixed(2)}
                    </span>
                    {hasDiscount && modal.product.original_price && (
                      <span
                        className="text-[10px] line-through"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        ${modal.product.original_price.toFixed(2)}
                      </span>
                    )}
                    {modal.product.brand && (
                      <span
                        className="text-[9px] font-bold uppercase tracking-[0.15em] px-1.5 py-0.5"
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--muted-foreground)",
                          backgroundColor: "var(--subtle-overlay)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {modal.product.brand}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Content Type Label (replaces tabs) ── */}
              <div
                className="flex items-center gap-1.5 px-5 py-2.5"
                style={{
                  borderTop: "1px solid var(--border)",
                  backgroundColor: `${accentColor}08`,
                  borderBottom: `2px solid ${accentColor}`,
                }}
              >
                <TypeIcon className="w-3 h-3" style={{ color: accentColor }} />
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.15em]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: accentColor,
                  }}
                >
                  {typeLabel}
                </span>
              </div>
            </DialogHeader>

            {/* ── Content Area ── */}
            <div className="px-5 pb-5">
              {currentContent ? (
                <ContentView
                  content={currentContent}
                  product={modal.product}
                  contentType={contentType}
                  isGenerating={isGenerating}
                  editingContent={editingContent}
                  editText={editText}
                  t={t}
                  onRegenerate={onRegenerate}
                  onSendToWebhook={onSendToWebhook}
                  onStartEdit={onStartEdit}
                  onCancelEdit={onCancelEdit}
                  onSaveEdit={onSaveEdit}
                  onEditTextChange={onEditTextChange}
                />
              ) : (
                <GeneratingView
                  contentType={contentType}
                  t={t}
                />
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Content View (existing content) ───

function ContentView({
  content,
  product,
  contentType,
  isGenerating,
  editingContent,
  editText,
  t,
  onRegenerate,
  onSendToWebhook,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditTextChange,
}: {
  content: AIGeneratedContent;
  product: Product;
  contentType: "deal_post" | "social_post";
  isGenerating: boolean;
  editingContent: string | null;
  editText: string;
  t: (key: string, values?: Record<string, string | number>) => string;
  onRegenerate: (product: Product, contentType: "deal_post" | "social_post") => void;
  onSendToWebhook: (product: Product, contentType: "deal_post" | "social_post") => void;
  onStartEdit: (contentId: string, text: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (productId: string, contentType: "deal_post" | "social_post") => void;
  onEditTextChange: (text: string) => void;
}) {
  const isEditing = editingContent === content.id;
  const accentColor = contentType === "deal_post" ? "#22C55E" : "#5AC8FA";

  const formattedDate = content.created_at
    ? new Date(content.created_at).toLocaleDateString()
    : "";

  return (
    <div className="pt-4">
      {isEditing ? (
        /* ── Edit Mode ── */
        <>
          <textarea
            value={editText}
            onChange={(e) => onEditTextChange(e.target.value)}
            className="w-full text-[12px] leading-relaxed p-3 border-2 mb-2 resize-y outline-none transition-colors focus:border-primary"
            style={{
              backgroundColor: "var(--input)",
              borderColor: "var(--border)",
              color: "var(--foreground)",
              borderRadius: 0,
              minHeight: 160,
              whiteSpace: "pre-wrap",
            }}
          />
          {/* Char count */}
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-[9px] font-bold uppercase tracking-[0.15em]"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--muted-foreground)",
              }}
            >
              {t("chars", { count: editText.length })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSaveEdit(product.id, contentType)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none bg-primary text-primary-foreground border-primary shadow-[3px_3px_0px] shadow-primary"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              <Check className="w-3 h-3" />
              {t("save")}
            </button>
            <button
              onClick={onCancelEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors hover:opacity-80"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: "transparent",
                borderColor: "var(--border)",
                color: "var(--muted-foreground)",
              }}
            >
              <X className="w-3 h-3" />
              {t("cancel")}
            </button>
          </div>
        </>
      ) : (
        /* ── View Mode ── */
        <>
          {/* Content card */}
          <div
            className="border-2 mb-3"
            style={{ borderColor: "var(--border)" }}
          >
            {/* Card header */}
            <div
              className="flex items-center gap-2 px-3 py-2"
              style={{
                backgroundColor: `${accentColor}08`,
                borderBottom: `1px solid var(--border)`,
              }}
            >
              <Sparkles className="w-3 h-3" style={{ color: accentColor }} />
              <span
                className="text-[9px] font-bold uppercase tracking-[0.15em]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: accentColor,
                }}
              >
                {t("generatedByAi")}
              </span>
              <span
                className="ml-auto text-[9px] font-bold uppercase tracking-[0.15em]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                }}
              >
                {t("chars", { count: content.content.length })}
              </span>
            </div>

            {/* Content body */}
            <div
              className="p-4"
              style={{
                maxHeight: 280,
                overflowY: "auto",
              }}
            >
              <p
                className="text-[12px] leading-[1.7]"
                style={{
                  color: "var(--foreground)",
                  opacity: 0.9,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {content.content}
              </p>
            </div>

            {/* Card footer — timestamp */}
            {formattedDate && (
              <div
                className="px-3 py-2"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.15em]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  {t("generatedAt", { date: formattedDate })}
                </span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Edit */}
            <button
              onClick={() => onStartEdit(content.id, content.content)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors hover:opacity-80"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: "transparent",
                borderColor: "var(--border)",
                color: "var(--muted-foreground)",
              }}
            >
              <Pencil className="w-3 h-3" />
              {t("edit")}
            </button>

            {/* Copy */}
            <CopyBtn
              text={content.content}
              label={t("copiedToClipboard")}
              buttonLabel={t("copyContent")}
            />

            {/* Regenerate */}
            <button
              onClick={() => {
                if (!isGenerating) onRegenerate(product, contentType);
              }}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors hover:opacity-80 disabled:opacity-40 disabled:pointer-events-none"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: "transparent",
                borderColor: "var(--border)",
                color: "var(--muted-foreground)",
              }}
            >
              {isGenerating ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              {isGenerating ? t("generating") : t("regenerate")}
            </button>

            {/* Send to webhook */}
            <button
              onClick={() => onSendToWebhook(product, contentType)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-150 hover:opacity-80"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: "#FF9F0A12",
                border: "1.5px solid #FF9F0A40",
                color: "#FF9F0A",
              }}
            >
              <Send className="w-3 h-3" />
              {t("sendToWebhook")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Generating View (auto-generation in progress) ───

function GeneratingView({
  contentType,
  t,
}: {
  contentType: "deal_post" | "social_post";
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const accentColor = contentType === "deal_post" ? "#22C55E" : "#5AC8FA";

  return (
    <div className="pt-4">
      <div
        className="flex flex-col items-center py-10 gap-3 border-2"
        style={{
          borderColor: "var(--border)",
          borderStyle: "dashed",
        }}
      >
        <Loader2
          className="w-6 h-6 animate-spin"
          style={{ color: accentColor }}
        />
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
          }}
        >
          {t("generating")}
        </p>
      </div>
    </div>
  );
}
