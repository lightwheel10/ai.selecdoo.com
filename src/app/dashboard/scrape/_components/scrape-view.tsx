"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Scan, Loader2, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { JobStatusCard } from "./job-status-card";
import { ScrapeResults } from "./scrape-results";
import type { Store, Product } from "@/types";

type ScrapePhase = "idle" | "scraping" | "completed" | "failed";

const STATUS_KEYS = [
  "initializing",
  "connecting",
  "analyzingStore",
  "fetchingProducts",
  "processingData",
  "savingResults",
] as const;

interface ScrapeViewProps {
  stores: Store[];
  mockProducts: Product[];
}

export function ScrapeView({ stores, mockProducts }: ScrapeViewProps) {
  const t = useTranslations("Scrape");

  // Form state
  const [url, setUrl] = useState("");

  // Scraping state
  const [phase, setPhase] = useState<ScrapePhase>("idle");
  const [statusIndex, setStatusIndex] = useState(0);
  const [productsFound, setProductsFound] = useState(0);
  const [jobId, setJobId] = useState("");
  const [startTime, setStartTime] = useState<Date | null>(null);

  const statusTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const productsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const targetProducts = mockProducts.length;

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (statusTimerRef.current) clearInterval(statusTimerRef.current);
      if (productsTimerRef.current) clearInterval(productsTimerRef.current);
    };
  }, []);

  function generateJobId() {
    return `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function handleStartScrape(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || phase === "scraping") return;

    // Init scraping
    setPhase("scraping");
    setStatusIndex(0);
    setProductsFound(0);
    const newJobId = generateJobId();
    setJobId(newJobId);
    setStartTime(new Date());

    // Cycle through status messages every 2 seconds
    let currentIndex = 0;
    statusTimerRef.current = setInterval(() => {
      currentIndex++;
      if (currentIndex >= STATUS_KEYS.length) {
        // All statuses cycled — complete
        if (statusTimerRef.current) clearInterval(statusTimerRef.current);
        if (productsTimerRef.current) clearInterval(productsTimerRef.current);
        statusTimerRef.current = null;
        productsTimerRef.current = null;

        setProductsFound(targetProducts);
        setPhase("completed");

        const storeName = url
          .replace("https://", "")
          .replace("http://", "")
          .split("/")[0];
        toast(t("scrapeComplete"), {
          description: t("scrapeCompleteDescription", {
            count: targetProducts,
            store: storeName,
          }),
        });
      } else {
        setStatusIndex(currentIndex);
      }
    }, 2000);

    // Increment products found gradually
    let currentProducts = 0;
    const increment = Math.max(1, Math.floor(targetProducts / 10));
    productsTimerRef.current = setInterval(() => {
      currentProducts = Math.min(
        currentProducts + Math.floor(Math.random() * increment) + 1,
        targetProducts - 1
      );
      setProductsFound(currentProducts);
    }, 800);
  }

  function handleReset() {
    if (statusTimerRef.current) {
      clearInterval(statusTimerRef.current);
      statusTimerRef.current = null;
    }
    if (productsTimerRef.current) {
      clearInterval(productsTimerRef.current);
      productsTimerRef.current = null;
    }

    setPhase("idle");
    setUrl("");
    setStatusIndex(0);
    setProductsFound(0);
    setJobId("");
    setStartTime(null);
  }

  const existingStore = stores.find(
    (s) =>
      url &&
      s.url.includes(
        url
          .replace("https://", "")
          .replace("http://", "")
          .split("/")[0]
      )
  );

  const isScraping = phase === "scraping";

  return (
    <div className="space-y-6">
      {/* ─── Form ─── */}
      <div
        className="border-2 p-6"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
          <div className="flex items-center justify-between mb-5">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.15em]"
              style={{
                fontFamily: "var(--font-mono)",
                color: "#CAFF04",
              }}
            >
              {t("newScrape")}
            </p>
            {phase !== "idle" && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:opacity-80"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                }}
              >
                <RotateCcw className="w-3 h-3" />
                {t("reset")}
              </button>
            )}
          </div>

          <form onSubmit={handleStartScrape}>
            <Label
              htmlFor="scrape-url"
              className="block text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--foreground)",
                opacity: 0.5,
              }}
            >
              {t("storeUrl")}
            </Label>
            <div className="flex items-end gap-3">
              <Input
                id="scrape-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t("placeholder")}
                disabled={isScraping}
                className="flex-1 px-3 py-2.5 text-xs border-2 outline-none transition-colors duration-150 focus:border-primary"
                style={{
                  backgroundColor: "var(--input)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                  borderRadius: 0,
                }}
                autoFocus
              />
              <button
                type="submit"
                disabled={!url.trim() || isScraping}
                className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider border-2 transition-all duration-150 whitespace-nowrap active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:pointer-events-none bg-primary text-primary-foreground border-primary shadow-[3px_3px_0px] shadow-primary"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {isScraping ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {t("scraping")}
                  </>
                ) : (
                  <>
                    <Scan className="w-3.5 h-3.5" />
                    {t("startScraping")}
                  </>
                )}
              </button>
            </div>

            {existingStore && !isScraping && (
              <div
                className="mt-3 px-3 py-2 text-[10px] font-bold tracking-wider"
                style={{
                  fontFamily: "var(--font-mono)",
                  backgroundColor: "rgba(202,255,4,0.06)",
                  border: "1.5px solid rgba(202,255,4,0.2)",
                  color: "#CAFF04",
                }}
              >
                {t("alreadyMonitored", { name: existingStore.name })}
              </div>
            )}
          </form>

          {/* Quick re-scrape — only in idle */}
          {phase === "idle" && stores.filter((s) => s.status === "active").length > 0 && (
            <div
              className="mt-5 pt-5"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <p
                className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                }}
              >
                {t("quickRescrape")}
              </p>
              <div className="flex flex-wrap gap-2">
                {stores
                  .filter((s) => s.status === "active")
                  .map((store) => (
                    <button
                      key={store.id}
                      onClick={() => setUrl(store.url)}
                      className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border transition-colors hover:border-primary/50"
                      style={{
                        fontFamily: "var(--font-mono)",
                        backgroundColor: "transparent",
                        borderColor: "var(--border)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {store.name}
                    </button>
                  ))}
              </div>
            </div>
          )}
      </div>

      {/* ─── Job Status Card ─── */}
      {phase !== "idle" && (
        <JobStatusCard
          phase={phase}
          statusKey={STATUS_KEYS[statusIndex]}
          jobId={jobId}
          startTime={startTime}
          productsFound={productsFound}
        />
      )}

      {/* ─── Results ─── */}
      {phase === "completed" && <ScrapeResults products={mockProducts} />}
    </div>
  );
}
