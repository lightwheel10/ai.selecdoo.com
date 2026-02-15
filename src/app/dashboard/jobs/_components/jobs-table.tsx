"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Eye, Trash2, Search } from "lucide-react";
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

  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return jobs;
    const q = search.toLowerCase();
    return jobs.filter((job) => {
      if (job.store_name.toLowerCase().includes(q)) return true;
      if (job.status.toLowerCase().includes(q)) return true;
      if (job.id.toLowerCase().includes(q)) return true;
      if (formatDateTime(job.started_at, locale).toLowerCase().includes(q))
        return true;
      return false;
    });
  }, [jobs, search, locale]);

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

  const headers = [
    t("store"),
    t("status"),
    t("productsFound"),
    t("updated"),
    t("started"),
    t("duration"),
    t("error"),
    t("actions"),
  ];

  return (
    <div
      className="border-2"
      style={{
        backgroundColor: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      {/* Search bar + count */}
      <div
        className="flex items-center justify-between gap-4 px-4 py-3"
        style={{ borderBottom: "2px solid var(--border)" }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em] whitespace-nowrap"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
          }}
        >
          {search.trim()
            ? t("jobsFiltered", {
                filtered: filtered.length,
                total: jobs.length,
                query: search.trim(),
              })
            : t("jobsFound", { count: jobs.length })}
        </p>

        <div className="relative" style={{ maxWidth: 280 }}>
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
      </div>

      <div className="overflow-auto scrollbar-none" style={{ maxHeight: "70vh" }}>
      <Table>
        <TableHeader className="sticky top-0 z-10">
          <TableRow
            className="border-b-2 hover:bg-transparent"
            style={{ borderColor: "var(--border)" }}
          >
            {headers.map((header) => (
              <TableHead
                key={header}
                className="text-[9px] font-bold uppercase tracking-[0.15em] h-10"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                  backgroundColor: "var(--card)",
                }}
              >
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={headers.length}
                className="text-center py-12"
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
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((job) => (
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
            ))
          )}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
