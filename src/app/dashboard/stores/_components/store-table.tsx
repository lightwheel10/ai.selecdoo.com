"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import {
  Search,
  ExternalLink,
  Pause,
  Play,
  Trash2,
  X,
  Check,
  ArrowDownToLine,
  ChevronDown,
  ArrowUpDown,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/domain/status-badge";
import { AddStoreDialog } from "./add-store-dialog";
import { useTranslations } from "next-intl";
import type { Store } from "@/types";
import { toast } from "sonner";

// ─── Text Highlight ───

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(
    `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi"
  );
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-transparent" style={{ color: "var(--primary-text)" }}>
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

// ─── Relative Time ───

function formatRelativeTime(
  timestamp: string | null,
  tt: (key: string, values?: { count: number }) => string
) {
  if (!timestamp) return tt("never");
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return tt("minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return tt("hoursAgo", { count: hours });
  const days = Math.floor(hours / 24);
  return tt("daysAgo", { count: days });
}

// ─── Simple Filter Dropdown ───

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
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--card)",
          borderRadius: 0,
        }}
      >
        {value && (
          <button
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-[var(--subtle-overlay)]"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            <X className="w-3 h-3 opacity-50" />
            {resetLabel}
          </button>
        )}
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => {
              onChange(option.value === value ? null : option.value);
              setOpen(false);
            }}
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

// ─── Icon Button ───

function IconButton({
  onClick,
  icon: Icon,
  variant = "ghost",
  title,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "ghost" | "danger";
  title?: string;
}) {
  const styles =
    variant === "danger"
      ? {
          backgroundColor: "rgba(255,69,58,0.15)",
          border: "1.5px solid rgba(255,69,58,0.4)",
          color: "#FF453A",
        }
      : {
          backgroundColor: "transparent",
          border: "2px solid var(--border)",
          color: "var(--muted-foreground)",
        };

  return (
    <button
      onClick={onClick}
      title={title}
      className="w-7 h-7 flex items-center justify-center transition-all duration-150 hover:opacity-80"
      style={styles}
    >
      <Icon className="w-3 h-3" />
    </button>
  );
}

// ─── Sort Options ───

type SortKey = "name" | "products" | "lastScraped" | "status";
type SortDir = "asc" | "desc";

// ─── Store Table ───

interface StoreTableProps {
  stores: Store[];
}

export function StoreTable({ stores }: StoreTableProps) {
  const t = useTranslations("Stores");
  const tt = useTranslations("Time");

  const [localStores, setLocalStores] = useState(stores);
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [lastScrapedFilter, setLastScrapedFilter] = useState<string | null>(null);
  const [publishedFilter, setPublishedFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const hasAnyFilter = statusFilter || platformFilter || lastScrapedFilter || publishedFilter;

  // Computed: unique platforms from data
  const platformOptions = useMemo(() => {
    const platforms = [...new Set(localStores.map((s) => s.platform).filter(Boolean))] as string[];
    return platforms.sort().map((p) => ({
      label: p.charAt(0).toUpperCase() + p.slice(1),
      value: p,
    }));
  }, [localStores]);

  async function togglePause(id: string) {
    const store = localStores.find((s) => s.id === id);
    if (!store) return;
    const newStatus = store.status === "paused" ? "active" : "paused";

    // Optimistic update
    setLocalStores((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: newStatus as Store["status"] } : s
      )
    );

    const res = await fetch(`/api/stores/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!res.ok) {
      // Revert on failure
      setLocalStores((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: store.status } : s
        )
      );
      toast.error(t("updateFailed"));
    }
  }

  async function deleteStore(id: string) {
    const res = await fetch(`/api/stores/${id}`, { method: "DELETE" });
    if (res.ok) {
      setLocalStores((prev) => prev.filter((s) => s.id !== id));
    } else {
      toast.error(t("deleteFailed"));
    }
    setPendingDelete(null);
  }

  const [scrapingIds, setScrapingIds] = useState<Set<string>>(new Set());
  const pollTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const startScrape = useCallback(async (store: Store) => {
    setScrapingIds((prev) => new Set(prev).add(store.id));
    toast(t("scrapeStarted", { name: store.name }));

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: store.id }),
      });

      if (!res.ok) throw new Error("Failed to start scrape");

      const { job_id } = await res.json();

      // Poll for status
      pollTimers.current[store.id] = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/scrape/${job_id}/status`);
          if (!statusRes.ok) return;
          const data = await statusRes.json();

          if (data.status === "completed") {
            clearInterval(pollTimers.current[store.id]);
            delete pollTimers.current[store.id];
            setScrapingIds((prev) => {
              const next = new Set(prev);
              next.delete(store.id);
              return next;
            });
            setLocalStores((prev) =>
              prev.map((s) =>
                s.id === store.id
                  ? { ...s, product_count: data.products_found ?? s.product_count, last_scraped_at: new Date().toISOString() }
                  : s
              )
            );
            toast(t("scrapeCompleted", { count: data.products_found ?? 0 }));
          } else if (data.status === "failed") {
            clearInterval(pollTimers.current[store.id]);
            delete pollTimers.current[store.id];
            setScrapingIds((prev) => {
              const next = new Set(prev);
              next.delete(store.id);
              return next;
            });
            toast.error(t("scrapeFailed", { name: store.name }));
          }
        } catch {
          // keep polling
        }
      }, 5000);
    } catch {
      setScrapingIds((prev) => {
        const next = new Set(prev);
        next.delete(store.id);
        return next;
      });
      toast.error(t("scrapeFailed", { name: store.name }));
    }
  }, [t]);

  const filtered = useMemo(() => {
    let result = localStores;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) || s.url.toLowerCase().includes(q)
      );
    }

    // Status
    if (statusFilter) {
      result = result.filter((s) => s.status === statusFilter);
    }

    // Platform
    if (platformFilter) {
      result = result.filter((s) => s.platform === platformFilter);
    }

    // Last Scraped
    if (lastScrapedFilter) {
      const now = Date.now();
      switch (lastScrapedFilter) {
        case "today": {
          const dayAgo = now - 24 * 60 * 60 * 1000;
          result = result.filter(
            (s) => s.last_scraped_at && new Date(s.last_scraped_at).getTime() > dayAgo
          );
          break;
        }
        case "week": {
          const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
          result = result.filter(
            (s) => s.last_scraped_at && new Date(s.last_scraped_at).getTime() > weekAgo
          );
          break;
        }
        case "older": {
          const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
          result = result.filter(
            (s) => s.last_scraped_at && new Date(s.last_scraped_at).getTime() <= weekAgo
          );
          break;
        }
        case "never":
          result = result.filter((s) => !s.last_scraped_at);
          break;
      }
    }

    // Published
    if (publishedFilter) {
      result = result.filter(
        (s) => (publishedFilter === "published") === s.is_published
      );
    }

    // Sort
    if (sortKey) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        switch (sortKey) {
          case "name":
            cmp = a.name.localeCompare(b.name);
            break;
          case "products":
            cmp = a.product_count - b.product_count;
            break;
          case "lastScraped": {
            const aTime = a.last_scraped_at ? new Date(a.last_scraped_at).getTime() : 0;
            const bTime = b.last_scraped_at ? new Date(b.last_scraped_at).getTime() : 0;
            cmp = aTime - bTime;
            break;
          }
          case "status":
            cmp = a.status.localeCompare(b.status);
            break;
        }
        return sortDir === "desc" ? -cmp : cmp;
      });
    }

    return result;
  }, [localStores, search, statusFilter, platformFilter, lastScrapedFilter, publishedFilter, sortKey, sortDir]);

  function clearAll() {
    setStatusFilter(null);
    setPlatformFilter(null);
    setLastScrapedFilter(null);
    setPublishedFilter(null);
    setSortKey(null);
    setSearch("");
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        // Third click: clear sort
        setSortKey(null);
        setSortDir("asc");
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const statusOptions = [
    { label: t("filterActive"), value: "active" },
    { label: t("filterPaused"), value: "paused" },
    { label: t("filterError"), value: "error" },
  ];

  const lastScrapedOptions = [
    { label: t("filterToday"), value: "today" },
    { label: t("filterThisWeek"), value: "week" },
    { label: t("filterOlder"), value: "older" },
    { label: t("filterNever"), value: "never" },
  ];

  const publishedOptions = [
    { label: t("filterPublished"), value: "published" },
    { label: t("filterUnpublished"), value: "unpublished" },
  ];

  // Sort header helper
  function SortableHeader({ label, sortId }: { label: string; sortId: SortKey }) {
    const isActive = sortKey === sortId;
    return (
      <button
        onClick={() => handleSort(sortId)}
        className="flex items-center gap-1 group"
      >
        {label}
        <ArrowUpDown
          className="w-2.5 h-2.5 transition-colors"
          style={{
            color: isActive ? "var(--primary-text)" : "var(--muted-foreground)",
            opacity: isActive ? 1 : 0.4,
            transform: isActive && sortDir === "desc" ? "scaleY(-1)" : undefined,
          }}
        />
      </button>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Search */}
        <div className="relative" style={{ minWidth: 220 }}>
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: "var(--muted-foreground)" }}
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchStores")}
            className="pl-8 pr-3 py-2 text-xs border-2 outline-none transition-colors duration-150 focus:border-primary"
            style={{
              backgroundColor: "var(--input)",
              borderColor: "var(--border)",
              color: "var(--foreground)",
              borderRadius: 0,
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
            }}
          />
        </div>

        {/* Status */}
        <SimpleFilter
          label={t("status")}
          resetLabel={t("filterAllStatuses")}
          options={statusOptions}
          value={statusFilter}
          onChange={setStatusFilter}
        />

        {/* Platform */}
        {platformOptions.length > 1 && (
          <SimpleFilter
            label={t("filterPlatform")}
            resetLabel={t("filterAllPlatforms")}
            options={platformOptions}
            value={platformFilter}
            onChange={setPlatformFilter}
          />
        )}

        {/* Last Scraped */}
        <SimpleFilter
          label={t("lastScraped")}
          resetLabel={t("filterAllDates")}
          options={lastScrapedOptions}
          value={lastScrapedFilter}
          onChange={setLastScrapedFilter}
        />

        {/* Published */}
        <SimpleFilter
          label={t("filterPublishedLabel")}
          resetLabel={t("filterAllPublished")}
          options={publishedOptions}
          value={publishedFilter}
          onChange={setPublishedFilter}
        />

        {/* Clear all */}
        {(hasAnyFilter || search.trim()) && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:opacity-80"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            <X className="w-3 h-3" />
            {t("clearFilters")}
          </button>
        )}

        {/* Right side: count + add */}
        <div className="ml-auto flex items-center gap-3">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.15em] whitespace-nowrap"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            {hasAnyFilter || search.trim()
              ? search.trim()
                ? t("storesFiltered", {
                    filtered: filtered.length,
                    total: localStores.length,
                    query: search,
                  })
                : t("storesFilteredOnly", {
                    filtered: filtered.length,
                    total: localStores.length,
                  })
              : t("storesFound", { count: localStores.length })}
          </p>
          <AddStoreDialog />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
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
            {t("noStoresFound")}
          </p>
        </div>
      ) : (
        <div
          className="border-2 overflow-auto scrollbar-none"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
            maxHeight: "85vh",
          }}
        >
          <Table style={{ tableLayout: "fixed", width: "100%" }}>
            <colgroup>
              <col style={{ width: "22%" }} />
              <col style={{ width: "26%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "14%" }} />
            </colgroup>
            <TableHeader>
              <TableRow
                className="border-b-2 hover:bg-transparent sticky top-0 z-10"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--card)",
                }}
              >
                <TableHead
                  className="text-[9px] font-bold uppercase tracking-[0.15em] h-10 cursor-pointer"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted-foreground)",
                    backgroundColor: "var(--table-header-bg)",
                  }}
                >
                  <SortableHeader label={t("store")} sortId="name" />
                </TableHead>
                <TableHead
                  className="text-[9px] font-bold uppercase tracking-[0.15em] h-10"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted-foreground)",
                    backgroundColor: "var(--table-header-bg)",
                  }}
                >
                  {t("url")}
                </TableHead>
                <TableHead
                  className="text-[9px] font-bold uppercase tracking-[0.15em] h-10 cursor-pointer"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted-foreground)",
                    backgroundColor: "var(--table-header-bg)",
                  }}
                >
                  <SortableHeader label={t("products")} sortId="products" />
                </TableHead>
                <TableHead
                  className="text-[9px] font-bold uppercase tracking-[0.15em] h-10 cursor-pointer"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted-foreground)",
                    backgroundColor: "var(--table-header-bg)",
                  }}
                >
                  <SortableHeader label={t("lastScraped")} sortId="lastScraped" />
                </TableHead>
                <TableHead
                  className="text-[9px] font-bold uppercase tracking-[0.15em] h-10 cursor-pointer"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted-foreground)",
                    backgroundColor: "var(--table-header-bg)",
                  }}
                >
                  <SortableHeader label={t("status")} sortId="status" />
                </TableHead>
                <TableHead
                  className="text-[9px] font-bold uppercase tracking-[0.15em] h-10"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted-foreground)",
                    backgroundColor: "var(--table-header-bg)",
                  }}
                >
                  {/* Actions - no label */}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((store) => (
                <TableRow
                  key={store.id}
                  className="border-b hover:bg-[var(--table-header-bg)]"
                  style={{ borderColor: "var(--border)" }}
                >
                  {/* Store Name */}
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 flex-shrink-0 relative flex items-center justify-center overflow-hidden"
                        style={{
                          backgroundColor: "transparent",
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${new URL(store.url).hostname}&sz=32`}
                          alt={store.name}
                          className="w-5 h-5 object-contain"
                        />
                      </div>
                      <span className="text-[11px] font-semibold truncate">
                        <Highlight text={store.name} query={search} />
                      </span>
                    </div>
                  </TableCell>

                  {/* URL */}
                  <TableCell>
                    <span
                      className="text-[10px] font-bold tracking-wider truncate block"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      <Highlight
                        text={store.url.replace("https://", "")}
                        query={search}
                      />
                    </span>
                  </TableCell>

                  {/* Products */}
                  <TableCell>
                    <span
                      className="text-[11px] font-bold"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {store.product_count.toLocaleString()}
                    </span>
                  </TableCell>

                  {/* Last Scraped */}
                  <TableCell>
                    <span
                      className="text-[10px] font-bold tracking-wider"
                      suppressHydrationWarning
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {formatRelativeTime(store.last_scraped_at, tt)}
                    </span>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <StatusBadge status={store.status} />
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    {pendingDelete === store.id ? (
                      <div className="flex items-center gap-1.5">
                        <IconButton
                          onClick={() => {
                            toast(t("deleted", { name: store.name }));
                            deleteStore(store.id);
                          }}
                          icon={Check}
                          variant="danger"
                          title={t("delete")}
                        />
                        <IconButton
                          onClick={() => setPendingDelete(null)}
                          icon={X}
                          title={t("cancel")}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <IconButton
                          onClick={() => window.open(store.url, "_blank")}
                          icon={ExternalLink}
                          title={t("visitStore")}
                        />
                        {scrapingIds.has(store.id) ? (
                          <button
                            disabled
                            title={t("scraping")}
                            className="w-7 h-7 flex items-center justify-center transition-all duration-150"
                            style={{
                              backgroundColor: "var(--primary-muted)",
                              border: "1.5px solid var(--primary-muted)",
                              color: "var(--primary-text)",
                            }}
                          >
                            <ArrowDownToLine className="w-3 h-3 animate-bounce" />
                          </button>
                        ) : (
                          <IconButton
                            onClick={() => startScrape(store)}
                            icon={ArrowDownToLine}
                            title={t("scrape")}
                          />
                        )}
                        <IconButton
                          onClick={() => {
                            togglePause(store.id);
                            toast(
                              store.status === "paused"
                                ? t("resumed", { name: store.name })
                                : t("paused", { name: store.name })
                            );
                          }}
                          icon={store.status === "paused" ? Play : Pause}
                          title={
                            store.status === "paused"
                              ? t("resume")
                              : t("pause")
                          }
                        />
                        <IconButton
                          onClick={() => setPendingDelete(store.id)}
                          icon={Trash2}
                          variant="danger"
                          title={t("delete")}
                        />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
