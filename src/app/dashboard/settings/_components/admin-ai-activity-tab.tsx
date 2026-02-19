"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Sparkles,
  X,
  Check,
  RotateCcw,
  Loader2,
  Package,
  Store as StoreIcon,
  Search,
  Globe,
  List,
  CheckCheck,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Highlight } from "@/app/dashboard/ai-content/_components/highlight";
import { Skeleton } from "@/components/ui/skeleton";
import type { AIActivityLog, AICleanStatus, Store, Product } from "@/types";

type LightProduct = Pick<Product, "id" | "store_id" | "title" | "brand" | "ai_category">;

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

function formatElapsed(ms: number) {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

// ─── Types ───

type DialogPhase = "configure" | "confirm" | "running" | "complete";
type CleanMode = "shops" | "products";
type CleanScope = "all" | "selected";

interface SelectedItem {
  value: string;
  label: string;
  cleaned?: boolean;
}

interface CleanProgress {
  total: number;
  done: number;
  updated: number;
  errors: number;
}

interface FailedItem {
  id: string;
  label: string;
  error: string;
}

// ─── Section Label ───

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[9px] font-bold uppercase tracking-[0.15em] pb-2 mb-3"
      style={{
        fontFamily: "var(--font-mono)",
        color: "var(--muted-foreground)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {children}
    </p>
  );
}

// ─── AI Activity Tab ───

const PAGE_SIZE = 10;
const BATCH_SIZE = 3;
const MAX_STORES_SELECT = 5;
const MAX_PRODUCTS_SELECT = 10;
const MAX_DROPDOWN_RESULTS = 50;
const BULK_CONFIRM_THRESHOLD = 10;

export function AdminAIActivityTab() {
  const t = useTranslations("Admin");

  // ─── Data state ───
  const [activityLogs, setActivityLogs] = useState<AIActivityLog[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<LightProduct[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setDataLoading(true);
    setDataError(null);
    try {
      const [logsRes, storesRes, productsRes] = await Promise.all([
        fetch("/api/admin/activity-logs"),
        fetch("/api/admin/stores"),
        fetch("/api/admin/products?columns=light"),
      ]);
      if (!logsRes.ok || !storesRes.ok || !productsRes.ok) throw new Error("Failed to load data");
      const [logsData, storesData, productsData] = await Promise.all([
        logsRes.json(),
        storesRes.json(),
        productsRes.json(),
      ]);
      setActivityLogs(logsData.activityLogs ?? []);
      setStores(storesData.stores ?? []);
      setProducts(productsData.products ?? []);
    } catch {
      setDataError(t("loadError"));
    } finally {
      setDataLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Dialog state ───
  const [showCleanDialog, setShowCleanDialog] = useState(false);
  const [cleanMode, setCleanMode] = useState<CleanMode>("shops");
  const [cleanScope, setCleanScope] = useState<CleanScope>("all");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [storeFilter, setStoreFilter] = useState<string | null>(null);
  const [storeFilterOpen, setStoreFilterOpen] = useState(false);
  const [perStoreLimit, setPerStoreLimit] = useState("");

  // ─── Running state ───
  const [phase, setPhase] = useState<DialogPhase>("configure");
  const [progress, setProgress] = useState<CleanProgress | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const retryIdsRef = useRef<string[] | null>(null);
  const storeFilterRef = useRef<HTMLDivElement>(null);

  // Close store filter dropdown on click outside
  useEffect(() => {
    if (!storeFilterOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (storeFilterRef.current && !storeFilterRef.current.contains(e.target as Node)) {
        setStoreFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [storeFilterOpen]);

  // ─── Error tracking ───
  const [failedItems, setFailedItems] = useState<FailedItem[]>([]);
  const [showErrors, setShowErrors] = useState(false);

  // ─── Stores that actually have products (for filter dropdown) ───
  const storesWithProducts = useMemo(() => {
    const storeIdsInProducts = new Set(products.map((p) => p.store_id));
    return stores.filter((s) => storeIdsInProducts.has(s.id));
  }, [stores, products]);

  // ─── Timeline state ───
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());

  const toggleLogExpand = useCallback((logId: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
  }, []);

  const visibleLogs = activityLogs.slice(0, visibleCount);
  const remaining = activityLogs.length - visibleCount;

  // ─── Dropdown items (filtered by search, excluding selected) ───
  const dropdownItems = useMemo(() => {
    const selectedValues = new Set(selectedItems.map((i) => i.value));
    const query = searchQuery.toLowerCase().trim();

    if (cleanMode === "shops") {
      return stores
        .filter((s) => !selectedValues.has(s.id))
        .filter((s) => !query || s.name.toLowerCase().includes(query) || s.url.toLowerCase().includes(query))
        .slice(0, MAX_DROPDOWN_RESULTS)
        .map((s) => ({ value: s.id, label: s.name, cleaned: !!s.shipping_country }));
    } else {
      let filtered = products.filter((p) => !selectedValues.has(p.id));
      if (storeFilter) {
        filtered = filtered.filter((p) => p.store_id === storeFilter);
      }
      if (query) {
        filtered = filtered.filter(
          (p) => p.title.toLowerCase().includes(query) || (p.brand && p.brand.toLowerCase().includes(query))
        );
      }
      return filtered.slice(0, MAX_DROPDOWN_RESULTS).map((p) => ({
        value: p.id,
        label: p.brand ? `${p.title} — ${p.brand}` : p.title,
        cleaned: !!p.ai_category,
      }));
    }
  }, [cleanMode, stores, products, selectedItems, searchQuery, storeFilter]);

  // ─── Products count for "select all from store" ───
  const storeProductCount = useMemo(() => {
    if (!storeFilter) return 0;
    return products.filter((p) => p.store_id === storeFilter).length;
  }, [products, storeFilter]);

  // ─── Preview count (shown on Start button) ───
  const previewCount = useMemo(() => {
    if (cleanMode === "products") {
      if (cleanScope === "selected") return selectedItems.length;
      const limit = parseInt(perStoreLimit || "0", 10);
      if (limit > 0) {
        const byStore = new Map<string, number>();
        for (const p of products) {
          byStore.set(p.store_id, (byStore.get(p.store_id) || 0) + 1);
        }
        let total = 0;
        for (const count of byStore.values()) {
          total += Math.min(count, limit);
        }
        return total;
      }
      return products.length;
    }
    return cleanScope === "selected" ? selectedItems.length : stores.length;
  }, [cleanMode, cleanScope, selectedItems, perStoreLimit, products, stores]);

  // ─── Dialog open/close ───

  function openDialog() {
    setPhase("configure");
    setCleanMode("shops");
    setCleanScope("all");
    setSelectedItems([]);
    setSearchQuery("");
    setStoreFilter(null);
    setPerStoreLimit("");
    setProgress(null);
    setElapsed(0);
    setFailedItems([]);
    setShowErrors(false);
    setStoreFilterOpen(false);
    setShowCleanDialog(true);
  }

  function closeDialog() {
    if (phase === "running") return;
    setShowCleanDialog(false);
  }

  // ─── Mode / scope change ───

  function handleModeChange(mode: CleanMode) {
    setCleanMode(mode);
    setSelectedItems([]);
    setSearchQuery("");
    setStoreFilter(null);
    setStoreFilterOpen(false);
  }

  function handleScopeChange(scope: CleanScope) {
    setCleanScope(scope);
    setSelectedItems([]);
    setSearchQuery("");
  }

  // ─── Selection ───

  function selectItem(item: SelectedItem) {
    const max = cleanMode === "shops" ? MAX_STORES_SELECT : MAX_PRODUCTS_SELECT;
    if (selectedItems.length >= max) return;
    setSelectedItems((prev) => [...prev, item]);
  }

  function removeItem(value: string) {
    setSelectedItems((prev) => prev.filter((i) => i.value !== value));
  }

  function selectAllFromStore() {
    if (!storeFilter) return;
    const storeProducts = products.filter((p) => p.store_id === storeFilter);
    const capped = storeProducts.slice(0, MAX_PRODUCTS_SELECT);
    const items: SelectedItem[] = capped.map((p) => ({
      value: p.id,
      label: p.brand ? `${p.title} — ${p.brand}` : p.title,
    }));
    setSelectedItems(items);
    const storeName = stores.find((s) => s.id === storeFilter)?.name ?? "";
    if (storeProducts.length > MAX_PRODUCTS_SELECT) {
      toast(`${t("selectedAll")} ${items.length}/${storeProducts.length} ${t("productsFrom")} ${storeName} (max ${MAX_PRODUCTS_SELECT})`);
    } else {
      toast(`${t("selectedAll")} ${items.length} ${t("productsFrom")} ${storeName}`);
    }
  }

  // ─── Timer ───

  function startTimer() {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    setElapsed(Date.now() - startTimeRef.current);
  }

  function handleCancel() {
    abortRef.current?.abort();
  }

  // ─── Get items to process ───

  function getProductsToProcess(): LightProduct[] {
    if (cleanScope === "selected") {
      const ids = new Set(selectedItems.map((i) => i.value));
      return products.filter((p) => ids.has(p.id));
    }
    // All products, optionally with per-store limit
    const limit = parseInt(perStoreLimit || "0", 10);
    if (limit > 0) {
      const byStore = new Map<string, LightProduct[]>();
      for (const p of products) {
        const arr = byStore.get(p.store_id) || [];
        arr.push(p);
        byStore.set(p.store_id, arr);
      }
      const limited: LightProduct[] = [];
      for (const arr of byStore.values()) {
        limited.push(...arr.slice(0, limit));
      }
      return limited;
    }
    return products;
  }

  function getStoresToProcess(): Store[] {
    if (cleanScope === "selected") {
      const ids = new Set(selectedItems.map((i) => i.value));
      return stores.filter((s) => ids.has(s.id));
    }
    return stores;
  }

  // ─── Execute cleaning ───

  const handleClean = useCallback(async () => {
    const controller = new AbortController();
    abortRef.current = controller;

    // Check for retry IDs
    const retryIds = retryIdsRef.current;
    retryIdsRef.current = null;

    setPhase("running");
    setFailedItems([]);
    setShowErrors(false);
    startTimer();

    if (cleanMode === "products") {
      const toProcess = retryIds
        ? products.filter((p) => retryIds.includes(p.id))
        : getProductsToProcess();
      setProgress({ total: toProcess.length, done: 0, updated: 0, errors: 0 });

      let totalUpdated = 0;
      let totalErrors = 0;
      const failed: FailedItem[] = [];
      const logResults: Array<{id: string; label: string; status: string; error?: string; store_name?: string}> = [];

      try {
        for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
          if (controller.signal.aborted) break;

          const batch = toProcess.slice(i, i + BATCH_SIZE);
          const productIds = batch.map((p) => p.id);

          try {
            const res = await fetch("/api/admin/clean", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ productIds, scope: "full" }),
              signal: controller.signal,
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            for (const r of (data.results ?? []) as { productId: string; status: string; error?: string }[]) {
              const prod = toProcess.find((p) => p.id === r.productId);
              const store = stores.find((s) => s.id === prod?.store_id);
              if (r.status === "success") {
                totalUpdated++;
              } else {
                totalErrors++;
                failed.push({
                  id: r.productId,
                  label: prod?.title ?? r.productId,
                  error: r.error ?? "Unknown error",
                });
              }
              logResults.push({
                id: r.productId,
                label: prod?.title ?? r.productId,
                status: r.status,
                error: r.error,
                store_name: store?.name,
              });
            }
          } catch (err) {
            if (err instanceof DOMException && err.name === "AbortError") break;
            totalErrors += batch.length;
            for (const p of batch) {
              const store = stores.find((s) => s.id === p.store_id);
              failed.push({ id: p.id, label: p.title, error: "Request failed" });
              logResults.push({ id: p.id, label: p.title, status: "error", error: "Request failed", store_name: store?.name });
            }
          }

          setProgress({
            total: toProcess.length,
            done: Math.min(i + BATCH_SIZE, toProcess.length),
            updated: totalUpdated,
            errors: totalErrors,
          });
        }

        // User cancelled — stop without logging
        if (controller.signal.aborted) {
          stopTimer();
          setPhase("configure");
          toast(t("cleanCancelled"));
          return;
        }

        setFailedItems(failed);

        // Write activity log
        await fetch("/api/admin/clean/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeId: null,
            scope: "full",
            items_processed: toProcess.length,
            items_updated: totalUpdated,
            items_skipped: totalErrors,
            message: `Product cleaning: ${totalUpdated} updated, ${totalErrors} errors`,
            results: logResults,
            elapsed_ms: elapsed * 1000,
          }),
        });

        stopTimer();
        setPhase("complete");
        loadData();
      } catch (err) {
        stopTimer();
        if (err instanceof DOMException && err.name === "AbortError") {
          setPhase("configure");
          toast(t("cleanCancelled"));
          return;
        }
        setPhase("configure");
        toast(t("cleanError"));
      }
    } else {
      // Shops mode
      const toProcess = retryIds
        ? stores.filter((s) => retryIds.includes(s.id))
        : getStoresToProcess();
      setProgress({ total: toProcess.length, done: 0, updated: 0, errors: 0 });

      let totalUpdated = 0;
      let totalErrors = 0;
      const failed: FailedItem[] = [];
      const logResults: Array<{id: string; label: string; status: string; error?: string; source?: string; descriptions_generated?: boolean}> = [];

      try {
        for (let i = 0; i < toProcess.length; i++) {
          if (controller.signal.aborted) break;

          const store = toProcess[i];
          try {
            const res = await fetch("/api/admin/clean/shipping", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ storeId: store.id }),
              signal: controller.signal,
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            totalUpdated++;
            logResults.push({
              id: store.id,
              label: store.name,
              status: "success",
              source: data.source,
              descriptions_generated: data.descriptions_generated,
            });
          } catch (err) {
            if (err instanceof DOMException && err.name === "AbortError") break;
            totalErrors++;
            failed.push({ id: store.id, label: store.name, error: "Request failed" });
            logResults.push({ id: store.id, label: store.name, status: "error", error: "Request failed" });
          }

          setProgress({
            total: toProcess.length,
            done: i + 1,
            updated: totalUpdated,
            errors: totalErrors,
          });
        }

        if (controller.signal.aborted) {
          stopTimer();
          setPhase("configure");
          toast(t("cleanCancelled"));
          return;
        }

        setFailedItems(failed);

        await fetch("/api/admin/clean/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeId: null,
            scope: "shipping",
            items_processed: toProcess.length,
            items_updated: totalUpdated,
            items_skipped: totalErrors,
            message: `Shop cleaning: ${totalUpdated} updated, ${totalErrors} errors`,
            results: logResults,
            elapsed_ms: elapsed * 1000,
          }),
        });

        stopTimer();
        setPhase("complete");
        loadData();
      } catch (err) {
        stopTimer();
        if (err instanceof DOMException && err.name === "AbortError") {
          setPhase("configure");
          toast(t("cleanCancelled"));
          return;
        }
        setPhase("configure");
        toast(t("cleanError"));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanMode, cleanScope, selectedItems, perStoreLimit, products, stores, loadData, t]);

  // ─── Start handler (with bulk confirm) ───

  const handleStart = useCallback(() => {
    const count = cleanMode === "products" ? getProductsToProcess().length : getStoresToProcess().length;
    if (count === 0) {
      toast(cleanMode === "products" ? t("cleanNoProducts") : t("cleanNoShops"));
      return;
    }
    if (cleanScope === "selected" && selectedItems.length > BULK_CONFIRM_THRESHOLD) {
      setPhase("confirm");
      return;
    }
    handleClean();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanMode, cleanScope, selectedItems, handleClean, t]);

  function handleRetry() {
    retryIdsRef.current = failedItems.map((f) => f.id);
    handleClean();
  }

  // ─── Active color ───
  const activeColor = cleanMode === "shops" ? "#A78BFA" : "#5AC8FA";

  if (dataLoading) {
    return (
      <div>
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-[120px]" />
        </div>
        {/* Timeline skeleton */}
        <div
          className="border-2"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-4 py-3"
              style={{ borderBottom: i < 4 ? "1px solid var(--border)" : "none" }}
            >
              <Skeleton className="w-7 h-7 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-3 w-64" />
                <Skeleton className="h-2.5 w-36" />
              </div>
              <div className="flex-shrink-0 space-y-1.5 flex flex-col items-end">
                <Skeleton className="h-2.5 w-14" />
                <Skeleton className="h-2.5 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div
        className="border-2 py-16 flex flex-col items-center justify-center gap-3"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
        >
          {dataError}
        </p>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors hover:opacity-80"
          style={{ fontFamily: "var(--font-mono)", borderColor: "var(--border)", color: "var(--muted-foreground)" }}
        >
          <RotateCcw className="w-3 h-3" />
          {t("retry")}
        </button>
      </div>
    );
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
          onClick={openDialog}
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
            const hasDetails = log.details.length > 0;
            const isExpanded = expandedLogIds.has(log.id);

            // Build smart summary from details
            let summary = log.store_name || "";
            if (hasDetails) {
              if (log.scope === "shipping") {
                const names = log.details.map((d) => d.label).slice(0, 3);
                const extra = log.details.length - 3;
                summary = `${t("logStores", { count: log.details.length })} \u00b7 ${names.join(", ")}${extra > 0 ? ` +${extra}` : ""}`;
              } else {
                const storeNames = [...new Set(log.details.map((d) => d.store_name).filter(Boolean))];
                const names = storeNames.slice(0, 3);
                const extra = storeNames.length - 3;
                summary = `${t("logProducts", { count: log.details.length })} \u00b7 ${names.join(", ")}${extra > 0 ? ` +${extra}` : ""}`;
              }
            }

            // Format elapsed
            const elapsedLabel = log.elapsed_ms != null
              ? log.elapsed_ms >= 60000
                ? `${Math.floor(log.elapsed_ms / 60000)}m ${Math.round((log.elapsed_ms % 60000) / 1000)}s`
                : `${Math.round(log.elapsed_ms / 1000)}s`
              : null;

            return (
              <div
                key={log.id}
                style={{
                  borderBottom: i < visibleLogs.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <div className="flex items-start gap-3 px-4 py-3">
                  <div
                    className="w-7 h-7 flex-shrink-0 flex items-center justify-center mt-0.5"
                    style={{
                      backgroundColor: `${config.color}12`,
                      border: `1.5px solid ${config.color}40`,
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold mb-0.5 truncate">{summary}</p>
                    <p className="text-[11px] mb-1" style={{ color: "var(--muted-foreground)" }}>
                      {log.message}
                    </p>
                    <div className="flex items-center gap-2">
                      <p
                        className="text-[9px] font-bold tracking-wider"
                        style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)", opacity: 0.7 }}
                      >
                        {log.items_processed} {t("processed")} &middot; {log.items_updated} {t("updated")} &middot; {log.items_skipped} {t("skipped")}
                      </p>
                      {hasDetails && (
                        <button
                          onClick={() => toggleLogExpand(log.id)}
                          className="text-[9px] font-bold tracking-wider flex items-center gap-0.5 hover:opacity-70 transition-opacity"
                          style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                        >
                          {isExpanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                          {isExpanded ? t("hideDetails") : t("showDetails", { count: log.details.length })}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p
                      className="text-[9px] font-bold tracking-wider"
                      style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                    >
                      {formatRelativeTime(log.created_at)}
                      {elapsedLabel && (
                        <span style={{ opacity: 0.6 }}> &middot; {elapsedLabel}</span>
                      )}
                    </p>
                    <p
                      className="text-[9px] font-bold uppercase tracking-[0.15em] mt-0.5"
                      style={{ fontFamily: "var(--font-mono)", color: statusConfig[log.status].color, opacity: 0.8 }}
                    >
                      {log.scope}
                    </p>
                  </div>
                </div>

                {/* Expandable per-item details */}
                {isExpanded && hasDetails && (
                  <div
                    className="px-4 pb-3 ml-10"
                    style={{ borderTop: "1px dashed var(--border)" }}
                  >
                    {log.details.map((item) => (
                      <div key={item.id} className="py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="inline-block w-1.5 h-1.5 shrink-0 rounded-full"
                            style={{
                              backgroundColor: item.status === "success" ? "#22C55E" : item.status === "error" ? "#FF453A" : "#FF9F0A",
                            }}
                          />
                          <span
                            className="text-[10px] font-semibold truncate flex-1"
                            style={{ fontFamily: "var(--font-mono)" }}
                          >
                            {item.label}
                          </span>
                          {item.store_name && (
                            <span
                              className="text-[9px] tracking-wider shrink-0"
                              style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                            >
                              {item.store_name}
                            </span>
                          )}
                          {item.source && (
                            <span
                              className="text-[8px] font-bold uppercase tracking-[0.15em] px-1.5 py-0.5 shrink-0"
                              style={{
                                fontFamily: "var(--font-mono)",
                                backgroundColor: item.source === "firecrawl" ? "#CAFF0420" : "var(--muted-foreground)12",
                                color: item.source === "firecrawl" ? "var(--primary-text)" : "var(--muted-foreground)",
                                border: `1px solid ${item.source === "firecrawl" ? "var(--primary)" : "var(--border)"}`,
                              }}
                            >
                              {item.source === "firecrawl" ? t("firecrawlSource") : t("productsFallback")}
                            </span>
                          )}
                          {item.descriptions_generated && (
                            <span
                              className="text-[8px] font-bold uppercase tracking-[0.15em] px-1.5 py-0.5 shrink-0"
                              style={{
                                fontFamily: "var(--font-mono)",
                                backgroundColor: "#22C55E12",
                                color: "#22C55E",
                                border: "1px solid #22C55E40",
                              }}
                            >
                              {t("descriptionsGenerated")}
                            </span>
                          )}
                        </div>
                        {item.error && (
                          <p
                            className="text-[9px] mt-0.5 ml-3"
                            style={{ fontFamily: "var(--font-mono)", color: "#FF453A" }}
                          >
                            {item.error}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {remaining > 0 && (
            <div className="flex justify-center py-3" style={{ borderTop: "1px solid var(--border)" }}>
              <button
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors hover:opacity-80"
                style={{ fontFamily: "var(--font-mono)", borderColor: "var(--border)", color: "var(--muted-foreground)", borderRadius: 0 }}
              >
                {t("loadMore", { remaining })}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── Clean Dialog ─── */}
      <Dialog open={showCleanDialog} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent
          className="sm:max-w-lg"
          showCloseButton={phase !== "running"}
          style={{ borderRadius: 0, border: "2px solid var(--border)", backgroundColor: "var(--card)" }}
        >
          <DialogHeader>
            <DialogTitle
              className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
              {t("cleanDataTitle")}
            </DialogTitle>
            <DialogDescription className="sr-only">{t("cleanDataTitle")}</DialogDescription>
          </DialogHeader>

          {/* ═══ CONFIGURE PHASE ═══ */}
          {phase === "configure" && (
            <>
              <div className="space-y-4">
                {/* Row 1: Mode + Scope toggles */}
                <div className="grid grid-cols-2 gap-4">
                  {/* What to clean */}
                  <div>
                    <SectionLabel>{t("whatToClean")}</SectionLabel>
                    <div className="flex border-2" style={{ borderColor: "var(--border)" }}>
                      {([
                        { mode: "shops" as const, icon: StoreIcon, label: t("modeShops") },
                        { mode: "products" as const, icon: Package, label: t("modeProducts") },
                      ]).map(({ mode, icon: ModeIcon, label }) => {
                        const active = cleanMode === mode;
                        return (
                          <button
                            key={mode}
                            onClick={() => handleModeChange(mode)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors"
                            style={{
                              fontFamily: "var(--font-mono)",
                              backgroundColor: active ? "var(--primary)" : "transparent",
                              color: active ? "#000" : "var(--muted-foreground)",
                              borderRight: mode === "shops" ? "2px solid var(--border)" : "none",
                            }}
                          >
                            <ModeIcon className="w-3 h-3" />
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Processing scope */}
                  <div>
                    <SectionLabel>{t("processingScope")}</SectionLabel>
                    <div className="flex border-2" style={{ borderColor: "var(--border)" }}>
                      {([
                        { scope: "all" as const, icon: Globe, label: t("scopeAll") },
                        { scope: "selected" as const, icon: List, label: t("scopeSelected") },
                      ]).map(({ scope, icon: ScopeIcon, label }) => {
                        const active = cleanScope === scope;
                        return (
                          <button
                            key={scope}
                            onClick={() => handleScopeChange(scope)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors"
                            style={{
                              fontFamily: "var(--font-mono)",
                              backgroundColor: active ? "var(--primary)" : "transparent",
                              color: active ? "#000" : "var(--muted-foreground)",
                              borderRight: scope === "all" ? "2px solid var(--border)" : "none",
                            }}
                          >
                            <ScopeIcon className="w-3 h-3" />
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Selection wrapper (only when scope=selected) */}
                {cleanScope === "selected" && (
                  <div>
                    <SectionLabel>
                      {cleanMode === "shops"
                        ? t("selectStoresLabel", { max: MAX_STORES_SELECT })
                        : t("selectProductsLabel", { max: MAX_PRODUCTS_SELECT })}
                    </SectionLabel>

                    <div
                      className="border-2 p-3 space-y-2"
                      style={{ borderColor: "var(--border)", backgroundColor: "var(--input)" }}
                    >
                      {/* Store filter (products mode only) */}
                      {cleanMode === "products" && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="relative" ref={storeFilterRef}>
                            <button
                              onClick={() => setStoreFilterOpen(!storeFilterOpen)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors"
                              style={{
                                fontFamily: "var(--font-mono)",
                                backgroundColor: storeFilter ? "var(--primary-muted)" : "transparent",
                                borderColor: storeFilter ? "var(--primary-muted)" : "var(--border)",
                                color: storeFilter ? "var(--primary-text)" : "var(--muted-foreground)",
                              }}
                            >
                              <span className="truncate" style={{ maxWidth: 160 }}>
                                {storeFilter
                                  ? storesWithProducts.find((s) => s.id === storeFilter)?.name ?? t("allStores")
                                  : `${t("allStores")} (${storesWithProducts.length})`}
                              </span>
                              <ChevronDown className="w-3 h-3 flex-shrink-0" />
                            </button>

                            {storeFilterOpen && (
                              <div
                                className="absolute top-full left-0 z-50 mt-1 p-1 border-2 w-[220px]"
                                style={{
                                  borderColor: "var(--border)",
                                  backgroundColor: "var(--card)",
                                }}
                              >
                                {storeFilter && (
                                  <button
                                    onClick={() => { setStoreFilter(null); setSearchQuery(""); setStoreFilterOpen(false); }}
                                    className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-[var(--subtle-overlay)]"
                                    style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                                  >
                                    <X className="w-3 h-3 flex-shrink-0 opacity-50" />
                                    <span className="truncate">{t("allStores")} ({storesWithProducts.length})</span>
                                  </button>
                                )}
                                <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
                                  {storesWithProducts.map((s) => (
                                    <button
                                      key={s.id}
                                      onClick={() => {
                                        setStoreFilter(s.id === storeFilter ? null : s.id);
                                        setSearchQuery("");
                                        setStoreFilterOpen(false);
                                      }}
                                      className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-[var(--subtle-overlay)]"
                                      style={{ fontFamily: "var(--font-mono)" }}
                                    >
                                      {storeFilter === s.id ? (
                                        <Check className="w-3 h-3 flex-shrink-0" style={{ color: "var(--primary-text)" }} />
                                      ) : (
                                        <span className="w-3 h-3 flex-shrink-0" />
                                      )}
                                      <span className="truncate">{s.name}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Select all from store */}
                          {storeFilter && (
                            <button
                              onClick={selectAllFromStore}
                              className="flex items-center gap-1 px-2 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] border-2 transition-colors hover:opacity-80 flex-shrink-0"
                              style={{
                                fontFamily: "var(--font-mono)",
                                borderColor: "#22C55E40",
                                color: "#22C55E",
                                backgroundColor: "#22C55E08",
                                borderRadius: 0,
                              }}
                            >
                              <CheckCheck className="w-3 h-3" />
                              {t("selectAllFromStore")} ({storeProductCount})
                            </button>
                          )}
                        </div>
                      )}

                      {/* Search input */}
                      <div className="flex items-center gap-1.5 border-2 px-2" style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}>
                        <Search className="w-3 h-3 flex-shrink-0" style={{ color: "var(--muted-foreground)" }} />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder={cleanMode === "shops" ? t("searchStores") : t("searchProducts")}
                          className="flex-1 py-1.5 text-[10px] bg-transparent outline-none"
                          style={{ fontFamily: "var(--font-mono)", color: "var(--foreground)" }}
                        />
                        {searchQuery && (
                          <button onClick={() => setSearchQuery("")} className="flex-shrink-0">
                            <X className="w-3 h-3" style={{ color: "var(--muted-foreground)" }} />
                          </button>
                        )}
                      </div>

                      {/* Selected items chips */}
                      {selectedItems.length > 0 && (
                        <div className="flex flex-wrap gap-1 overflow-y-auto" style={{ maxHeight: 80 }}>
                          {selectedItems.map((item) => (
                            <span
                              key={item.value}
                              className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold"
                              style={{
                                fontFamily: "var(--font-mono)",
                                backgroundColor: "var(--primary)",
                                color: "#000",
                              }}
                            >
                              <span
                                className="inline-block w-1.5 h-1.5 shrink-0 rounded-full"
                                style={{ backgroundColor: item.cleaned ? "#22C55E" : "var(--muted-foreground)", opacity: item.cleaned ? 1 : 0.3 }}
                              />
                              {item.label.length > 30 ? item.label.slice(0, 30) + "..." : item.label}
                              <button onClick={() => removeItem(item.value)} className="ml-0.5 hover:opacity-60">
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {selectedItems.length === 0 && (
                        <p
                          className="text-[9px] py-1"
                          style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                        >
                          {t("noItemsSelected")}
                        </p>
                      )}

                      {/* Dropdown results */}
                      <div
                        className="border-2 overflow-y-auto"
                        style={{ borderColor: "var(--border)", backgroundColor: "var(--card)", maxHeight: 160 }}
                      >
                        {dropdownItems.length === 0 ? (
                          <p
                            className="px-3 py-3 text-center text-[10px]"
                            style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                          >
                            {searchQuery ? t("noResults") : t("typeToSearch")}
                          </p>
                        ) : (
                          dropdownItems.map((item) => (
                            <button
                              key={item.value}
                              onClick={() => selectItem(item)}
                              className="w-full text-left px-3 py-1.5 text-[10px] transition-colors hover:bg-[var(--subtle-overlay)] flex items-center gap-1.5"
                              style={{
                                fontFamily: "var(--font-mono)",
                                borderBottom: "1px solid var(--border)",
                              }}
                            >
                              <span
                                className="inline-block w-1.5 h-1.5 shrink-0 rounded-full"
                                style={{ backgroundColor: item.cleaned ? "#22C55E" : "var(--muted-foreground)", opacity: item.cleaned ? 1 : 0.3 }}
                              />
                              <Highlight text={item.label} query={searchQuery} />
                            </button>
                          ))
                        )}
                      </div>

                      <p
                        className="text-[9px]"
                        style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                      >
                        {t("searchClickToSelect")}
                      </p>
                    </div>
                  </div>
                )}

                {/* Per-store limit (products + all only) */}
                {cleanMode === "products" && cleanScope === "all" && (
                  <div>
                    <SectionLabel>{t("perStoreLimit")}</SectionLabel>
                    <input
                      type="number"
                      value={perStoreLimit}
                      onChange={(e) => setPerStoreLimit(e.target.value)}
                      placeholder="e.g., 200"
                      className="w-full px-3 py-2 text-[10px] border-2 bg-transparent"
                      style={{
                        fontFamily: "var(--font-mono)",
                        borderColor: "var(--border)",
                        color: "var(--foreground)",
                        borderRadius: 0,
                      }}
                    />
                    <p
                      className="text-[9px] mt-1"
                      style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                    >
                      {t("perStoreLimitHelp")}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                <button
                  onClick={closeDialog}
                  className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors hover:opacity-80"
                  style={{ fontFamily: "var(--font-mono)", borderColor: "var(--border)", color: "var(--muted-foreground)", borderRadius: 0 }}
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleStart}
                  className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:opacity-80 border-2"
                  style={{
                    fontFamily: "var(--font-mono)",
                    backgroundColor: "var(--primary)",
                    borderColor: "var(--primary)",
                    color: "#000",
                    borderRadius: 0,
                    boxShadow: "3px 3px 0px var(--primary)",
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    {t("startCleaning")} ({previewCount})
                  </span>
                </button>
              </div>
            </>
          )}

          {/* ═══ BULK CONFIRM PHASE ═══ */}
          {phase === "confirm" && (
            <div className="space-y-5">
              <div
                className="flex items-center gap-3 px-4 py-4 border-2"
                style={{ borderColor: "rgba(255,159,10,0.3)", backgroundColor: "rgba(255,159,10,0.06)" }}
              >
                <div
                  className="w-8 h-8 flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(255,159,10,0.12)", border: "1.5px solid rgba(255,159,10,0.4)" }}
                >
                  <AlertTriangle className="w-4 h-4" style={{ color: "#FF9F0A" }} />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-bold" style={{ fontFamily: "var(--font-mono)" }}>
                    {t("bulkConfirmTitle")}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>
                    {t("bulkConfirmDesc", { count: selectedItems.length })}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                <button
                  onClick={() => setPhase("configure")}
                  className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors hover:opacity-80"
                  style={{ fontFamily: "var(--font-mono)", borderColor: "var(--border)", color: "var(--muted-foreground)", borderRadius: 0 }}
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleClean}
                  className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:opacity-80 border-2"
                  style={{ fontFamily: "var(--font-mono)", backgroundColor: "#FF9F0A", borderColor: "#FF9F0A", color: "#000", borderRadius: 0 }}
                >
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3 h-3" />
                    {t("bulkConfirmAction")}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ═══ RUNNING PHASE ═══ */}
          {phase === "running" && progress && (() => {
            const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
            const etaMs = progress.done > 0 && progress.done < progress.total
              ? Math.round((elapsed / progress.done) * (progress.total - progress.done))
              : null;

            return (
              <div className="space-y-5">
                <div
                  className="flex items-center gap-3 px-4 py-4 border-2"
                  style={{ borderColor: `${activeColor}30`, backgroundColor: `${activeColor}06`, borderStyle: "dashed" }}
                >
                  <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" style={{ color: activeColor }} />
                  <div className="flex-1">
                    <p className="text-[11px] font-bold" style={{ fontFamily: "var(--font-mono)" }}>
                      {cleanMode === "products" ? t("cleanRunning") : t("cleanShopsRunning")}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>
                      {t("cleanProgress", { done: progress.done, total: progress.total })}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>
                      {pct}%
                    </p>
                    <div className="flex items-center gap-3">
                      {etaMs !== null && (
                        <p className="text-[9px] font-bold tracking-wider" style={{ fontFamily: "var(--font-mono)", color: activeColor }}>
                          {t("estimatedRemaining", { time: formatElapsed(etaMs) })}
                        </p>
                      )}
                      <p className="text-[9px] font-bold tracking-wider" style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>
                        {t("cleanElapsed")}: {formatElapsed(elapsed)}
                      </p>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden" style={{ backgroundColor: "var(--border)" }}>
                    <div
                      className="h-full transition-all duration-500 ease-out"
                      style={{ width: `${pct}%`, backgroundColor: activeColor }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: t("processed"), value: progress.done, color: "var(--muted-foreground)" },
                    { label: t("updated"), value: progress.updated, color: "#22C55E" },
                    { label: "errors", value: progress.errors, color: "#FF453A" },
                  ].map((stat) => (
                    <div key={stat.label} className="px-3 py-2 border-2 text-center" style={{ borderColor: "var(--border)" }}>
                      <p className="text-[14px] font-bold" style={{ fontFamily: "var(--font-mono)", color: stat.color }}>{stat.value}</p>
                      <p className="text-[9px] font-bold uppercase tracking-[0.15em] mt-0.5" style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>{stat.label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors hover:opacity-80"
                    style={{
                      fontFamily: "var(--font-mono)",
                      borderColor: "#FF453A40",
                      color: "#FF453A",
                      backgroundColor: "#FF453A08",
                      borderRadius: 0,
                    }}
                  >
                    {t("cancel")}
                  </button>
                </div>
              </div>
            );
          })()}

          {/* ═══ COMPLETE PHASE ═══ */}
          {phase === "complete" && progress && (
            <div className="space-y-5">
              <div
                className="flex items-center gap-3 px-4 py-4 border-2"
                style={{ borderColor: "rgba(34,197,94,0.3)", backgroundColor: "rgba(34,197,94,0.06)" }}
              >
                <div
                  className="w-8 h-8 flex items-center justify-center"
                  style={{ backgroundColor: "rgba(34,197,94,0.12)", border: "1.5px solid rgba(34,197,94,0.4)" }}
                >
                  <CheckCircle className="w-4 h-4" style={{ color: "#22C55E" }} />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-bold" style={{ fontFamily: "var(--font-mono)" }}>{t("cleanDone")}</p>
                  <p className="text-[10px] mt-0.5" style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>
                    {t("cleanDoneDesc", { updated: progress.updated, total: progress.total })}
                  </p>
                </div>
              </div>

              <div>
                <SectionLabel>{t("cleanSummary")}</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: t("processed"), value: progress.total },
                    { label: t("updated"), value: progress.updated },
                    { label: t("skipped"), value: progress.errors },
                    { label: t("cleanElapsed"), value: formatElapsed(elapsed) },
                  ].map((stat) => (
                    <div key={stat.label} className="flex items-center justify-between px-3 py-2 border-2" style={{ borderColor: "var(--border)" }}>
                      <p className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>{stat.label}</p>
                      <p className="text-[11px] font-bold" style={{ fontFamily: "var(--font-mono)" }}>{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error details (collapsible) */}
              {failedItems.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowErrors(!showErrors)}
                    className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.15em] transition-colors hover:opacity-80"
                    style={{ fontFamily: "var(--font-mono)", color: "#FF453A" }}
                  >
                    <XCircle className="w-3 h-3" />
                    {showErrors ? t("hideErrors") : t("showErrors", { count: failedItems.length })}
                  </button>

                  {showErrors && (
                    <div
                      className="border-2 overflow-y-auto mt-2"
                      style={{ borderColor: "#FF453A30", backgroundColor: "#FF453A06", maxHeight: 120 }}
                    >
                      {failedItems.map((item) => (
                        <div
                          key={item.id}
                          className="px-3 py-1.5"
                          style={{ borderBottom: "1px solid #FF453A15" }}
                        >
                          <p className="text-[10px] font-bold truncate" style={{ fontFamily: "var(--font-mono)" }}>
                            {item.label}
                          </p>
                          <p className="text-[9px] truncate" style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>
                            {item.error}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                {failedItems.length > 0 && (
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors hover:opacity-80"
                    style={{
                      fontFamily: "var(--font-mono)",
                      borderColor: "#FF9F0A40",
                      color: "#FF9F0A",
                      backgroundColor: "#FF9F0A08",
                      borderRadius: 0,
                    }}
                  >
                    <RotateCcw className="w-3 h-3" />
                    {t("retryFailed", { count: failedItems.length })}
                  </button>
                )}
                <button
                  onClick={closeDialog}
                  className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:opacity-80 border-2"
                  style={{ fontFamily: "var(--font-mono)", backgroundColor: "var(--primary)", borderColor: "var(--primary)", color: "#000", borderRadius: 0 }}
                >
                  {t("cleanClose")}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
