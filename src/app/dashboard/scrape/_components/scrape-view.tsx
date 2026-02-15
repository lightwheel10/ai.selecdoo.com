"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Scan, Loader2, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { JobStatusCard } from "./job-status-card";
import { ScrapeResults } from "./scrape-results";
import type { Store, Product } from "@/types";

type ScrapePhase = "idle" | "scraping" | "completed" | "failed";

const STATUS_FLOW: Record<string, string> = {
  READY: "initializing",
  RUNNING: "fetchingProducts",
  SUCCEEDED: "savingResults",
};

const QUICK_SCRAPE_LIMIT = 5;

function QuickRescrape({
  stores,
  onSelect,
  label,
  showAllLabel,
  showLessLabel,
}: {
  stores: Store[];
  onSelect: (store: Store) => void;
  label: string;
  showAllLabel: string;
  showLessLabel: string;
}) {
  const [showAll, setShowAll] = useState(false);

  const activeStores = stores
    .filter((s) => s.status === "active")
    .sort((a, b) => {
      if (!a.last_scraped_at) return 1;
      if (!b.last_scraped_at) return -1;
      return new Date(b.last_scraped_at).getTime() - new Date(a.last_scraped_at).getTime();
    });

  const visible = showAll ? activeStores : activeStores.slice(0, QUICK_SCRAPE_LIMIT);
  const hasMore = activeStores.length > QUICK_SCRAPE_LIMIT;

  return (
    <div
      className="mt-5 pt-5"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
          }}
        >
          {label}
        </p>
        {hasMore && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:opacity-80"
            style={{
              fontFamily: "var(--font-mono)",
              color: "#CAFF04",
            }}
          >
            {showAll ? showLessLabel : `${showAllLabel} (${activeStores.length})`}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {visible.map((store) => (
          <button
            key={store.id}
            onClick={() => onSelect(store)}
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
  );
}

interface ScrapeViewProps {
  stores: Store[];
  products: Product[];
}

export function ScrapeView({ stores, products: initialProducts }: ScrapeViewProps) {
  const t = useTranslations("Scrape");
  const searchParams = useSearchParams();

  // Form state
  const [url, setUrl] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  // Scraping state
  const [phase, setPhase] = useState<ScrapePhase>("idle");
  const [statusKey, setStatusKey] = useState("initializing");
  const [productsFound, setProductsFound] = useState(0);
  const [jobId, setJobId] = useState("");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [scrapedProducts, setScrapedProducts] = useState<Product[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadedJobRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Load a job from query params (e.g. coming from jobs table "View")
  useEffect(() => {
    const qJobId = searchParams.get("jobId");
    if (!qJobId || loadedJobRef.current === qJobId) return;
    loadedJobRef.current = qJobId;

    async function loadJob(id: string) {
      try {
        const statusRes = await fetch(`/api/scrape/${id}/status`);
        if (!statusRes.ok) return;
        const statusData = await statusRes.json();

        setJobId(id);
        setProductsFound(statusData.products_found ?? 0);

        if (statusData.status === "completed") {
          setPhase("completed");
          setStatusKey("savingResults");

          const productsRes = await fetch(`/api/scrape/${id}/products`);
          if (productsRes.ok) {
            const productsData = await productsRes.json();
            setScrapedProducts(productsData.products ?? []);
          }
        } else if (statusData.status === "failed") {
          setPhase("failed");
          setErrorMsg(statusData.error_message ?? "Scrape failed");
        } else if (statusData.status === "running") {
          setPhase("scraping");
          setStartTime(new Date());
          setStatusKey(STATUS_FLOW[statusData.apify_status] ?? "fetchingProducts");
          // pollStatus will be available by the time the interval fires
          pollRef.current = setInterval(() => {
            fetch(`/api/scrape/${id}/status`)
              .then((r) => r.ok ? r.json() : null)
              .then((data) => {
                if (!data) return;
                setProductsFound(data.products_found ?? 0);
                if (data.apify_status) setStatusKey(STATUS_FLOW[data.apify_status] ?? "fetchingProducts");
                if (data.status === "completed") {
                  if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
                  setPhase("completed");
                  setProductsFound(data.products_found ?? 0);
                  fetch(`/api/scrape/${id}/products`)
                    .then((r) => r.ok ? r.json() : null)
                    .then((pd) => { if (pd) setScrapedProducts(pd.products ?? []); });
                } else if (data.status === "failed") {
                  if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
                  setPhase("failed");
                  setErrorMsg(data.error_message ?? "Scrape failed");
                }
              })
              .catch(() => {});
          }, 5000);
        }
      } catch {
        // ignore — stay idle
      }
    }

    loadJob(qJobId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Find store matching the entered URL
  const matchedStore = stores.find(
    (s) =>
      url &&
      s.url.includes(
        url.replace("https://", "").replace("http://", "").split("/")[0]
      )
  );

  const storeId = selectedStoreId || matchedStore?.id || null;

  const pollStatus = useCallback(
    async (jId: string) => {
      try {
        const res = await fetch(`/api/scrape/${jId}/status`);
        if (!res.ok) return;
        const data = await res.json();

        setProductsFound(data.products_found ?? 0);

        if (data.apify_status) {
          setStatusKey(STATUS_FLOW[data.apify_status] ?? "fetchingProducts");
        }

        if (data.status === "completed") {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          setPhase("completed");
          setStatusKey("savingResults");
          setProductsFound(data.products_found ?? 0);

          // Fetch the newly scraped products
          const productsRes = await fetch(`/api/scrape/${jId}/products`);
          if (productsRes.ok) {
            const productsData = await productsRes.json();
            setScrapedProducts(productsData.products ?? []);
          }

          const storeName = url
            .replace("https://", "")
            .replace("http://", "")
            .split("/")[0];
          toast(t("scrapeComplete"), {
            description: t("scrapeCompleteDescription", {
              count: data.products_found ?? 0,
              store: storeName,
            }),
          });
        } else if (data.status === "failed") {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          setPhase("failed");
          setErrorMsg(data.error_message ?? "Scrape failed");
          toast.error(t("failed"), {
            description: data.error_message ?? "Unknown error",
          });
        }
      } catch {
        // Network error — keep polling
      }
    },
    [url, t]
  );

  async function handleStartScrape(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || phase === "scraping" || !storeId) return;

    setPhase("scraping");
    setStatusKey("initializing");
    setProductsFound(0);
    setStartTime(new Date());
    setErrorMsg(null);
    setScrapedProducts([]);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: storeId }),
      });

      if (!res.ok) {
        const err = await res.json();
        setPhase("failed");
        setErrorMsg(err.error ?? "Failed to start scrape");
        toast.error(err.error ?? "Failed to start scrape");
        return;
      }

      const data = await res.json();
      setJobId(data.job_id);
      setStatusKey("connecting");

      // Start polling every 5 seconds
      pollRef.current = setInterval(() => pollStatus(data.job_id), 5000);
    } catch {
      setPhase("failed");
      setErrorMsg("Network error");
      toast.error("Network error");
    }
  }

  function handleReset() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setPhase("idle");
    setUrl("");
    setSelectedStoreId(null);
    setStatusKey("initializing");
    setProductsFound(0);
    setJobId("");
    setStartTime(null);
    setScrapedProducts([]);
    setErrorMsg(null);
  }

  function handleQuickScrape(store: Store) {
    setUrl(store.url);
    setSelectedStoreId(store.id);
  }

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
              onChange={(e) => {
                setUrl(e.target.value);
                setSelectedStoreId(null);
              }}
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
              disabled={!url.trim() || isScraping || !storeId}
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

          {matchedStore && !isScraping && (
            <div
              className="mt-3 px-3 py-2 text-[10px] font-bold tracking-wider"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: "rgba(202,255,4,0.06)",
                border: "1.5px solid rgba(202,255,4,0.2)",
                color: "#CAFF04",
              }}
            >
              {t("alreadyMonitored", { name: matchedStore.name })}
            </div>
          )}

          {url.trim() && !storeId && !isScraping && (
            <div
              className="mt-3 px-3 py-2 text-[10px] font-bold tracking-wider"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: "rgba(255,69,58,0.06)",
                border: "1.5px solid rgba(255,69,58,0.2)",
                color: "#FF453A",
              }}
            >
              Store not found — add this store first before scraping.
            </div>
          )}

          {errorMsg && phase === "failed" && (
            <div
              className="mt-3 px-3 py-2 text-[10px] font-bold tracking-wider"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: "rgba(255,69,58,0.06)",
                border: "1.5px solid rgba(255,69,58,0.2)",
                color: "#FF453A",
              }}
            >
              {errorMsg}
            </div>
          )}
        </form>

        {/* Quick re-scrape — only in idle */}
        {phase === "idle" && stores.filter((s) => s.status === "active").length > 0 && (
          <QuickRescrape
            stores={stores}
            onSelect={handleQuickScrape}
            label={t("quickRescrape")}
            showAllLabel={t("showAll")}
            showLessLabel={t("showLess")}
          />
        )}
      </div>

      {/* ─── Job Status Card ─── */}
      {phase !== "idle" && (
        <JobStatusCard
          phase={phase}
          statusKey={statusKey}
          jobId={jobId}
          startTime={startTime}
          productsFound={productsFound}
        />
      )}

      {/* ─── Results ─── */}
      {phase === "completed" && (
        <ScrapeResults
          products={scrapedProducts.length > 0 ? scrapedProducts : initialProducts}
        />
      )}
    </div>
  );
}
