"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { MonitoringConfig } from "@/types";

interface MonitoringTableProps {
  configs: MonitoringConfig[];
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

export function MonitoringTable({ configs }: MonitoringTableProps) {
  const t = useTranslations("Monitoring");
  const tt = useTranslations("Time");

  const headers = [
    t("store"),
    t("interval"),
    t("status"),
    t("lastCheck"),
    t("nextCheck"),
    "",
  ];

  return (
    <div
      className="border-2"
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
            {headers.map((header) => (
              <TableHead
                key={header}
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
          {configs.map((config) => (
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
                    color: config.next_check_at ? "var(--foreground)" : "var(--muted-foreground)",
                  }}
                >
                  {formatNextCheck(config.next_check_at, t)}
                </span>
              </TableCell>

              {/* Toggle */}
              <TableCell className="text-right">
                <button
                  onClick={() => {
                    toast(
                      config.enabled
                        ? t("monitoringPaused", { name: config.store_name })
                        : t("monitoringResumed", { name: config.store_name })
                    );
                  }}
                  className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] border transition-colors hover:border-primary/50"
                  style={{
                    fontFamily: "var(--font-mono)",
                    backgroundColor: "transparent",
                    borderColor: "var(--border)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  {config.enabled ? t("pause") : t("resume")}
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
