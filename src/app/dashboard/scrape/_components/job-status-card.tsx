"use client";

import { useTranslations, useLocale } from "next-intl";

type Phase = "scraping" | "completed" | "failed";

interface JobStatusCardProps {
  phase: Phase;
  statusKey: string;
  jobId: string;
  startTime: Date | null;
  productsFound: number;
}

const STATUS_COUNT = 6;

export function JobStatusCard({
  phase,
  statusKey,
  jobId,
  startTime,
  productsFound,
}: JobStatusCardProps) {
  const t = useTranslations("Scrape");
  const locale = useLocale();

  const statusColor =
    phase === "completed"
      ? "#22C55E"
      : phase === "failed"
        ? "#FF453A"
        : "#CAFF04";

  const statusText =
    phase === "completed"
      ? t("completed")
      : phase === "failed"
        ? t("failed")
        : t(statusKey);

  // Progress grows with each status step during scraping
  const statusIndexMap: Record<string, number> = {
    initializing: 0,
    connecting: 1,
    analyzingStore: 2,
    fetchingProducts: 3,
    fallbackScraping: 3,
    processingData: 4,
    savingResults: 5,
  };
  const currentIndex = statusIndexMap[statusKey] ?? 0;
  const progressPercent =
    phase === "completed" || phase === "failed"
      ? 100
      : Math.round(((currentIndex + 1) / STATUS_COUNT) * 85) + 10;

  const dateLocale = locale === "de" ? "de-DE" : "en-US";

  return (
    <div
      className="border-2 p-6"
      style={{
        backgroundColor: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
          }}
        >
          {t("jobStatus")}
        </p>
        <div className="flex items-center gap-2">
          {phase === "scraping" && (
            <span
              className="w-1.5 h-1.5 animate-pulse"
              style={{ backgroundColor: statusColor }}
            />
          )}
          <span
            className="text-[10px] font-bold uppercase tracking-[0.15em] px-2.5 py-1"
            style={{
              fontFamily: "var(--font-mono)",
              color: statusColor,
              backgroundColor: `${statusColor}12`,
              border: `1.5px solid ${statusColor}40`,
            }}
          >
            {statusText}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="h-1.5 mb-5 overflow-hidden"
        style={{ backgroundColor: "var(--input)" }}
      >
        <div
          className={`h-full transition-all duration-1000 ease-out ${phase === "scraping" ? "animate-pulse" : ""}`}
          style={{
            width: `${progressPercent}%`,
            backgroundColor: statusColor,
          }}
        />
      </div>

      {/* Job info grid */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p
            className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            {t("jobId")}
          </p>
          <p
            className="text-[11px] font-bold truncate"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {jobId}
          </p>
        </div>
        <div>
          <p
            className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            {t("startTime")}
          </p>
          <p
            className="text-[11px] font-bold"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {startTime
              ? startTime.toLocaleTimeString(dateLocale, {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })
              : "—"}
          </p>
        </div>
        <div>
          <p
            className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            {t("productsFound")}
          </p>
          <p
            className="text-xl font-bold"
            style={{
              fontFamily: "var(--font-display)",
              color: statusColor,
            }}
          >
            {productsFound}
          </p>
        </div>
      </div>
    </div>
  );
}
