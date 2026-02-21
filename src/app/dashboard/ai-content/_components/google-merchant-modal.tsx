"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShoppingBag,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Brain,
  Send,
  X,
  ExternalLink,
  CircleAlert,
  TriangleAlert,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductImage } from "@/components/domain/product-image";
import type { Product, Store } from "@/types";

// ─── Types ───

type ModalStage =
  | "idle"
  | "unpublished_warning"
  | "cleaning"
  | "submitting"
  | "success"
  | "error"
  | "already_submitted"
  | "checking_status"
  | "status_result"
  | "clearing";

interface SubmitResultData {
  googleProductId?: string;
  merchantId?: string;
  affiliateLink?: string;
}

interface SubmissionInfo {
  status: string;
  googleProductId: string | null;
  merchantId: string | null;
  errorMessage: string | null;
  submittedAt: string | null;
  lastSyncedAt: string | null;
}

interface StatusCheckResult {
  status: string;
  error?: string;
  approvalDetails?: {
    overallStatus?: string;
    destinationStatuses?: Array<{ destination?: string; status?: string }>;
    itemLevelIssues?: Array<{
      code?: string;
      description?: string;
      detail?: string;
      servability?: string;
      resolution?: string;
      attributeName?: string;
      documentation?: string;
    }>;
  };
}

interface GoogleMerchantModalProps {
  product: Product | null;
  store: Store | undefined;
  existingSubmission: SubmissionInfo | null;
  t: (key: string, values?: Record<string, string | number>) => string;
  onClose: () => void;
  onSubmitComplete: (
    productId: string,
    result: { status: string; errorMessage?: string; googleProductId?: string; merchantId?: string }
  ) => void;
  onClearComplete: (productId: string) => void;
}

// ─── Component ───

export function GoogleMerchantModal({
  product,
  store,
  existingSubmission,
  t,
  onClose,
  onSubmitComplete,
  onClearComplete,
}: GoogleMerchantModalProps) {
  const isOpen = product !== null;
  const [stage, setStage] = useState<ModalStage>("idle");
  const [resultData, setResultData] = useState<SubmitResultData>({});
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [statusResult, setStatusResult] = useState<StatusCheckResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // Reset on product change
  useEffect(() => {
    if (!product) {
      setStage("idle");
      setResultData({});
      setErrorMessage("");
      setStatusResult(null);
      setCopied(false);
      setConfirmClear(false);
      return;
    }

    // If product already has a submission, show that view
    if (existingSubmission) {
      setStage("already_submitted");
    } else if (!product.is_published) {
      // Block submission for unpublished products
      setStage("unpublished_warning");
    } else {
      // Start submission flow
      submitProduct(product.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  const submitProduct = useCallback(async (productId: string) => {
    setStage("cleaning");
    setErrorMessage("");

    // Show "cleaning" for a bit before switching to "submitting"
    const cleaningTimer = setTimeout(() => {
      setStage("submitting");
    }, 1500);

    try {
      const res = await fetch("/api/merchant/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: [productId] }),
      });

      clearTimeout(cleaningTimer);

      const data = await res.json();
      const result = data.results?.[0];

      if (!result) {
        setStage("error");
        setErrorMessage("No response from server");
        onSubmitComplete(productId, { status: "error", errorMessage: "No response" });
        return;
      }

      if (result.error === "already_submitted") {
        setStage("already_submitted");
        setResultData({
          googleProductId: result.googleProductId,
          merchantId: result.merchantId,
        });
        return;
      }

      if (result.success) {
        setStage("success");
        setResultData({
          googleProductId: result.googleProductId,
          merchantId: result.merchantId,
          affiliateLink: result.affiliateLink,
        });
        onSubmitComplete(productId, {
          status: "submitted",
          googleProductId: result.googleProductId,
          merchantId: result.merchantId,
        });
      } else {
        setStage("error");
        setErrorMessage(result.error || "Submission failed");
        onSubmitComplete(productId, {
          status: "error",
          errorMessage: result.error || "Submission failed",
        });
      }
    } catch {
      clearTimeout(cleaningTimer);
      setStage("error");
      setErrorMessage("Network error");
      onSubmitComplete(productId, { status: "error", errorMessage: "Network error" });
    }
  }, [onSubmitComplete]);

  async function handleCheckStatus() {
    if (!product) return;
    setStage("checking_status");

    try {
      const res = await fetch("/api/merchant/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });

      const data = await res.json();
      setStatusResult(data);
      setStage("status_result");

      // Update parent with new status
      if (data.status) {
        onSubmitComplete(product.id, { status: data.status });
      }
    } catch {
      setStage("already_submitted");
    }
  }

  function handleClearClick() {
    if (confirmClear) {
      executeClear();
    } else {
      setConfirmClear(true);
    }
  }

  async function executeClear() {
    if (!product) return;
    setConfirmClear(false);
    setStage("clearing");

    try {
      const res = await fetch("/api/merchant/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });

      if (res.ok) {
        onClearComplete(product.id);
        // Resubmit
        submitProduct(product.id);
      } else {
        setStage("already_submitted");
      }
    } catch {
      setStage("already_submitted");
    }
  }

  function handleRetry() {
    if (!product) return;
    submitProduct(product.id);
  }

  function handleCopyLink(link: string) {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!product) return null;

  const isProcessing = stage === "cleaning" || stage === "submitting";
  const hasDiscount = product.discount_percentage && product.discount_percentage > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="border-2 p-0 gap-0 sm:max-w-lg overflow-hidden"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--card)",
          borderRadius: 0,
        }}
      >
        {/* Header */}
        <DialogTitle className="sr-only">{t("merchantModalTitle")}</DialogTitle>
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "2px solid var(--border)", backgroundColor: "var(--table-header-bg)" }}
        >
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" style={{ color: "#FF9F0A" }} />
            <span
              className="text-[11px] font-bold uppercase tracking-[0.15em]"
              style={{ fontFamily: "var(--font-mono)", color: "var(--foreground)" }}
            >
              {t("merchantModalTitle")}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center transition-opacity hover:opacity-70"
            style={{ color: "var(--muted-foreground)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Product Info Card */}
        <div
          className="flex items-center gap-3 px-5 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div
            className="w-14 h-14 flex-shrink-0 relative border"
            style={{ backgroundColor: "var(--input)", borderColor: "var(--border)" }}
          >
            <ProductImage src={product.image_url} alt={product.title} sizes="56px" iconSize="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold line-clamp-2 leading-tight">
              {product.title}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {store && (
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.15em]"
                  style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                >
                  {store.name}
                </span>
              )}
              <span
                className="text-[11px] font-bold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {new Intl.NumberFormat(undefined, { style: "currency", currency: product.currency || "EUR" }).format(product.price)}
              </span>
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
              {product.brand && (
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.15em] truncate max-w-[80px]"
                  style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                >
                  {product.brand}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content Area — changes based on stage */}
        <div className="px-5 py-4 min-h-[140px]">

          {/* ── PROCESSING STAGE ── */}
          {isProcessing && (
            <div className="flex flex-col items-center justify-center py-6 gap-4">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FF9F0A" }} />
              <div className="text-center">
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.15em]"
                  style={{ fontFamily: "var(--font-mono)", color: "var(--foreground)" }}
                >
                  {stage === "cleaning" ? t("merchantCleaning") : t("merchantSubmitting")}
                </p>
                <p
                  className="text-[10px] mt-1"
                  style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                >
                  {stage === "cleaning" ? t("merchantCleaningDesc") : t("merchantSubmittingDesc")}
                </p>
              </div>

              {/* Progress steps */}
              <div className="flex items-center gap-3 mt-2">
                <StepIndicator
                  icon={<Brain className="w-3 h-3" />}
                  label={t("merchantStepClean")}
                  status={stage === "cleaning" ? "active" : "done"}
                />
                <div className="w-8 h-px" style={{ backgroundColor: "var(--border)" }} />
                <StepIndicator
                  icon={<Send className="w-3 h-3" />}
                  label={t("merchantStepSubmit")}
                  status={stage === "submitting" ? "active" : "pending"}
                />
                <div className="w-8 h-px" style={{ backgroundColor: "var(--border)" }} />
                <StepIndicator
                  icon={<CheckCircle2 className="w-3 h-3" />}
                  label={t("merchantStepDone")}
                  status="pending"
                />
              </div>
            </div>
          )}

          {/* ── UNPUBLISHED WARNING ── */}
          {stage === "unpublished_warning" && (
            <div className="space-y-3">
              <div
                className="flex items-center gap-2 px-3 py-2 border"
                style={{
                  backgroundColor: "rgba(255,159,10,0.08)",
                  borderColor: "rgba(255,159,10,0.3)",
                }}
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#FF9F0A" }} />
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.15em]"
                  style={{ fontFamily: "var(--font-mono)", color: "#FF9F0A" }}
                >
                  {t("merchantUnpublishedTitle")}
                </span>
              </div>
              <p
                className="text-[10px] px-1 leading-relaxed"
                style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
              >
                {t("merchantUnpublishedDesc")}
              </p>
            </div>
          )}

          {/* ── SUCCESS STAGE ── */}
          {stage === "success" && (
            <div className="space-y-3">
              {/* Success banner */}
              <div
                className="flex items-center gap-2 px-3 py-2 border"
                style={{
                  backgroundColor: "rgba(34,197,94,0.08)",
                  borderColor: "rgba(34,197,94,0.3)",
                }}
              >
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#22C55E" }} />
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.15em]"
                  style={{ fontFamily: "var(--font-mono)", color: "#22C55E" }}
                >
                  {t("merchantSuccess")}
                </span>
              </div>

              {/* Details grid */}
              <div className="space-y-2">
                {resultData.merchantId && (
                  <DetailRow label={t("merchantId")} value={resultData.merchantId} />
                )}
                {resultData.googleProductId && (
                  <DetailRow label={t("merchantGoogleId")} value={resultData.googleProductId} />
                )}
                {resultData.affiliateLink && (
                  <div>
                    <p
                      className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1"
                      style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                    >
                      {t("merchantAffiliateUrl")}
                    </p>
                    <div
                      className="flex items-center gap-2 px-2 py-1.5 border"
                      style={{ backgroundColor: "var(--input)", borderColor: "var(--border)" }}
                    >
                      <span
                        className="text-[10px] truncate flex-1"
                        style={{ fontFamily: "var(--font-mono)", color: "var(--foreground)" }}
                      >
                        {resultData.affiliateLink}
                      </span>
                      <button
                        onClick={() => handleCopyLink(resultData.affiliateLink!)}
                        className="flex-shrink-0 w-6 h-6 flex items-center justify-center transition-colors hover:opacity-70"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {copied ? (
                          <Check className="w-3 h-3" style={{ color: "#22C55E" }} />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ERROR STAGE ── */}
          {stage === "error" && (
            <div className="space-y-3">
              <div
                className="flex items-center gap-2 px-3 py-2 border"
                style={{
                  backgroundColor: "rgba(255,69,58,0.08)",
                  borderColor: "rgba(255,69,58,0.3)",
                }}
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#FF453A" }} />
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.15em]"
                  style={{ fontFamily: "var(--font-mono)", color: "#FF453A" }}
                >
                  {t("merchantError")}
                </span>
              </div>
              {errorMessage && (
                <p
                  className="text-[10px] px-1"
                  style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                >
                  {errorMessage}
                </p>
              )}
            </div>
          )}

          {/* ── ALREADY SUBMITTED STAGE ── */}
          {stage === "already_submitted" && existingSubmission && (
            <div className="space-y-3">
              <div
                className="flex items-center gap-2 px-3 py-2 border"
                style={{
                  backgroundColor: "rgba(90,200,250,0.08)",
                  borderColor: "rgba(90,200,250,0.3)",
                }}
              >
                <Info className="w-4 h-4 flex-shrink-0" style={{ color: "#5AC8FA" }} />
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.15em]"
                  style={{ fontFamily: "var(--font-mono)", color: "#5AC8FA" }}
                >
                  {t("merchantAlreadySubmitted")}
                </span>
              </div>

              <div className="space-y-2">
                <DetailRow
                  label={t("merchantStatus")}
                  value={existingSubmission.status}
                  valueColor={
                    existingSubmission.status === "approved" ? "#22C55E"
                    : existingSubmission.status === "disapproved" ? "#FF453A"
                    : existingSubmission.status === "error" ? "#FF453A"
                    : "#FF9F0A"
                  }
                />
                {existingSubmission.googleProductId && (
                  <DetailRow label={t("merchantGoogleId")} value={existingSubmission.googleProductId} />
                )}
                {existingSubmission.merchantId && (
                  <DetailRow label={t("merchantId")} value={existingSubmission.merchantId} />
                )}
                {existingSubmission.submittedAt && (
                  <DetailRow
                    label={t("merchantSubmittedAt")}
                    value={new Date(existingSubmission.submittedAt).toLocaleString()}
                  />
                )}
                {existingSubmission.errorMessage && (
                  <DetailRow
                    label={t("merchantErrorMsg")}
                    value={existingSubmission.errorMessage}
                    valueColor="#FF453A"
                  />
                )}
              </div>
            </div>
          )}

          {/* ── CHECKING STATUS ── */}
          {stage === "checking_status" && (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#5AC8FA" }} />
              <p
                className="text-[10px] font-bold uppercase tracking-[0.15em]"
                style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
              >
                {t("merchantCheckingStatus")}
              </p>
            </div>
          )}

          {/* ── STATUS RESULT ── */}
          {stage === "status_result" && statusResult && (
            <div className="space-y-3">
              {/* Overall status banner */}
              <div
                className="flex items-center gap-2 px-3 py-2 border"
                style={{
                  backgroundColor: statusResult.status === "approved"
                    ? "rgba(34,197,94,0.08)"
                    : statusResult.status === "disapproved"
                    ? "rgba(255,69,58,0.08)"
                    : "rgba(255,159,10,0.08)",
                  borderColor: statusResult.status === "approved"
                    ? "rgba(34,197,94,0.3)"
                    : statusResult.status === "disapproved"
                    ? "rgba(255,69,58,0.3)"
                    : "rgba(255,159,10,0.3)",
                }}
              >
                {statusResult.status === "approved" ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#22C55E" }} />
                ) : statusResult.status === "disapproved" ? (
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#FF453A" }} />
                ) : (
                  <Info className="w-4 h-4 flex-shrink-0" style={{ color: "#FF9F0A" }} />
                )}
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.15em]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: statusResult.status === "approved" ? "#22C55E"
                      : statusResult.status === "disapproved" ? "#FF453A"
                      : "#FF9F0A",
                  }}
                >
                  {t("merchantLiveStatus")}: {statusResult.status.toUpperCase()}
                </span>
              </div>

              {/* Destination statuses table */}
              {statusResult.approvalDetails?.destinationStatuses &&
                statusResult.approvalDetails.destinationStatuses.length > 0 && (
                <div>
                  <p
                    className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1.5"
                    style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                  >
                    {t("merchantDestinations")}
                  </p>
                  <div className="border" style={{ borderColor: "var(--border)" }}>
                    {/* Table header */}
                    <div
                      className="flex items-center px-2 py-1.5"
                      style={{ backgroundColor: "var(--table-header-bg)", borderBottom: "1px solid var(--border)" }}
                    >
                      <span
                        className="flex-1 text-[9px] font-bold uppercase tracking-[0.15em]"
                        style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                      >
                        {t("merchantDestination")}
                      </span>
                      <span
                        className="w-24 text-right text-[9px] font-bold uppercase tracking-[0.15em]"
                        style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                      >
                        {t("merchantDestStatus")}
                      </span>
                    </div>
                    {/* Table rows */}
                    {statusResult.approvalDetails.destinationStatuses.map((dest, i) => {
                      const destStatus = dest.status ?? "unknown";
                      const statusColor =
                        destStatus === "approved" ? "#22C55E"
                        : destStatus === "disapproved" ? "#FF453A"
                        : "#FF9F0A";
                      return (
                        <div
                          key={i}
                          className="flex items-center px-2 py-1.5"
                          style={{
                            borderBottom: i < statusResult.approvalDetails!.destinationStatuses!.length - 1
                              ? "1px solid var(--border)" : undefined,
                          }}
                        >
                          <span
                            className="flex-1 text-[10px] font-semibold"
                            style={{ fontFamily: "var(--font-mono)", color: "var(--foreground)" }}
                          >
                            {dest.destination ?? "—"}
                          </span>
                          <span
                            className="w-24 text-right text-[10px] font-bold uppercase"
                            style={{ fontFamily: "var(--font-mono)", color: statusColor }}
                          >
                            {destStatus}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Issues section */}
              {(() => {
                const issues = statusResult.approvalDetails?.itemLevelIssues ?? [];
                const errorCount = issues.filter((i) => i.servability === "disapproved").length;
                const warningCount = issues.filter((i) => i.servability === "demoted" || i.servability === "unaffected").length;

                return (
                  <div>
                    {/* Issues header with counts */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <p
                        className="text-[9px] font-bold uppercase tracking-[0.15em]"
                        style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                      >
                        {t("merchantIssues")}
                      </p>
                      {errorCount > 0 && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold"
                          style={{
                            fontFamily: "var(--font-mono)",
                            backgroundColor: "rgba(255,69,58,0.15)",
                            color: "#FF453A",
                          }}
                        >
                          <CircleAlert className="w-2.5 h-2.5" />
                          {errorCount} {t("merchantErrors")}
                        </span>
                      )}
                      {warningCount > 0 && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold"
                          style={{
                            fontFamily: "var(--font-mono)",
                            backgroundColor: "rgba(255,159,10,0.15)",
                            color: "#FF9F0A",
                          }}
                        >
                          <TriangleAlert className="w-2.5 h-2.5" />
                          {warningCount} {t("merchantWarnings")}
                        </span>
                      )}
                    </div>

                    {issues.length === 0 ? (
                      <p
                        className="text-[10px] px-1"
                        style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                      >
                        {t("merchantNoIssues")}
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                        {issues.map((issue, i) => {
                          const isError = issue.servability === "disapproved";
                          const isWarning = issue.servability === "demoted" || issue.servability === "unaffected";
                          const severityColor = isError ? "#FF453A" : isWarning ? "#FF9F0A" : "#5AC8FA";
                          const severityBg = isError
                            ? "rgba(255,69,58,0.06)"
                            : isWarning ? "rgba(255,159,10,0.06)"
                            : "rgba(90,200,250,0.06)";

                          return (
                            <div
                              key={i}
                              className="border px-2.5 py-2"
                              style={{
                                backgroundColor: severityBg,
                                borderColor: "var(--border)",
                              }}
                            >
                              {/* Issue header: severity icon + description */}
                              <div className="flex items-start gap-1.5">
                                {isError ? (
                                  <CircleAlert className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: severityColor }} />
                                ) : isWarning ? (
                                  <TriangleAlert className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: severityColor }} />
                                ) : (
                                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: severityColor }} />
                                )}
                                <span
                                  className="text-[10px] font-semibold leading-tight"
                                  style={{ color: "var(--foreground)" }}
                                >
                                  {issue.description}
                                </span>
                              </div>

                              {/* Issue detail text */}
                              {issue.detail && (
                                <p
                                  className="text-[9px] mt-1 ml-[18px]"
                                  style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                                >
                                  {issue.detail}
                                </p>
                              )}

                              {/* Issue metadata row: code + attribute */}
                              {(issue.code || issue.attributeName) && (
                                <div className="flex items-center gap-3 mt-1.5 ml-[18px]">
                                  {issue.code && (
                                    <span
                                      className="text-[8px] font-bold uppercase tracking-[0.1em] px-1 py-0.5"
                                      style={{
                                        fontFamily: "var(--font-mono)",
                                        backgroundColor: "var(--input)",
                                        color: "var(--muted-foreground)",
                                      }}
                                    >
                                      {issue.code}
                                    </span>
                                  )}
                                  {issue.attributeName && (
                                    <span
                                      className="text-[9px]"
                                      style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                                    >
                                      {t("merchantIssueAttribute")}: {issue.attributeName}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Resolution */}
                              {issue.resolution && (
                                <p
                                  className="text-[9px] mt-1.5 ml-[18px]"
                                  style={{ fontFamily: "var(--font-mono)", color: severityColor }}
                                >
                                  {issue.resolution}
                                </p>
                              )}

                              {/* Documentation link */}
                              {issue.documentation && (
                                <a
                                  href={issue.documentation}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 mt-1.5 ml-[18px] text-[9px] hover:underline"
                                  style={{ fontFamily: "var(--font-mono)", color: "#5AC8FA" }}
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                  {t("merchantIssueDocumentation")}
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── CLEARING ── */}
          {stage === "clearing" && (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#FF453A" }} />
              <p
                className="text-[10px] font-bold uppercase tracking-[0.15em]"
                style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
              >
                {t("merchantClearing")}
              </p>
            </div>
          )}
        </div>

        {/* Confirmation banner (shown above footer when confirmClear is true) */}
        {confirmClear && (stage === "already_submitted" || stage === "status_result") && (
          <div
            className="px-5 py-3"
            style={{ borderTop: "1px solid var(--border)", backgroundColor: "rgba(255,69,58,0.04)" }}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#FF453A" }} />
              <div className="flex-1">
                <p
                  className="text-[10px] font-bold"
                  style={{ fontFamily: "var(--font-mono)", color: "#FF453A" }}
                >
                  {t("merchantConfirmClearTitle")}
                </p>
                <p
                  className="text-[9px] mt-0.5"
                  style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                >
                  {t("merchantConfirmClearDesc")}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={executeClear}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] border-2 transition-all duration-150 active:translate-x-[1px] active:translate-y-[1px]"
                    style={{
                      fontFamily: "var(--font-mono)",
                      backgroundColor: "#FF453A",
                      borderColor: "#FF453A",
                      color: "var(--primary-foreground)",
                    }}
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                    {t("merchantConfirmClearAction")}
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] border-2 transition-all duration-150 hover:opacity-80"
                    style={{
                      fontFamily: "var(--font-mono)",
                      backgroundColor: "transparent",
                      borderColor: "var(--border)",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    {t("merchantCancelClear")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div
          className="flex items-center justify-end gap-2 px-5 py-3"
          style={{ borderTop: "2px solid var(--border)" }}
        >
          {/* Error: Retry button */}
          {stage === "error" && (
            <button
              onClick={handleRetry}
              className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-all duration-150 active:translate-x-[1px] active:translate-y-[1px]"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: "#FF9F0A",
                borderColor: "#FF9F0A",
                color: "var(--primary-foreground)",
              }}
            >
              <RefreshCw className="w-3 h-3" />
              {t("googleRetry")}
            </button>
          )}

          {/* Already Submitted: Check Status + Clear & Resubmit */}
          {stage === "already_submitted" && !confirmClear && (
            <>
              <button
                onClick={handleClearClick}
                className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-all duration-150 hover:opacity-80"
                style={{
                  fontFamily: "var(--font-mono)",
                  backgroundColor: "transparent",
                  borderColor: "rgba(255,69,58,0.4)",
                  color: "#FF453A",
                }}
              >
                <Trash2 className="w-3 h-3" />
                {t("merchantClearResubmit")}
              </button>
              <button
                onClick={handleCheckStatus}
                className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-all duration-150 active:translate-x-[1px] active:translate-y-[1px]"
                style={{
                  fontFamily: "var(--font-mono)",
                  backgroundColor: "#5AC8FA",
                  borderColor: "#5AC8FA",
                  color: "var(--primary-foreground)",
                }}
              >
                <RefreshCw className="w-3 h-3" />
                {t("merchantCheckLiveStatus")}
              </button>
            </>
          )}

          {/* Status Result: Clear & Resubmit + Refresh Status + Back */}
          {stage === "status_result" && !confirmClear && (
            <>
              <button
                onClick={handleClearClick}
                className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-all duration-150 hover:opacity-80"
                style={{
                  fontFamily: "var(--font-mono)",
                  backgroundColor: "transparent",
                  borderColor: "rgba(255,69,58,0.4)",
                  color: "#FF453A",
                }}
              >
                <Trash2 className="w-3 h-3" />
                {t("merchantClearResubmit")}
              </button>
              <button
                onClick={handleCheckStatus}
                className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-all duration-150 active:translate-x-[1px] active:translate-y-[1px]"
                style={{
                  fontFamily: "var(--font-mono)",
                  backgroundColor: "#5AC8FA",
                  borderColor: "#5AC8FA",
                  color: "var(--primary-foreground)",
                }}
              >
                <RefreshCw className="w-3 h-3" />
                {t("merchantRefreshStatus")}
              </button>
              <button
                onClick={() => { setStage("already_submitted"); setConfirmClear(false); }}
                className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-all duration-150 hover:opacity-80"
                style={{
                  fontFamily: "var(--font-mono)",
                  backgroundColor: "transparent",
                  borderColor: "var(--border)",
                  color: "var(--muted-foreground)",
                }}
              >
                {t("merchantBack")}
              </button>
            </>
          )}

          {/* Close button (always visible except during processing/clearing/confirming) */}
          {!isProcessing && stage !== "clearing" && stage !== "checking_status" && !confirmClear && (
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-all duration-150 hover:opacity-80"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: "transparent",
                borderColor: "var(--border)",
                color: "var(--muted-foreground)",
              }}
            >
              {t("merchantClose")}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-components ───

function DetailRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span
        className="text-[9px] font-bold uppercase tracking-[0.15em] flex-shrink-0"
        style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
      >
        {label}
      </span>
      <span
        className="text-[10px] font-semibold text-right truncate"
        style={{
          fontFamily: "var(--font-mono)",
          color: valueColor || "var(--foreground)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function StepIndicator({
  icon,
  label,
  status,
}: {
  icon: React.ReactNode;
  label: string;
  status: "pending" | "active" | "done";
}) {
  const color =
    status === "done" ? "#22C55E"
    : status === "active" ? "#FF9F0A"
    : "var(--muted-foreground)";

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-6 h-6 flex items-center justify-center border"
        style={{
          borderColor: color,
          backgroundColor: status === "active" ? "rgba(255,159,10,0.1)" : "transparent",
          color,
        }}
      >
        {status === "done" ? <Check className="w-3 h-3" /> : icon}
      </div>
      <span
        className="text-[8px] font-bold uppercase tracking-[0.1em]"
        style={{ fontFamily: "var(--font-mono)", color }}
      >
        {label}
      </span>
    </div>
  );
}
