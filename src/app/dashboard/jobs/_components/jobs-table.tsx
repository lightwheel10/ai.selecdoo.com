"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  Trash2,
  Search,
  X,
  Check,
  ChevronDown,
  ArrowUpDown,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useTranslations, useLocale } from "next-intl";
import { StatusBadge } from "@/components/domain/status-badge";
import { toast } from "sonner";
import type { ScrapeJob, Store } from "@/types";

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
            backgroundColor: value ? "rgba(202,255,4,0.06)" : "transparent",
            borderColor: value ? "rgba(202,255,4,0.3)" : "var(--border)",
            color: value ? "#CAFF04" : "var(--muted-foreground)",
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
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-white/[0.04]"
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
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-white/[0.04]"
            style={{ fontFamily: "var(--font-mono)", borderRadius: 0 }}
          >
            {value === option.value ? (
              <Check className="w-3 h-3 text-[#CAFF04]" />
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

// ─── Searchable Filter (for store list) ───

function SearchableFilter({
  label,
  resetLabel,
  searchPlaceholder,
  emptyText,
  options,
  value,
  onChange,
}: {
  label: string;
  resetLabel: string;
  searchPlaceholder: string;
  emptyText: string;
  options: string[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          suppressHydrationWarning
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors"
          style={{
            fontFamily: "var(--font-mono)",
            backgroundColor: value ? "rgba(202,255,4,0.06)" : "transparent",
            borderColor: value ? "rgba(202,255,4,0.3)" : "var(--border)",
            color: value ? "#CAFF04" : "var(--muted-foreground)",
          }}
        >
          {value || label}
          <ChevronDown className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="p-0 border-2 w-[220px]"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--card)",
          borderRadius: 0,
        }}
      >
        <Command
          style={{ backgroundColor: "transparent", borderRadius: 0 }}
        >
          <CommandInput
            placeholder={searchPlaceholder}
            className="text-[11px]"
            style={{ fontFamily: "var(--font-mono)", borderRadius: 0 }}
          />
          <CommandList
            className="scrollbar-none"
            style={{ maxHeight: 240 }}
          >
            <CommandEmpty>
              <span
                className="text-[10px] font-bold uppercase tracking-[0.15em]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                }}
              >
                {emptyText}
              </span>
            </CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className="text-[10px] font-bold uppercase tracking-[0.15em]"
                  style={{ fontFamily: "var(--font-mono)", borderRadius: 0 }}
                >
                  <X className="w-3 h-3 mr-1.5 opacity-50" />
                  {resetLabel}
                </CommandItem>
              )}
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => {
                    onChange(option === value ? null : option);
                    setOpen(false);
                  }}
                  className="text-[10px] font-bold uppercase tracking-[0.15em]"
                  style={{ fontFamily: "var(--font-mono)", borderRadius: 0 }}
                >
                  {value === option ? (
                    <Check className="w-3 h-3 mr-1.5 text-[#CAFF04]" />
                  ) : (
                    <span className="w-3 mr-1.5" />
                  )}
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Helpers ───

interface JobsTableProps {
  jobs: ScrapeJob[];
  stores: Store[];
}

function formatDuration(start: string, end: string | null) {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}

function formatDateTime(timestamp: string, locale: string) {
  const dateLocale = locale === "de" ? "de-DE" : "en-US";
  const d = new Date(timestamp);
  return d.toLocaleDateString(dateLocale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Sort Options ───

type SortKey = "store" | "productsFound" | "started" | "duration";
type SortDir = "asc" | "desc";

// ─── Jobs Table ───

export function JobsTable({ jobs, stores }: JobsTableProps) {
  const t = useTranslations("Jobs");
  const locale = useLocale();
  const router = useRouter();

  const storeUrlMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of stores) {
      map[s.name] = s.url;
    }
    return map;
  }, [stores]);

  const storeNames = useMemo(
    () => [...new Set(jobs.map((j) => j.store_name))].filter(Boolean).sort(),
    [jobs]
  );

  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [storeFilter, setStoreFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const hasAnyFilter = statusFilter || storeFilter || dateFilter;

  const filtered = useMemo(() => {
    let result = jobs;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((job) => {
        if (job.store_name.toLowerCase().includes(q)) return true;
        if (job.status.toLowerCase().includes(q)) return true;
        if (job.id.toLowerCase().includes(q)) return true;
        if (formatDateTime(job.started_at, locale).toLowerCase().includes(q))
          return true;
        return false;
      });
    }

    // Status
    if (statusFilter) {
      result = result.filter((j) => j.status === statusFilter);
    }

    // Store
    if (storeFilter) {
      result = result.filter((j) => j.store_name === storeFilter);
    }

    // Date
    if (dateFilter) {
      const now = Date.now();
      switch (dateFilter) {
        case "today": {
          const dayAgo = now - 24 * 60 * 60 * 1000;
          result = result.filter(
            (j) => new Date(j.started_at).getTime() > dayAgo
          );
          break;
        }
        case "week": {
          const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
          result = result.filter(
            (j) => new Date(j.started_at).getTime() > weekAgo
          );
          break;
        }
        case "older": {
          const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
          result = result.filter(
            (j) => new Date(j.started_at).getTime() <= weekAgo
          );
          break;
        }
      }
    }

    // Sort
    if (sortKey) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        switch (sortKey) {
          case "store":
            cmp = a.store_name.localeCompare(b.store_name);
            break;
          case "productsFound":
            cmp = a.products_found - b.products_found;
            break;
          case "started":
            cmp = new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
            break;
          case "duration": {
            const durA = a.completed_at
              ? new Date(a.completed_at).getTime() - new Date(a.started_at).getTime()
              : 0;
            const durB = b.completed_at
              ? new Date(b.completed_at).getTime() - new Date(b.started_at).getTime()
              : 0;
            cmp = durA - durB;
            break;
          }
        }
        return sortDir === "desc" ? -cmp : cmp;
      });
    }

    return result;
  }, [jobs, search, locale, statusFilter, storeFilter, dateFilter, sortKey, sortDir]);

  function clearAll() {
    setStatusFilter(null);
    setStoreFilter(null);
    setDateFilter(null);
    setSortKey(null);
    setSearch("");
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        setSortKey(null);
        setSortDir("asc");
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

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
            color: isActive ? "#CAFF04" : "var(--muted-foreground)",
            opacity: isActive ? 1 : 0.4,
            transform: isActive && sortDir === "desc" ? "scaleY(-1)" : undefined,
          }}
        />
      </button>
    );
  }

  function handleView(jobId: string) {
    router.push(`/dashboard/scrape?jobId=${jobId}`);
  }

  function handleDelete(job: ScrapeJob) {
    setPendingDelete(job.id);
  }

  function confirmDelete(jobId: string) {
    // TODO: real Supabase delete
    setPendingDelete(null);
    toast(t("jobDeleted"), {
      description: t("jobDeletedDescription", { id: jobId.slice(0, 8) }),
    });
  }

  const statusOptions = [
    { label: t("completed"), value: "completed" },
    { label: t("running"), value: "running" },
    { label: t("failed"), value: "failed" },
    { label: t("filterPending"), value: "pending" },
  ];

  const dateOptions = [
    { label: t("filterToday"), value: "today" },
    { label: t("filterThisWeek"), value: "week" },
    { label: t("filterOlder"), value: "older" },
  ];

  // Headers defined inline with sortable support

  return (
    <div>
      {/* Toolbar — above the table */}
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
            placeholder={t("searchJobs")}
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

        {/* Store */}
        <SearchableFilter
          label={t("store")}
          resetLabel={t("filterAllStores")}
          searchPlaceholder={t("filterSearchStore")}
          emptyText={t("filterNoResults")}
          options={storeNames}
          value={storeFilter}
          onChange={setStoreFilter}
        />

        {/* Date */}
        <SimpleFilter
          label={t("started")}
          resetLabel={t("filterAllDates")}
          options={dateOptions}
          value={dateFilter}
          onChange={setDateFilter}
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

        {/* Count */}
        <p
          className="ml-auto text-[10px] font-bold uppercase tracking-[0.15em] whitespace-nowrap"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
          }}
        >
          {hasAnyFilter || search.trim()
            ? search.trim()
              ? t("jobsFiltered", {
                  filtered: filtered.length,
                  total: jobs.length,
                  query: search,
                })
              : t("jobsFilteredOnly", {
                  filtered: filtered.length,
                  total: jobs.length,
                })
            : t("jobsFound", { count: jobs.length })}
        </p>
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
            {t("noJobsFound")}
          </p>
        </div>
      ) : (
        <div
          className="border-2 overflow-auto scrollbar-none"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
            maxHeight: "70vh",
          }}
        >
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow
                className="border-b-2 hover:bg-transparent"
                style={{ borderColor: "var(--border)" }}
              >
                <TableHead
                  className="text-[9px] font-bold uppercase tracking-[0.15em] h-10 cursor-pointer"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted-foreground)",
                    backgroundColor: "var(--card)",
                  }}
                >
                  <SortableHeader label={t("store")} sortId="store" />
                </TableHead>
                <TableHead
                  className="text-[9px] font-bold uppercase tracking-[0.15em] h-10"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted-foreground)",
                    backgroundColor: "var(--card)",
                  }}
                >
                  {t("status")}
                </TableHead>
                <TableHead
                  className="text-[9px] font-bold uppercase tracking-[0.15em] h-10 cursor-pointer"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted-foreground)",
                    backgroundColor: "var(--card)",
                  }}
                >
                  <SortableHeader label={t("productsFound")} sortId="productsFound" />
                </TableHead>
                <TableHead
                  className="text-[9px] font-bold uppercase tracking-[0.15em] h-10"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted-foreground)",
                    backgroundColor: "var(--card)",
                  }}
                >
                  {t("updated")}
                </TableHead>
                <TableHead
                  className="text-[9px] font-bold uppercase tracking-[0.15em] h-10 cursor-pointer"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted-foreground)",
                    backgroundColor: "var(--card)",
                  }}
                >
                  <SortableHeader label={t("started")} sortId="started" />
                </TableHead>
                <TableHead
                  className="text-[9px] font-bold uppercase tracking-[0.15em] h-10 cursor-pointer"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted-foreground)",
                    backgroundColor: "var(--card)",
                  }}
                >
                  <SortableHeader label={t("duration")} sortId="duration" />
                </TableHead>
                <TableHead
                  className="text-[9px] font-bold uppercase tracking-[0.15em] h-10"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted-foreground)",
                    backgroundColor: "var(--card)",
                  }}
                >
                  {t("error")}
                </TableHead>
                <TableHead
                  className="text-[9px] font-bold uppercase tracking-[0.15em] h-10"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted-foreground)",
                    backgroundColor: "var(--card)",
                  }}
                >
                  {/* Actions - no label */}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((job) => (
                <TableRow
                  key={job.id}
                  className="border-b hover:bg-white/[0.02]"
                  style={{ borderColor: "var(--border)" }}
                >
                  {/* Store */}
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 flex-shrink-0 relative flex items-center justify-center overflow-hidden"
                        style={{ backgroundColor: "transparent" }}
                      >
                        {storeUrlMap[job.store_name] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${new URL(storeUrlMap[job.store_name]).hostname}&sz=32`}
                            alt={job.store_name}
                            className="w-5 h-5 object-contain"
                          />
                        ) : (
                          <span
                            className="text-[9px] font-bold"
                            style={{
                              fontFamily: "var(--font-mono)",
                              color: "#CAFF04",
                            }}
                          >
                            {job.store_name[0]}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold">
                        {job.store_name}
                      </span>
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <StatusBadge status={job.status} />
                  </TableCell>

                  {/* Products Found */}
                  <TableCell>
                    <span
                      className="text-[11px] font-bold"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {job.products_found > 0
                        ? job.products_found.toLocaleString()
                        : "—"}
                    </span>
                  </TableCell>

                  {/* Updated */}
                  <TableCell>
                    <span
                      className="text-[11px] font-bold"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {job.products_updated > 0 ? job.products_updated : "—"}
                    </span>
                  </TableCell>

                  {/* Started */}
                  <TableCell>
                    <span
                      className="text-[10px] font-bold tracking-wider"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {formatDateTime(job.started_at, locale)}
                    </span>
                  </TableCell>

                  {/* Duration */}
                  <TableCell>
                    <span
                      className="text-[10px] font-bold tracking-wider"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {formatDuration(job.started_at, job.completed_at)}
                    </span>
                  </TableCell>

                  {/* Error */}
                  <TableCell className="max-w-[200px]">
                    {job.error_message ? (
                      <span
                        className="text-[10px] font-bold tracking-wider truncate block"
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--destructive)",
                        }}
                        title={job.error_message}
                      >
                        {job.error_message}
                      </span>
                    ) : (
                      <span
                        className="text-[10px] tracking-wider"
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        —
                      </span>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    {pendingDelete === job.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => confirmDelete(job.id)}
                          className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.15em] transition-all duration-150 hover:opacity-80"
                          style={{
                            fontFamily: "var(--font-mono)",
                            backgroundColor: "#FF453A12",
                            border: "1.5px solid #FF453A40",
                            color: "#FF453A",
                          }}
                        >
                          {t("delete")}
                        </button>
                        <button
                          onClick={() => setPendingDelete(null)}
                          className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.15em] border-2 transition-all duration-150 hover:opacity-80"
                          style={{
                            fontFamily: "var(--font-mono)",
                            borderColor: "var(--border)",
                            color: "var(--muted-foreground)",
                          }}
                        >
                          {t("cancel")}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {/* View — Ghost button */}
                        <button
                          onClick={() => handleView(job.id)}
                          className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.15em] border-2 transition-all duration-150 hover:opacity-80"
                          style={{
                            fontFamily: "var(--font-mono)",
                            borderColor: "var(--border)",
                            color: "var(--muted-foreground)",
                          }}
                        >
                          <Eye className="w-3 h-3" />
                          {t("view")}
                        </button>
                        {/* Delete — Danger button */}
                        <button
                          onClick={() => handleDelete(job)}
                          className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.15em] transition-all duration-150 hover:opacity-80"
                          style={{
                            fontFamily: "var(--font-mono)",
                            backgroundColor: "#FF453A12",
                            border: "1.5px solid #FF453A40",
                            color: "#FF453A",
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                          {t("delete")}
                        </button>
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
