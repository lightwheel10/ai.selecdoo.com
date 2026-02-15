"use client";

import { useState, useMemo } from "react";
import {
  Search,
  ExternalLink,
  Pause,
  Play,
  Trash2,
  X,
  Check,
} from "lucide-react";
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
          <mark key={i} className="bg-transparent" style={{ color: "#CAFF04" }}>
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

  function togglePause(id: string) {
    setLocalStores((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status: s.status === "paused" ? "active" : "paused" as Store["status"] }
          : s
      )
    );
  }

  function deleteStore(id: string) {
    setLocalStores((prev) => prev.filter((s) => s.id !== id));
    setPendingDelete(null);
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return localStores;
    const q = search.toLowerCase();
    return localStores.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.url.toLowerCase().includes(q)
    );
  }, [localStores, search]);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1" style={{ maxWidth: 280 }}>
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

        {search.trim() && (
          <button
            onClick={() => setSearch("")}
            className="flex items-center text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:opacity-80"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            <X className="w-3 h-3" />
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
            {search.trim()
              ? t("storesFiltered", {
                  filtered: filtered.length,
                  total: localStores.length,
                  query: search,
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
            maxHeight: "70vh",
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
                {[
                  t("store"),
                  t("url"),
                  t("products"),
                  t("lastScraped"),
                  t("status"),
                  "",
                ].map((header, i) => (
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
              {filtered.map((store) => (
                <TableRow
                  key={store.id}
                  className="border-b hover:bg-white/[0.02]"
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
