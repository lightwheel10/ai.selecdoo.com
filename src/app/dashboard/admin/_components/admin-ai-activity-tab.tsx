"use client";

import { useState, useMemo } from "react";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Sparkles,
  X,
  Check,
  ChevronDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { AIActivityLog, AICleanStatus, Store } from "@/types";

// ─── Simple Filter ───

function SimpleFilter({
  label,
  resetLabel,
  options,
  value,
  onChange,
}: {
  label: string;
  resetLabel: string;
  options: { label: string; value: string }[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeLabel = options.find((o) => o.value === value)?.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          suppressHydrationWarning
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors"
          style={{
            fontFamily: "var(--font-mono)",
            backgroundColor: value ? "var(--primary-muted)" : "transparent",
            borderColor: value ? "var(--primary-muted)" : "var(--border)",
            color: value ? "var(--primary-text)" : "var(--muted-foreground)",
          }}
        >
          {activeLabel || label}
          <ChevronDown className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="p-1 border-2 w-[180px]"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--card)", borderRadius: 0 }}
      >
        {value && (
          <button
            onClick={() => { onChange(null); setOpen(false); }}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-[var(--subtle-overlay)]"
            style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
          >
            <X className="w-3 h-3 opacity-50" />
            {resetLabel}
          </button>
        )}
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => { onChange(option.value === value ? null : option.value); setOpen(false); }}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-[var(--subtle-overlay)]"
            style={{ fontFamily: "var(--font-mono)", borderRadius: 0 }}
          >
            {value === option.value ? (
              <Check className="w-3 h-3" style={{ color: "var(--primary-text)" }} />
            ) : (
              <span className="w-3" />
            )}
            {option.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ─── Status config ───

const statusConfig: Record<AICleanStatus, { icon: typeof CheckCircle; color: string }> = {
  success: { icon: CheckCircle, color: "#22C55E" },
  error: { icon: XCircle, color: "#FF453A" },
  skipped: { icon: AlertTriangle, color: "#FF9F0A" },
};

// ─── Relative Time ───

function formatRelativeTime(timestamp: string) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── AI Activity Tab ───

interface AdminAIActivityTabProps {
  activityLogs: AIActivityLog[];
  stores: Store[];
}

const PAGE_SIZE = 10;

export function AdminAIActivityTab({ activityLogs, stores }: AdminAIActivityTabProps) {
  const t = useTranslations("Admin");

  const [showCleanDialog, setShowCleanDialog] = useState(false);
  const [cleanScope, setCleanScope] = useState<"descriptions" | "categories" | "full">("descriptions");
  const [cleanStore, setCleanStore] = useState<string | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const storeOptions = useMemo(
    () => stores.map((s) => ({ label: s.name, value: s.id })),
    [stores]
  );

  const visibleLogs = activityLogs.slice(0, visibleCount);
  const remaining = activityLogs.length - visibleCount;

  function handleClean() {
    setIsCleaning(true);
    setTimeout(() => {
      setIsCleaning(false);
      setShowCleanDialog(false);
      toast(t("cleanComplete"), {
        description: t("cleanCompleteDescription", { count: 42 }),
      });
    }, 2000);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
        >
          {t("aiActivityTitle")}
        </p>
        <button
          onClick={() => setShowCleanDialog(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:opacity-80"
          style={{
            fontFamily: "var(--font-mono)",
            backgroundColor: "var(--primary)",
            color: "#000",
            borderRadius: 0,
          }}
        >
          <Sparkles className="w-3 h-3" />
          {t("cleanData")}
        </button>
      </div>

      {/* Timeline */}
      {activityLogs.length === 0 ? (
        <div
          className="border-2 py-16 text-center"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <p
            className="text-[11px] font-bold uppercase tracking-[0.15em]"
            style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
          >
            {t("noActivity")}
          </p>
        </div>
      ) : (
        <div
          className="border-2"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          {visibleLogs.map((log, i) => {
            const config = statusConfig[log.status];
            const Icon = config.icon;

            return (
              <div
                key={log.id}
                className="flex items-start gap-3 px-4 py-3"
                style={{
                  borderBottom:
                    i < visibleLogs.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                {/* Status Icon */}
                <div
                  className="w-7 h-7 flex-shrink-0 flex items-center justify-center mt-0.5"
                  style={{
                    backgroundColor: `${config.color}12`,
                    border: `1.5px solid ${config.color}40`,
                  }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-semibold">
                      {log.store_name}
                    </span>
                    {log.product_title && (
                      <>
                        <span
                          className="text-[10px]"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          &rarr;
                        </span>
                        <span
                          className="text-[10px] font-bold tracking-wider truncate"
                          style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                        >
                          {log.product_title}
                        </span>
                      </>
                    )}
                  </div>
                  <p
                    className="text-[11px] mb-1"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {log.message}
                  </p>
                  <p
                    className="text-[9px] font-bold tracking-wider"
                    style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)", opacity: 0.7 }}
                  >
                    {log.items_processed} {t("processed")} &middot; {log.items_updated} {t("updated")} &middot; {log.items_skipped} {t("skipped")}
                  </p>
                </div>

                {/* Time */}
                <div className="flex-shrink-0 text-right">
                  <p
                    className="text-[9px] font-bold tracking-wider"
                    style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                  >
                    {formatRelativeTime(log.created_at)}
                  </p>
                  <p
                    className="text-[9px] font-bold uppercase tracking-[0.15em] mt-0.5"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: config.color,
                      opacity: 0.8,
                    }}
                  >
                    {log.scope}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Load More */}
          {remaining > 0 && (
            <div
              className="flex justify-center py-3"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <button
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors hover:opacity-80"
                style={{
                  fontFamily: "var(--font-mono)",
                  borderColor: "var(--border)",
                  color: "var(--muted-foreground)",
                  borderRadius: 0,
                }}
              >
                {t("loadMore", { remaining })}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Clean Dialog */}
      <Dialog open={showCleanDialog} onOpenChange={setShowCleanDialog}>
        <DialogContent
          className="sm:max-w-md"
          style={{ borderRadius: 0, border: "2px solid var(--border)", backgroundColor: "var(--card)" }}
        >
          <DialogHeader>
            <DialogTitle
              className="text-[11px] font-bold uppercase tracking-[0.15em]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {t("cleanDataTitle")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("cleanDataTitle")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Scope */}
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
                style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
              >
                {t("scope")}
              </p>
              <div className="flex gap-1">
                {(["descriptions", "categories", "full"] as const).map((scope) => (
                  <button
                    key={scope}
                    onClick={() => setCleanScope(scope)}
                    className="flex-1 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors"
                    style={{
                      fontFamily: "var(--font-mono)",
                      borderRadius: 0,
                      backgroundColor: cleanScope === scope ? "var(--primary-muted)" : "transparent",
                      borderColor: cleanScope === scope ? "var(--primary-muted)" : "var(--border)",
                      color: cleanScope === scope ? "var(--primary-text)" : "var(--muted-foreground)",
                    }}
                  >
                    {scope === "descriptions" && t("scopeDescriptions")}
                    {scope === "categories" && t("scopeCategories")}
                    {scope === "full" && t("scopeFull")}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Store */}
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
                style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
              >
                {t("targetStore")}
              </p>
              <SimpleFilter
                label={t("allStores")}
                resetLabel={t("allStores")}
                options={storeOptions}
                value={cleanStore}
                onChange={setCleanStore}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            <button
              onClick={() => setShowCleanDialog(false)}
              className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors hover:opacity-80"
              style={{ fontFamily: "var(--font-mono)", borderColor: "var(--border)", color: "var(--muted-foreground)", borderRadius: 0 }}
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleClean}
              disabled={isCleaning}
              className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:opacity-80 disabled:opacity-50"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: "var(--primary)",
                color: "#000",
                borderRadius: 0,
              }}
            >
              {isCleaning ? t("cleaning") : t("startCleaning")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
