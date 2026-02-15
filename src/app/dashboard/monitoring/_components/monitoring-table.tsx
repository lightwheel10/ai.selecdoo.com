"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Play, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { MonitoringConfig, MonitoringLog } from "@/types";

interface MonitoringTableProps {
  configs: MonitoringConfig[];
  logs: MonitoringLog[];
}

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

function formatNextCheck(
  timestamp: string | null,
  t: (key: string, values?: { hours?: number; minutes?: number }) => string
) {
  if (!timestamp) return "—";
  const diff = new Date(timestamp).getTime() - Date.now();
  if (diff <= 0) return t("overdue");
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return t("inHoursMinutes", { hours, minutes });
  return t("inMinutes", { minutes });
}

const statusColors: Record<string, string> = {
  completed: "#22C55E",
  running: "#FF9F0A",
  failed: "#FF453A",
};

export function MonitoringTable({ configs, logs }: MonitoringTableProps) {
  const t = useTranslations("Monitoring");
  const tt = useTranslations("Time");
  const st = useTranslations("Status");
  const [runningStores, setRunningStores] = useState<Set<string>>(new Set());

  // Map store_id → latest log
  const latestLogMap = new Map<string, MonitoringLog>();
  for (const log of logs) {
    const existing = latestLogMap.get(log.store_id);
    if (!existing || log.started_at > existing.started_at) {
      latestLogMap.set(log.store_id, log);
    }
  }

  function handleRunNow(storeId: string, storeName: string) {
    setRunningStores((prev) => new Set(prev).add(storeId));
    // Simulate a run (2.5s)
    setTimeout(() => {
      setRunningStores((prev) => {
        const next = new Set(prev);
        next.delete(storeId);
        return next;
      });
      toast(t("runComplete", { name: storeName }));
    }, 2500);
  }

  const headers = [
    t("store"),
    t("interval"),
    t("status"),
    t("lastRun"),
    t("lastCheck"),
    t("nextCheck"),
    "",
  ];

  return (
    <div
      className="border-2 overflow-x-auto"
      style={{
        backgroundColor: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      <Table>
        <TableHeader>
          <TableRow
            className="border-b-2 hover:bg-transparent"
            style={{ borderColor: "var(--border)" }}
          >
            {headers.map((header, i) => (
              <TableHead
                key={i}
                className="text-[9px] font-bold uppercase tracking-[0.15em] h-10"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                  backgroundColor: "rgba(255,255,255,0.02)",
                }}
              >
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {configs.map((config) => {
            const latestLog = latestLogMap.get(config.store_id);
            const isRunning = runningStores.has(config.store_id);
            const logStatus = latestLog?.status;
            const logColor = logStatus
              ? statusColors[logStatus] || "var(--muted-foreground)"
              : "var(--muted-foreground)";

            return (
              <TableRow
                key={config.id}
                className="border-b hover:bg-white/[0.02]"
                style={{ borderColor: "var(--border)" }}
              >
                {/* Store */}
                <TableCell className="py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 flex-shrink-0 flex items-center justify-center text-[9px] font-bold"
                      style={{
                        fontFamily: "var(--font-mono)",
                        backgroundColor: "rgba(202,255,4,0.10)",
                        color: "#CAFF04",
                      }}
                    >
                      {config.store_name[0]}
                    </div>
                    <span className="text-[11px] font-semibold">
                      {config.store_name}
                    </span>
                  </div>
                </TableCell>

                {/* Interval */}
                <TableCell>
                  <span
                    className="text-[10px] font-bold tracking-wider"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    {t("every", { hours: config.check_interval_hours })}
                  </span>
                </TableCell>

                {/* Enabled/Disabled */}
                <TableCell>
                  <span
                    className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: config.enabled ? "#22C55E" : "#555555",
                      backgroundColor: config.enabled
                        ? "rgba(34,197,94,0.07)"
                        : "rgba(85,85,85,0.07)",
                      border: `1.5px solid ${config.enabled ? "rgba(34,197,94,0.25)" : "rgba(85,85,85,0.25)"}`,
                    }}
                  >
                    {config.enabled ? t("enabled") : t("disabled")}
                  </span>
                </TableCell>

                {/* Last Run Status */}
                <TableCell>
                  {latestLog ? (
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-1.5 h-1.5 flex-shrink-0"
                        style={{ backgroundColor: logColor }}
                      />
                      <span
                        className="text-[10px] font-bold tracking-wider"
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: logColor,
                        }}
                      >
                        {st(logStatus!)}
                      </span>
                      {latestLog.changes_detected > 0 && (
                        <span
                          className="text-[9px] font-bold tracking-wider"
                          style={{
                            fontFamily: "var(--font-mono)",
                            color: "var(--muted-foreground)",
                          }}
                        >
                          ({latestLog.changes_detected})
                        </span>
                      )}
                    </div>
                  ) : (
                    <span
                      className="text-[10px] font-bold tracking-wider"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      —
                    </span>
                  )}
                </TableCell>

                {/* Last Check */}
                <TableCell>
                  <span
                    className="text-[10px] font-bold tracking-wider"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    {formatRelativeTime(config.last_check_at, tt)}
                  </span>
                </TableCell>

                {/* Next Check */}
                <TableCell>
                  <span
                    className="text-[10px] font-bold tracking-wider"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: config.next_check_at
                        ? "var(--foreground)"
                        : "var(--muted-foreground)",
                    }}
                  >
                    {formatNextCheck(config.next_check_at, t)}
                  </span>
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    {/* Run Now */}
                    <button
                      onClick={() =>
                        handleRunNow(config.store_id, config.store_name)
                      }
                      disabled={isRunning || !config.enabled}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:opacity-80 disabled:opacity-40 disabled:pointer-events-none"
                      style={{
                        fontFamily: "var(--font-mono)",
                        backgroundColor: "#CAFF0412",
                        border: "1.5px solid #CAFF0440",
                        color: "#CAFF04",
                      }}
                    >
                      {isRunning ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                      {isRunning ? t("running") : t("runNow")}
                    </button>

                    {/* Pause/Resume */}
                    <button
                      onClick={() => {
                        toast(
                          config.enabled
                            ? t("monitoringPaused", {
                                name: config.store_name,
                              })
                            : t("monitoringResumed", {
                                name: config.store_name,
                              })
                        );
                      }}
                      className="px-2 py-1 text-[10px] font-bold uppercase tracking-[0.15em] border transition-colors hover:border-primary/50"
                      style={{
                        fontFamily: "var(--font-mono)",
                        backgroundColor: "transparent",
                        borderColor: "var(--border)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {config.enabled ? t("pause") : t("resume")}
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
