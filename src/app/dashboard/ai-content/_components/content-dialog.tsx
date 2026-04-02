"use client";

import { useState, useEffect, useRef } from "react";
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
  Globe,
  Megaphone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Product, Store, AIGeneratedContent, AIContentType } from "@/types";
import { CopyBtn } from "./copy-btn";
import type { ContentEntry } from "./utils";
import { CONTENT_TYPE_CONFIG } from "./utils";
import { ProductImage } from "@/components/domain/product-image";
import { AI_PROVIDER } from "@/lib/ai-content/config";
import { QUESTION_STEPS, type QuestionOption } from "@/lib/ai-content/prompts";

const TYPE_ICONS: Record<string, typeof Tags> = {
  deal_post: Tags,
  social_post: PenSquare,
  website_text: Globe,
  facebook_ad: Megaphone,
};

interface ContentDialogProps {
  modal: { product: Product; contentType: AIContentType } | null;
  contentMap: Map<string, ContentEntry>;
  isGenerating: boolean;
  isSending: boolean;
  editingContent: string | null;
  editText: string;
  storeMap: Record<string, Store>;
  canGenerateContent: boolean;
  canEditContent: boolean;
  // Claude questionnaire props — sequential: one question at a time.
  // Each answer influences the next question's options.
  isAnalyzing: boolean;
  questionStep: number; // 0 = not started, 1-3 = current step, 4 = all done
  currentQuestion: QuestionOption | null; // the question being shown now
  onAnalyze: (product: Product, contentType: AIContentType, stepIndex?: number) => void;
  onAnswerAndNext: (questionId: string, answer: string) => void;
  onSubmitAnswers: () => void;
  t: (key: string, values?: Record<string, string | number>) => string;
  onClose: () => void;
  onGenerate: (product: Product, contentType: AIContentType) => void;
  onRegenerate: (product: Product, contentType: AIContentType) => void;
  onSendToWebhook: (product: Product, contentType: AIContentType) => void;
  onStartEdit: (contentId: string, text: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (productId: string, contentType: AIContentType, editLang?: "de" | "en") => void;
  onEditTextChange: (text: string) => void;
}

export function ContentDialog({
  modal,
  contentMap,
  isGenerating,
  isSending,
  editingContent,
  editText,
  storeMap,
  canGenerateContent,
  canEditContent,
  isAnalyzing,
  questionStep,
  currentQuestion,
  onAnalyze,
  onAnswerAndNext,
  onSubmitAnswers,
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
  const contentLookup: Record<string, AIGeneratedContent | undefined> = {
    deal_post: entry?.deal,
    social_post: entry?.post,
    website_text: entry?.website,
    facebook_ad: entry?.facebook,
  };
  const currentContent = contentLookup[contentType];

  const hasDiscount =
    modal?.product.discount_percentage &&
    modal.product.discount_percentage > 0;

  const cfg = CONTENT_TYPE_CONFIG[contentType];
  const accentColor = cfg?.color ?? "#22C55E";
  const TypeIcon = TYPE_ICONS[contentType] ?? Tags;
  const typeLabel = cfg ? t(cfg.labelKey) : contentType;

  // Auto-trigger when dialog opens with no existing content.
  // - Claude provider: start the analyze step (fetch question options)
  // - n8n provider: auto-generate directly (existing behavior)
  const autoGenerateRef = useRef<string | null>(null);
  useEffect(() => {
    if (!modal) {
      autoGenerateRef.current = null;
      return;
    }
    const key = `${modal.product.id}:${modal.contentType}`;
    const hasContentLookup: Record<string, boolean | undefined> = {
      deal_post: entry?.hasDeal,
      social_post: entry?.hasPost,
      website_text: entry?.hasWebsite,
      facebook_ad: entry?.hasFacebook,
    };
    const hasContent = hasContentLookup[modal.contentType];
    if (
      canGenerateContent &&
      !hasContent &&
      autoGenerateRef.current !== key
    ) {
      autoGenerateRef.current = key;
      if (AI_PROVIDER === "claude") {
        // Claude path: start analysis to get question options
        if (!isAnalyzing) onAnalyze(modal.product, modal.contentType);
      } else {
        // n8n path: auto-generate directly
        if (!isGenerating) onGenerate(modal.product, modal.contentType);
      }
    }
  }, [modal, entry, isGenerating, isAnalyzing, onGenerate, onAnalyze, canGenerateContent]);

  return (
    <Dialog
      open={modal !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {/* Content dialog — DESIGN.md §5: border-strong + hard-shadow */}
      <DialogContent
        className="p-0 gap-0 sm:max-w-2xl"
        style={{
          border: "2px solid var(--border-strong)",
          boxShadow: "var(--hard-shadow)",
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
                      {new Intl.NumberFormat(undefined, { style: "currency", currency: modal.product.currency || "EUR" }).format(modal.product.price)}
                    </span>
                    {hasDiscount && modal.product.original_price && (
                      <span
                        className="text-[10px] line-through"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {new Intl.NumberFormat(undefined, { style: "currency", currency: modal.product.currency || "EUR" }).format(modal.product.original_price)}
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
                  isSending={isSending}
                  editingContent={editingContent}
                  editText={editText}
                  canGenerateContent={canGenerateContent}
                  canEditContent={canEditContent}
                  t={t}
                  onRegenerate={onRegenerate}
                  onSendToWebhook={onSendToWebhook}
                  onStartEdit={onStartEdit}
                  onCancelEdit={onCancelEdit}
                  onSaveEdit={onSaveEdit}
                  onEditTextChange={onEditTextChange}
                />
              ) : !canGenerateContent ? (
                <NoGenerateAccessView t={t} />
              ) : isGenerating ? (
                <GeneratingView
                  contentType={contentType}
                  t={t}
                  storeName={storeMap[modal.product.store_id]?.name}
                  productTitle={modal.product.title}
                />
              ) : isAnalyzing ? (
                <AnalyzingView
                  contentType={contentType}
                  t={t}
                  step={questionStep}
                  storeName={storeMap[modal.product.store_id]?.name || "Store"}
                  productTitle={modal.product.title}
                />
              ) : currentQuestion || questionStep > QUESTION_STEPS.length ? (
                <QuestionnaireView
                  contentType={contentType}
                  currentQuestion={currentQuestion}
                  questionStep={questionStep}
                  t={t}
                  onAnswerAndNext={onAnswerAndNext}
                  onSubmit={onSubmitAnswers}
                />
              ) : (
                <GenerateFailedView
                  contentType={contentType}
                  product={modal.product}
                  t={t}
                  onRetry={AI_PROVIDER === "claude" ? onAnalyze : onGenerate}
                />
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Format raw n8n response for display ───

const SKIP_KEYS = new Set(["error", "errorMessage", "error_message", "stack", "trace"]);

function formatRawResponse(raw: unknown): string {
  // Unwrap: [{ raw: { ... }, error: "..." }] → inner object
  let obj = raw;
  if (Array.isArray(obj) && obj.length > 0) {
    obj = obj[0]?.raw ?? obj[0];
  }
  if (typeof obj === "string") return obj;
  if (!obj || typeof obj !== "object") return String(obj ?? "");

  const lines: string[] = [];
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SKIP_KEYS.has(key)) continue;
    if (value == null) continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) lines.push(`"${key}": "${trimmed}"`);
    } else if (Array.isArray(value)) {
      const items = value.map((v) => `"${String(v).trim()}"`).filter((v) => v !== '""');
      if (items.length) lines.push(`"${key}":\n${items.join("\n")}`);
    } else if (typeof value === "object") {
      lines.push(`"${key}": "${JSON.stringify(value)}"`);
    } else {
      lines.push(`"${key}": "${String(value)}"`);
    }
  }
  return lines.join("\n\n");
}

// ─── Content View (existing content) ───

function ContentView({
  content,
  product,
  contentType,
  isGenerating,
  isSending,
  editingContent,
  editText,
  canGenerateContent,
  canEditContent,
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
  contentType: AIContentType;
  isGenerating: boolean;
  isSending: boolean;
  editingContent: string | null;
  editText: string;
  canGenerateContent: boolean;
  canEditContent: boolean;
  t: (key: string, values?: Record<string, string | number>) => string;
  onRegenerate: (product: Product, contentType: AIContentType) => void;
  onSendToWebhook: (product: Product, contentType: AIContentType) => void;
  onStartEdit: (contentId: string, text: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (productId: string, contentType: AIContentType, editLang?: "de" | "en") => void;
  onEditTextChange: (text: string) => void;
}) {
  const [viewMode, setViewMode] = useState<"formatted" | "raw">(
    content.webhook_response ? "raw" : "formatted"
  );
  // Language toggle — only available when content_de and content_en are
  // stored separately (Claude provider). Falls back to combined view for
  // n8n-generated content where content_de/content_en are null.
  const hasLanguages = !!content.content_de && !!content.content_en;
  const [lang, setLang] = useState<"de" | "en">("de");
  // The text to display for the currently selected language
  const displayContent = hasLanguages
    ? (lang === "de" ? content.content_de! : content.content_en!)
    : content.content;

  const isEditing = editingContent === content.id;
  const accentColor = CONTENT_TYPE_CONFIG[contentType]?.color ?? "#22C55E";

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
            className="w-full text-[12px] leading-relaxed p-3 border-2 mb-2 resize-y outline-none transition-all duration-100 focus:border-primary"
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
              onClick={() => onSaveEdit(product.id, contentType, hasLanguages ? lang : undefined)}
              disabled={!canEditContent}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] bg-primary text-primary-foreground transition-all duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              style={{
                fontFamily: "var(--font-mono)",
                border: "2px solid var(--border-strong)",
                boxShadow: "var(--hard-shadow)",
              }}
            >
              <Check className="w-3 h-3" />
              {t("save")}
            </button>
            <button
              onClick={onCancelEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-all duration-100 hover:opacity-80"
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
                className="ml-auto flex items-center gap-2"
              >
                {/* DE/EN language toggle — only for Claude-generated content
                    with separate language columns */}
                {hasLanguages && (
                  <span className="flex" style={{ border: "2px solid var(--border)" }}>
                    <button
                      onClick={() => setLang("de")}
                      className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] transition-colors"
                      style={{
                        fontFamily: "var(--font-mono)",
                        backgroundColor: lang === "de" ? "var(--primary-muted)" : "transparent",
                        color: lang === "de" ? "var(--primary-text)" : "var(--muted-foreground)",
                        borderRight: "2px solid var(--border)",
                      }}
                    >
                      DE
                    </button>
                    <button
                      onClick={() => setLang("en")}
                      className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] transition-colors"
                      style={{
                        fontFamily: "var(--font-mono)",
                        backgroundColor: lang === "en" ? "var(--primary-muted)" : "transparent",
                        color: lang === "en" ? "var(--primary-text)" : "var(--muted-foreground)",
                      }}
                    >
                      EN
                    </button>
                  </span>
                )}
                {/* Formatted/Raw toggle — only when webhook_response exists */}
                {!!content.webhook_response && (
                  <span className="flex" style={{ border: "2px solid var(--border)" }}>
                    <button
                      onClick={() => setViewMode("formatted")}
                      className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] transition-colors"
                      style={{
                        fontFamily: "var(--font-mono)",
                        backgroundColor: viewMode === "formatted" ? "var(--primary-muted)" : "transparent",
                        color: viewMode === "formatted" ? "var(--primary-text)" : "var(--muted-foreground)",
                        borderRight: "2px solid var(--border)",
                      }}
                    >
                      {t("viewFormatted")}
                    </button>
                    <button
                      onClick={() => setViewMode("raw")}
                      className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] transition-colors"
                      style={{
                        fontFamily: "var(--font-mono)",
                        backgroundColor: viewMode === "raw" ? "var(--primary-muted)" : "transparent",
                        color: viewMode === "raw" ? "var(--primary-text)" : "var(--muted-foreground)",
                      }}
                    >
                      {t("viewRaw")}
                    </button>
                  </span>
                )}
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.15em]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  {t("chars", {
                    count: viewMode === "raw" && content.webhook_response
                      ? formatRawResponse(content.webhook_response).length
                      : displayContent.length,
                  })}
                </span>
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
              {viewMode === "raw" && content.webhook_response ? (
                <p
                  className="text-[12px] leading-[1.7]"
                  style={{
                    color: "var(--foreground)",
                    opacity: 0.9,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {formatRawResponse(content.webhook_response)}
                </p>
              ) : (
                <p
                  className="text-[12px] leading-[1.7]"
                  style={{
                    color: "var(--foreground)",
                    opacity: 0.9,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {/* Show selected language content, or combined for n8n content */}
                  {displayContent}
                </p>
              )}
            </div>

            {/* Card footer — timestamp */}
            {formattedDate && (
              <div
                className="px-3 py-2"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.15em]"
                  suppressHydrationWarning
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
            {/* Edit — edits the currently selected language (or combined if no languages) */}
            {canEditContent && (
              <button
                onClick={() => onStartEdit(content.id, displayContent)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-all duration-100 hover:opacity-80"
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
            )}

            {/* Copy — copies the currently selected language */}
            <CopyBtn
              text={displayContent}
              label={t("copiedToClipboard")}
              buttonLabel={t("copyContent")}
            />

            {/* Regenerate */}
            {canGenerateContent && (
              <button
                onClick={() => {
                  if (!isGenerating) onRegenerate(product, contentType);
                }}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-all duration-100 hover:opacity-80 disabled:opacity-40 disabled:pointer-events-none"
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
            )}

            {/* Send to webhook */}
            {canGenerateContent && (
              <WebhookButton
                content={content}
                isSending={isSending}
                t={t}
                onSend={() => onSendToWebhook(product, contentType)}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Webhook Button (with state feedback) ───

function WebhookButton({
  content,
  isSending,
  t,
  onSend,
}: {
  content: AIGeneratedContent;
  isSending: boolean;
  t: (key: string, values?: Record<string, string | number>) => string;
  onSend: () => void;
}) {
  const isSent = content.webhook_status === "sent";
  const isFailed = content.webhook_status === "failed";

  // Sent state
  if (isSent && !isSending) {
    const sentDate = content.webhook_sent_at
      ? new Date(content.webhook_sent_at).toLocaleDateString()
      : "";
    return (
      <button
        onClick={onSend}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-100 hover:opacity-80"
        suppressHydrationWarning
        style={{
          fontFamily: "var(--font-mono)",
          backgroundColor: "#22C55E12",
          border: "1.5px solid #22C55E40",
          color: "#22C55E",
        }}
        title={sentDate ? t("webhookSentAt", { date: sentDate }) : undefined}
      >
        <Check className="w-3 h-3" />
        {t("webhookSent")}
      </button>
    );
  }

  // Sending state
  if (isSending) {
    return (
      <button
        disabled
        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] opacity-60 pointer-events-none"
        style={{
          fontFamily: "var(--font-mono)",
          backgroundColor: "#FF9F0A12",
          border: "1.5px solid #FF9F0A40",
          color: "#FF9F0A",
        }}
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        {t("webhookSending")}
      </button>
    );
  }

  // Failed state — show retry
  if (isFailed) {
    return (
      <button
        onClick={onSend}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-100 hover:opacity-80"
        style={{
          fontFamily: "var(--font-mono)",
          backgroundColor: "#FF453A12",
          border: "1.5px solid #FF453A40",
          color: "#FF453A",
        }}
      >
        <Send className="w-3 h-3" />
        {t("webhookRetry")}
      </button>
    );
  }

  // Default state
  return (
    <button
      onClick={onSend}
      className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-100 hover:opacity-80"
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
  );
}

// ─── Generating View (content generation in progress) ───
// Shows animated progress steps during the final content generation call.
// Same cosmetic progress pattern as AnalyzingView.

function GeneratingView({
  contentType,
  t,
  storeName,
  productTitle,
}: {
  contentType: AIContentType;
  t: (key: string, values?: Record<string, string | number>) => string;
  storeName?: string;
  productTitle?: string;
}) {
  const accentColor = CONTENT_TYPE_CONFIG[contentType]?.color ?? "#22C55E";

  // If AI_PROVIDER is claude, show step-by-step progress.
  // For n8n, show the simple spinner (no product/store context available).
  if (AI_PROVIDER !== "claude" || !storeName || !productTitle) {
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

  // Claude provider: animated step-by-step progress
  const truncatedTitle = productTitle && productTitle.length > 30 ? productTitle.slice(0, 30) + "..." : productTitle;
  const progressSteps = [
    t("genProgressData", { name: truncatedTitle }),
    t("genProgressFramework"),
    t("genProgressWritingDe"),
    t("genProgressWritingEn"),
  ];

  return <StepByStepProgress steps={progressSteps} accentColor={accentColor} />;
}

// ─── Shared step-by-step progress component ───
// Used by both AnalyzingView and GeneratingView to show cosmetic
// progress steps that stagger in while the real API call runs.

function StepByStepProgress({
  steps,
  accentColor,
}: {
  steps: string[];
  accentColor: string;
}) {
  const [completedSteps, setCompletedSteps] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setCompletedSteps(0);

    steps.forEach((_, i) => {
      const timer = setTimeout(() => {
        setCompletedSteps((prev) => Math.max(prev, i + 1));
      }, (i + 1) * 1500);
      timersRef.current.push(timer);
    });

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length]);

  return (
    <div className="pt-4">
      <div
        className="py-6 px-5 border-2"
        style={{ borderColor: "var(--border)", borderStyle: "dashed" }}
      >
        <div className="space-y-2.5">
          {steps.map((label, i) => {
            const isDone = i < completedSteps;
            const isActive = i === completedSteps;
            const isVisible = i <= completedSteps;
            if (!isVisible) return null;

            return (
              <div
                key={i}
                className="flex items-center gap-2.5"
                style={{ opacity: isDone ? 0.5 : 1, transition: "opacity 0.3s ease" }}
              >
                {isDone ? (
                  <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={3} style={{ color: accentColor }} />
                ) : isActive ? (
                  <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" style={{ color: accentColor }} />
                ) : null}
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.15em]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: isDone ? "var(--muted-foreground)" : "var(--foreground)",
                  }}
                >
                  {label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Generate Failed View (error / retry) ───

function GenerateFailedView({
  contentType,
  product,
  t,
  onRetry,
}: {
  contentType: AIContentType;
  product: Product;
  t: (key: string, values?: Record<string, string | number>) => string;
  onRetry: (product: Product, contentType: AIContentType) => void;
}) {
  const accentColor = CONTENT_TYPE_CONFIG[contentType]?.color ?? "#22C55E";

  return (
    <div className="pt-4">
      <div
        className="flex flex-col items-center py-10 gap-3 border-2"
        style={{
          borderColor: "var(--border)",
          borderStyle: "dashed",
        }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
          }}
        >
          {t("generateFailed")}
        </p>
        <button
          onClick={() => onRetry(product, contentType)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none hover:opacity-80"
          style={{
            fontFamily: "var(--font-mono)",
            backgroundColor: accentColor,
            border: `2px solid ${accentColor}`,
            color: "#fff",
            boxShadow: "none",  /* dark mode: no shadow; light mode handled by --hard-shadow elsewhere */
          }}
        >
          <RefreshCw className="w-3 h-3" />
          {t("retryGenerate")}
        </button>
      </div>
    </div>
  );
}

function NoGenerateAccessView({
  t,
}: {
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  return (
    <div className="pt-4">
      <div
        className="flex flex-col items-center py-10 gap-3 border-2"
        style={{
          borderColor: "var(--border)",
          borderStyle: "dashed",
        }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
          }}
        >
          {t("noGenerateAccess")}
        </p>
      </div>
    </div>
  );
}

// ─── Analyzing View (Claude: animated step-by-step progress) ───
// Shows cosmetic progress steps while the real API call runs.
// When the API returns, this component unmounts and the question appears.

function AnalyzingView({
  contentType,
  t,
  step,
  storeName,
  productTitle,
}: {
  contentType: AIContentType;
  t: (key: string, values?: Record<string, string | number>) => string;
  step: number;
  storeName: string;
  productTitle: string;
}) {
  const accentColor = CONTENT_TYPE_CONFIG[contentType]?.color ?? "#22C55E";
  const truncatedTitle = productTitle.length > 30 ? productTitle.slice(0, 30) + "..." : productTitle;

  const progressSteps = [
    t("progressStore", { name: storeName }),
    t("progressProduct", { name: truncatedTitle }),
    t("progressAnalyzing"),
    t("progressQuestion", { step }),
  ];

  return <StepByStepProgress steps={progressSteps} accentColor={accentColor} />;
}

// ─── Questionnaire View (Claude: sequential single-question display) ───
// Shows one question at a time. Previously answered questions appear as
// a compact summary above the current question. After the user answers
// the last question, the "Generate Content" button appears.

function QuestionnaireView({
  contentType,
  currentQuestion,
  questionStep,
  t,
  onAnswerAndNext,
  onSubmit,
}: {
  contentType: AIContentType;
  currentQuestion: QuestionOption | null;
  questionStep: number;
  t: (key: string, values?: Record<string, string | number>) => string;
  onAnswerAndNext: (questionId: string, answer: string) => void;
  onSubmit: () => void;
}) {
  const accentColor = CONTENT_TYPE_CONFIG[contentType]?.color ?? "#22C55E";
  const allDone = questionStep > QUESTION_STEPS.length;

  // Track whether custom input is open for the current question.
  // Keyed by question ID so state resets naturally when question changes.
  const currentQId = currentQuestion?.id ?? "";
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const prevQIdRef = useRef(currentQId);
  if (prevQIdRef.current !== currentQId) {
    prevQIdRef.current = currentQId;
    if (customOpen) setCustomOpen(false);
    if (customText) setCustomText("");
  }

  return (
    <div className="pt-4 space-y-3">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{
            fontFamily: "var(--font-mono)",
            color: accentColor,
          }}
        >
          {t("questionnaireTitle")}
        </p>
        <p
          className="text-[10px] font-bold tracking-wider"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
          }}
        >
          {Math.min(questionStep, QUESTION_STEPS.length)}/{QUESTION_STEPS.length}
        </p>
      </div>

      {/* Current question — full interactive view */}
      {currentQuestion && !allDone && (
        <div
          className="p-3"
          style={{
            border: `2px solid ${accentColor}40`,
            backgroundColor: "var(--card)",
          }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2.5"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--foreground)",
            }}
          >
            {currentQuestion.question}
          </p>

          {/* Option pills — clicking one answers and auto-fetches next */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {currentQuestion.options.map((option) => (
              <button
                key={option}
                onClick={() => onAnswerAndNext(currentQuestion.id, option)}
                className="px-2.5 py-1 text-[10px] font-bold tracking-wider transition-all duration-100 hover:opacity-80"
                style={{
                  fontFamily: "var(--font-mono)",
                  backgroundColor: "transparent",
                  color: "var(--muted-foreground)",
                  border: `1.5px solid var(--border)`,
                }}
              >
                {option}
              </button>
            ))}

            {/* Toggle custom input */}
            <button
              onClick={() => setCustomOpen((prev) => !prev)}
              className="px-2.5 py-1 text-[10px] font-bold tracking-wider transition-all duration-100"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: customOpen ? accentColor : "transparent",
                color: customOpen ? "#fff" : "var(--muted-foreground)",
                border: `1.5px solid ${customOpen ? accentColor : "var(--border)"}`,
              }}
            >
              {t("customAnswer")}
            </button>
          </div>

          {/* Custom text input with submit */}
          {customOpen && (
            <div className="flex gap-1.5">
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customText.trim()) {
                    onAnswerAndNext(currentQuestion.id, customText.trim());
                    setCustomText("");
                    setCustomOpen(false);
                  }
                }}
                placeholder={t("customAnswer")}
                autoFocus
                className="flex-1 px-2.5 py-1.5 text-[11px] border-2 outline-none transition-all duration-100 focus:border-current"
                style={{
                  fontFamily: "var(--font-mono)",
                  backgroundColor: "var(--input)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                  borderRadius: 0,
                }}
              />
              <button
                onClick={() => {
                  if (customText.trim()) {
                    onAnswerAndNext(currentQuestion.id, customText.trim());
                    setCustomText("");
                    setCustomOpen(false);
                  }
                }}
                disabled={!customText.trim()}
                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-100 disabled:opacity-40"
                style={{
                  fontFamily: "var(--font-mono)",
                  backgroundColor: accentColor,
                  color: "#fff",
                  border: `2px solid ${accentColor}`,
                }}
              >
                OK
              </button>
            </div>
          )}
        </div>
      )}

      {/* Generate button — only shown after all 3 questions answered */}
      {allDone && (
        <button
          onClick={onSubmit}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          style={{
            fontFamily: "var(--font-mono)",
            backgroundColor: accentColor,
            color: "#fff",
            border: `2px solid ${accentColor}`,
            boxShadow: "var(--hard-shadow)",
          }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          {t("generateContent")}
        </button>
      )}
    </div>
  );
}
