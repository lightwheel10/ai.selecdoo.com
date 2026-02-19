"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { Search, X, Check, ChevronDown, Pencil, Package, Loader2, Sparkles } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/domain/status-badge";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { Store, StorePlatform } from "@/types";

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

// ─── Icon Button ───

function IconButton({
  onClick,
  icon: Icon,
  title,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-7 h-7 flex items-center justify-center transition-all duration-150 hover:opacity-80"
      style={{
        backgroundColor: "transparent",
        border: "2px solid var(--border)",
        color: "var(--muted-foreground)",
      }}
    >
      <Icon className="w-3 h-3" />
    </button>
  );
}

// ─── Simple Filter ───

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
            onClick={() => { onChange(null); setOpen(false); }}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-[var(--subtle-overlay)]"
            style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
          >
            <X className="w-3 h-3 opacity-50" />
            {resetLabel}
          </button>
        )}
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => { onChange(option.value === value ? null : option.value); setOpen(false); }}
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

// ─── Publish Toggle ───

function PublishToggle({
  published,
  onToggle,
}: {
  published: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-7 h-7 flex items-center justify-center transition-all duration-150"
      style={{
        backgroundColor: published ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.10)",
        border: `1.5px solid ${published ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.3)"}`,
        color: published ? "#22C55E" : "#EF4444",
      }}
    >
      {published ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
    </button>
  );
}

// ─── Section Divider ───

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[9px] font-bold uppercase tracking-[0.15em] mt-4 mb-2 pb-1"
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

// ─── Label ───

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1 block"
      style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
    >
      {children}
    </label>
  );
}

// ─── Toggle Row ───

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between px-3 py-2.5 mt-1.5 border-2 transition-all duration-150"
      style={{
        backgroundColor: checked ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.04)",
        borderColor: checked ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.2)",
      }}
    >
      <span
        className="text-[10px] font-bold uppercase tracking-[0.15em]"
        style={{
          fontFamily: "var(--font-mono)",
          color: checked ? "#22C55E" : "var(--muted-foreground)",
        }}
      >
        {label}
      </span>
      <div
        className="w-6 h-6 flex items-center justify-center transition-all duration-150"
        style={{
          backgroundColor: checked ? "rgba(34,197,94,0.20)" : "rgba(239,68,68,0.12)",
          color: checked ? "#22C55E" : "#EF4444",
        }}
      >
        {checked ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      </div>
    </button>
  );
}

// ─── Store Header Card ───

function StoreHeaderCard({ store }: { store: Store }) {
  const t = useTranslations("Admin");
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-2 mb-4"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--primary-muted)",
      }}
    >
      <div
        className="w-9 h-9 flex-shrink-0 relative overflow-hidden"
        style={{ backgroundColor: "var(--primary-muted)" }}
      >
        <Image
          src={`https://www.google.com/s2/favicons?domain=${new URL(store.url).hostname}&sz=32`}
          alt={store.name}
          fill
          className="object-contain p-1"
          sizes="36px"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold truncate">{store.name}</p>
        <p
          className="text-[10px] font-bold tracking-wider truncate"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
        >
          {store.url.replace("https://", "")}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Package className="w-3 h-3" style={{ color: "var(--muted-foreground)", opacity: 0.6 }} />
          <span
            className="text-[9px] font-bold tracking-wider"
            style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
          >
            {store.product_count.toLocaleString()} {t("productsLabel")}
          </span>
        </div>
      </div>
      <div className="flex-shrink-0">
        <StatusBadge status={store.is_published ? "published" : "unpublished"} />
      </div>
    </div>
  );
}

// ─── Description Tab Button ───

function DescriptionTabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors"
      style={{
        fontFamily: "var(--font-mono)",
        backgroundColor: active ? "var(--primary-muted)" : "transparent",
        color: active ? "var(--primary-text)" : "var(--muted-foreground)",
        border: `1.5px solid ${active ? "var(--primary-muted)" : "var(--border)"}`,
      }}
    >
      {label}
    </button>
  );
}

// ─── Shops Tab ───

interface AdminShopsTabProps {
  stores: Store[];
}

export function AdminShopsTab({ stores }: AdminShopsTabProps) {
  const t = useTranslations("Admin");

  const [localStores, setLocalStores] = useState(stores);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [publishFilter, setPublishFilter] = useState<string | null>(null);
  const [couponFilter, setCouponFilter] = useState<string | null>(null);
  const [descFilter, setDescFilter] = useState<string | null>(null);
  const [logoFilter, setLogoFilter] = useState<string | null>(null);
  const [featuredFilter, setFeaturedFilter] = useState<string | null>(null);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [descriptionTab, setDescriptionTab] = useState<"raw" | "formatted">("raw");
  const [formattingDescriptions, setFormattingDescriptions] = useState(false);

  useEffect(() => {
    setDescriptionTab("raw");
  }, [editingStore?.id]);

  const platformOptions = [
    { label: "Shopify", value: "shopify" },
    { label: "WooCommerce", value: "woocommerce" },
    { label: "Magento", value: "magento" },
    { label: "Custom", value: "custom" },
  ];

  const publishOptions = [
    { label: t("publishedOnly"), value: "published" },
    { label: t("unpublishedOnly"), value: "unpublished" },
  ];

  const couponOptions = [
    { label: t("hasCoupon"), value: "has" },
    { label: t("noCoupon"), value: "none" },
  ];

  const descOptions = [
    { label: t("hasDescription"), value: "has" },
    { label: t("missingDescription"), value: "missing" },
  ];

  const logoOptions = [
    { label: t("hasLogo"), value: "has" },
    { label: t("noLogo"), value: "none" },
  ];

  const featuredOptions = [
    { label: t("isFeatured"), value: "featured" },
    { label: t("notFeatured"), value: "not_featured" },
  ];

  const hasAnyFilter = platformFilter || publishFilter || couponFilter || descFilter || logoFilter || featuredFilter;

  const filtered = useMemo(() => {
    let result = localStores;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) => s.name.toLowerCase().includes(q) || s.url.toLowerCase().includes(q)
      );
    }

    if (platformFilter) {
      result = result.filter((s) => s.platform === platformFilter);
    }

    if (publishFilter) {
      result = result.filter((s) =>
        publishFilter === "published" ? s.is_published : !s.is_published
      );
    }

    if (couponFilter) {
      result = result.filter((s) =>
        couponFilter === "has" ? !!s.coupon_code : !s.coupon_code
      );
    }

    if (descFilter) {
      result = result.filter((s) =>
        descFilter === "has"
          ? !!(s.description_en || s.description_de)
          : !s.description_en && !s.description_de
      );
    }

    if (logoFilter) {
      result = result.filter((s) =>
        logoFilter === "has" ? !!s.logo_url : !s.logo_url
      );
    }

    if (featuredFilter) {
      result = result.filter((s) =>
        featuredFilter === "featured" ? !!s.is_featured : !s.is_featured
      );
    }

    return result;
  }, [localStores, search, platformFilter, publishFilter, couponFilter, descFilter, logoFilter, featuredFilter]);

  async function togglePublish(id: string) {
    const store = localStores.find((s) => s.id === id);
    if (!store) return;

    const newValue = !store.is_published;
    // Optimistic update
    setLocalStores((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_published: newValue } : s))
    );

    const res = await fetch(`/api/stores/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: newValue }),
    });

    if (!res.ok) {
      // Revert on failure
      setLocalStores((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_published: !newValue } : s))
      );
      toast.error("Failed to update publish status");
    }
  }

  function clearAll() {
    setPlatformFilter(null);
    setPublishFilter(null);
    setCouponFilter(null);
    setDescFilter(null);
    setLogoFilter(null);
    setFeaturedFilter(null);
    setSearch("");
  }

  const [saving, setSaving] = useState(false);

  async function saveStore(updated: Store) {
    setSaving(true);
    try {
      const res = await fetch(`/api/stores/${updated.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: updated.name,
          url: updated.url,
          platform: updated.platform,
          is_published: updated.is_published,
          is_featured: updated.is_featured,
          affiliate_link_base: updated.affiliate_link_base,
          program_id: updated.program_id,
          coupon_code: updated.coupon_code,
          description_en: updated.description_en,
          description_de: updated.description_de,
          description_en_formatted: updated.description_en_formatted,
          description_de_formatted: updated.description_de_formatted,
          logo_url: updated.logo_url,
          shipping_country: updated.shipping_country,
          shipping_price: updated.shipping_price,
          shipping_service: updated.shipping_service,
          shipping_min_handling_days: updated.shipping_min_handling_days,
          shipping_max_handling_days: updated.shipping_max_handling_days,
          shipping_min_transit_days: updated.shipping_min_transit_days,
          shipping_max_transit_days: updated.shipping_max_transit_days,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Failed to save store");
        return;
      }

      setLocalStores((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
      setEditingStore(null);
      toast(t("storeSaved"), {
        description: t("storeSavedDescription", { name: updated.name }),
      });
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function formatDescriptions() {
    if (!editingStore) return;
    setFormattingDescriptions(true);
    try {
      const res = await fetch(`/api/stores/${editingStore.id}/format-description`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description_en: editingStore.description_en || "",
          description_de: editingStore.description_de || "",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? t("formatFailed"));
        return;
      }
      const data = await res.json();
      // Only overwrite formatted fields that the API actually returned
      const updates: Partial<Store> = {};
      if (data.description_en_formatted !== undefined) {
        updates.description_en_formatted = data.description_en_formatted;
      }
      if (data.description_de_formatted !== undefined) {
        updates.description_de_formatted = data.description_de_formatted;
      }
      setEditingStore({ ...editingStore, ...updates });
      setDescriptionTab("formatted");
      toast(t("formatSuccess"));
    } catch {
      toast.error(t("formatFailed"));
    } finally {
      setFormattingDescriptions(false);
    }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Search */}
        <div className="relative" style={{ maxWidth: 280 }}>
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: "var(--muted-foreground)" }}
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchShops")}
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

        <SimpleFilter
          label={t("platform")}
          resetLabel={t("allPlatforms")}
          options={platformOptions}
          value={platformFilter}
          onChange={setPlatformFilter}
        />
        <SimpleFilter
          label={t("publish")}
          resetLabel={t("allPublish")}
          options={publishOptions}
          value={publishFilter}
          onChange={setPublishFilter}
        />
        <SimpleFilter
          label={t("coupon")}
          resetLabel={t("allCoupons")}
          options={couponOptions}
          value={couponFilter}
          onChange={setCouponFilter}
        />
        <SimpleFilter
          label={t("descriptionFilter")}
          resetLabel={t("allDescriptions")}
          options={descOptions}
          value={descFilter}
          onChange={setDescFilter}
        />
        <SimpleFilter
          label={t("logo")}
          resetLabel={t("allLogos")}
          options={logoOptions}
          value={logoFilter}
          onChange={setLogoFilter}
        />
        <SimpleFilter
          label={t("featuredFilter")}
          resetLabel={t("allFeatured")}
          options={featuredOptions}
          value={featuredFilter}
          onChange={setFeaturedFilter}
        />

        {(hasAnyFilter || search.trim()) && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:opacity-80"
            style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
          >
            <X className="w-3 h-3" />
            {t("clear")}
          </button>
        )}

        {/* Count */}
        <p
          className="ml-auto text-[10px] font-bold uppercase tracking-[0.15em] whitespace-nowrap"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
        >
          {hasAnyFilter || search.trim()
            ? t("shopsFiltered", { filtered: filtered.length, total: localStores.length })
            : t("shopsCount", { count: localStores.length })}
        </p>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div
          className="border-2 py-16 text-center"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <p
            className="text-[11px] font-bold uppercase tracking-[0.15em]"
            style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
          >
            {t("noShopsFound")}
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
              <col style={{ width: "20%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>
            <TableHeader>
              <TableRow
                className="border-b-2 hover:bg-transparent sticky top-0 z-10"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
              >
                {[t("name"), t("url"), t("affiliate"), t("programId"), t("published"), t("actions")].map(
                  (header, i) => (
                    <TableHead
                      key={i}
                      className={`text-[9px] font-bold uppercase tracking-[0.15em] h-10 ${i > 0 ? "text-center" : ""}`}
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--muted-foreground)",
                        backgroundColor: "var(--table-header-bg)",
                      }}
                    >
                      {header}
                    </TableHead>
                  )
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((store) => (
                <TableRow
                  key={store.id}
                  className="border-b hover:bg-[var(--table-header-bg)]"
                  style={{ borderColor: "var(--border)" }}
                >
                  {/* Name */}
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 flex-shrink-0 relative overflow-hidden"
                        style={{
                          backgroundColor: "var(--primary-muted)",
                        }}
                      >
                        <Image
                          src={`https://www.google.com/s2/favicons?domain=${new URL(store.url).hostname}&sz=32`}
                          alt={store.name}
                          fill
                          className="object-contain p-0.5"
                          sizes="28px"
                        />
                      </div>
                      <span className="text-[11px] font-semibold truncate">
                        <Highlight text={store.name} query={search} />
                      </span>
                    </div>
                  </TableCell>

                  {/* URL */}
                  <TableCell className="text-center">
                    <span
                      className="text-[10px] font-bold tracking-wider truncate block"
                      style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                    >
                      <Highlight text={store.url.replace("https://", "")} query={search} />
                    </span>
                  </TableCell>

                  {/* Affiliate */}
                  <TableCell className="text-center">
                    <span
                      className="text-[10px] font-bold tracking-wider truncate block"
                      style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                    >
                      {store.affiliate_link_base
                        ? store.affiliate_link_base.replace("https://", "")
                        : "—"}
                    </span>
                  </TableCell>

                  {/* Program ID */}
                  <TableCell className="text-center">
                    <span
                      className="text-[10px] font-bold tracking-wider"
                      style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                    >
                      {store.program_id || "—"}
                    </span>
                  </TableCell>

                  {/* Published */}
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                    <PublishToggle
                      published={!!store.is_published}
                      onToggle={() => togglePublish(store.id)}
                    />
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                    <IconButton
                      onClick={() => setEditingStore({ ...store })}
                      icon={Pencil}
                      title={t("edit")}
                    />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingStore} onOpenChange={(open) => !open && setEditingStore(null)}>
        <DialogContent
          className="sm:max-w-3xl"
          style={{ borderRadius: 0, border: "2px solid var(--border)", backgroundColor: "var(--card)" }}
        >
          <DialogHeader>
            <DialogTitle
              className="text-[11px] font-bold uppercase tracking-[0.15em]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {t("editStore")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("editStore")}
            </DialogDescription>
          </DialogHeader>

          {editingStore && (
            <>
              {/* Store Header Card (outside scroll) */}
              <StoreHeaderCard store={editingStore} />

              <div className="max-h-[65vh] overflow-y-auto scrollbar-none pr-1">
                {/* Basic Info */}
                <SectionLabel>{t("basicInfo")}</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>{t("name")}</FieldLabel>
                    <Input
                      value={editingStore.name}
                      onChange={(e) => setEditingStore({ ...editingStore, name: e.target.value })}
                      className="text-xs border-2 focus-visible:ring-0 focus-visible:border-[var(--border)]"
                      style={{ borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: "11px", borderColor: "var(--border)", backgroundColor: "var(--input)" }}
                    />
                  </div>
                  <div>
                    <FieldLabel>{t("platformLabel")}</FieldLabel>
                    <select
                      value={editingStore.platform || "shopify"}
                      onChange={(e) => setEditingStore({ ...editingStore, platform: e.target.value as StorePlatform })}
                      className="w-full px-3 py-2 text-[11px] border-2 outline-none"
                      style={{ borderRadius: 0, fontFamily: "var(--font-mono)", borderColor: "var(--border)", backgroundColor: "var(--input)", color: "var(--foreground)" }}
                    >
                      <option value="shopify">Shopify</option>
                      <option value="woocommerce">WooCommerce</option>
                      <option value="magento">Magento</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>
                <div className="mt-2">
                  <FieldLabel>{t("storeUrl")}</FieldLabel>
                  <Input
                    value={editingStore.url}
                    onChange={(e) => setEditingStore({ ...editingStore, url: e.target.value })}
                    className="text-xs border-2 focus-visible:ring-0 focus-visible:border-[var(--border)]"
                    style={{ borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: "11px", borderColor: "var(--border)", backgroundColor: "var(--input)" }}
                  />
                </div>
                <ToggleRow
                  label={t("featured")}
                  checked={!!editingStore.is_featured}
                  onChange={(v) => setEditingStore({ ...editingStore, is_featured: v })}
                />
                <ToggleRow
                  label={t("published")}
                  checked={!!editingStore.is_published}
                  onChange={(v) => setEditingStore({ ...editingStore, is_published: v })}
                />

                {/* Affiliate */}
                <SectionLabel>{t("affiliateInfo")}</SectionLabel>
                <div className="space-y-2">
                  <div>
                    <FieldLabel>{t("affiliateLinkBase")}</FieldLabel>
                    <Input
                      value={editingStore.affiliate_link_base || ""}
                      onChange={(e) => setEditingStore({ ...editingStore, affiliate_link_base: e.target.value || null })}
                      className="text-xs border-2 focus-visible:ring-0 focus-visible:border-[var(--border)]"
                      style={{ borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: "11px", borderColor: "var(--border)", backgroundColor: "var(--input)" }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>{t("programIdLabel")}</FieldLabel>
                      <Input
                        value={editingStore.program_id || ""}
                        onChange={(e) => setEditingStore({ ...editingStore, program_id: e.target.value || null })}
                        className="text-xs border-2 focus-visible:ring-0 focus-visible:border-[var(--border)]"
                        style={{ borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: "11px", borderColor: "var(--border)", backgroundColor: "var(--input)" }}
                      />
                    </div>
                    <div>
                      <FieldLabel>{t("couponCode")}</FieldLabel>
                      <Input
                        value={editingStore.coupon_code || ""}
                        onChange={(e) => setEditingStore({ ...editingStore, coupon_code: e.target.value || null })}
                        className="text-xs border-2 focus-visible:ring-0 focus-visible:border-[var(--border)]"
                        style={{ borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: "11px", borderColor: "var(--border)", backgroundColor: "var(--input)" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Shipping */}
                <SectionLabel>{t("shippingInfo")}</SectionLabel>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>{t("shippingCountry")}</FieldLabel>
                      <Input
                        value={editingStore.shipping_country || ""}
                        onChange={(e) => setEditingStore({ ...editingStore, shipping_country: e.target.value || null })}
                        className="text-xs border-2 focus-visible:ring-0 focus-visible:border-[var(--border)]"
                        style={{ borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: "11px", borderColor: "var(--border)", backgroundColor: "var(--input)" }}
                      />
                    </div>
                    <div>
                      <FieldLabel>{t("shippingService")}</FieldLabel>
                      <Input
                        value={editingStore.shipping_service || ""}
                        onChange={(e) => setEditingStore({ ...editingStore, shipping_service: e.target.value || null })}
                        className="text-xs border-2 focus-visible:ring-0 focus-visible:border-[var(--border)]"
                        style={{ borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: "11px", borderColor: "var(--border)", backgroundColor: "var(--input)" }}
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel>{t("shippingPrice")}</FieldLabel>
                    <Input
                      value={editingStore.shipping_price || ""}
                      onChange={(e) => setEditingStore({ ...editingStore, shipping_price: e.target.value || null })}
                      className="text-xs border-2 focus-visible:ring-0 focus-visible:border-[var(--border)]"
                      style={{ borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: "11px", borderColor: "var(--border)", backgroundColor: "var(--input)" }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>{t("shippingMinHandling")}</FieldLabel>
                      <Input
                        type="number"
                        min={0}
                        max={99}
                        value={editingStore.shipping_min_handling_days ?? ""}
                        onChange={(e) => setEditingStore({ ...editingStore, shipping_min_handling_days: e.target.value ? parseInt(e.target.value) : null })}
                        className="text-xs border-2 focus-visible:ring-0 focus-visible:border-[var(--border)]"
                        style={{ borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: "11px", borderColor: "var(--border)", backgroundColor: "var(--input)" }}
                      />
                    </div>
                    <div>
                      <FieldLabel>{t("shippingMaxHandling")}</FieldLabel>
                      <Input
                        type="number"
                        min={0}
                        max={99}
                        value={editingStore.shipping_max_handling_days ?? ""}
                        onChange={(e) => setEditingStore({ ...editingStore, shipping_max_handling_days: e.target.value ? parseInt(e.target.value) : null })}
                        className="text-xs border-2 focus-visible:ring-0 focus-visible:border-[var(--border)]"
                        style={{ borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: "11px", borderColor: "var(--border)", backgroundColor: "var(--input)" }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>{t("shippingMinTransit")}</FieldLabel>
                      <Input
                        type="number"
                        min={0}
                        max={99}
                        value={editingStore.shipping_min_transit_days ?? ""}
                        onChange={(e) => setEditingStore({ ...editingStore, shipping_min_transit_days: e.target.value ? parseInt(e.target.value) : null })}
                        className="text-xs border-2 focus-visible:ring-0 focus-visible:border-[var(--border)]"
                        style={{ borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: "11px", borderColor: "var(--border)", backgroundColor: "var(--input)" }}
                      />
                    </div>
                    <div>
                      <FieldLabel>{t("shippingMaxTransit")}</FieldLabel>
                      <Input
                        type="number"
                        min={0}
                        max={99}
                        value={editingStore.shipping_max_transit_days ?? ""}
                        onChange={(e) => setEditingStore({ ...editingStore, shipping_max_transit_days: e.target.value ? parseInt(e.target.value) : null })}
                        className="text-xs border-2 focus-visible:ring-0 focus-visible:border-[var(--border)]"
                        style={{ borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: "11px", borderColor: "var(--border)", backgroundColor: "var(--input)" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Descriptions with tabs */}
                <SectionLabel>{t("descriptions")}</SectionLabel>
                <div className="flex items-center gap-1 mb-3">
                  <DescriptionTabButton
                    label={t("rawDescriptions")}
                    active={descriptionTab === "raw"}
                    onClick={() => setDescriptionTab("raw")}
                  />
                  <DescriptionTabButton
                    label={t("formattedDescriptions")}
                    active={descriptionTab === "formatted"}
                    onClick={() => setDescriptionTab("formatted")}
                  />
                  {(editingStore.description_en || editingStore.description_de) && (
                    <button
                      onClick={formatDescriptions}
                      disabled={formattingDescriptions}
                      className="ml-auto flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:opacity-80 disabled:opacity-40 disabled:pointer-events-none"
                      style={{
                        fontFamily: "var(--font-mono)",
                        backgroundColor: "var(--primary-muted)",
                        color: "var(--primary-text)",
                        border: "1.5px solid var(--primary-muted)",
                      }}
                    >
                      {formattingDescriptions ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      {formattingDescriptions ? t("formattingDescriptions") : t("formatDescriptions")}
                    </button>
                  )}
                </div>

                {descriptionTab === "raw" ? (
                  <div className="space-y-2">
                    <div>
                      <FieldLabel>{t("descriptionEn")}</FieldLabel>
                      <textarea
                        value={editingStore.description_en || ""}
                        onChange={(e) => setEditingStore({ ...editingStore, description_en: e.target.value || null })}
                        rows={3}
                        className="w-full px-3 py-2 text-[11px] border-2 outline-none resize-none"
                        style={{ borderRadius: 0, fontFamily: "var(--font-mono)", borderColor: "var(--border)", backgroundColor: "var(--input)", color: "var(--foreground)" }}
                      />
                    </div>
                    <div>
                      <FieldLabel>{t("descriptionDe")}</FieldLabel>
                      <textarea
                        value={editingStore.description_de || ""}
                        onChange={(e) => setEditingStore({ ...editingStore, description_de: e.target.value || null })}
                        rows={3}
                        className="w-full px-3 py-2 text-[11px] border-2 outline-none resize-none"
                        style={{ borderRadius: 0, fontFamily: "var(--font-mono)", borderColor: "var(--border)", backgroundColor: "var(--input)", color: "var(--foreground)" }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <FieldLabel>{t("descriptionEnFormatted")}</FieldLabel>
                      {editingStore.description_en_formatted ? (
                        <textarea
                          value={editingStore.description_en_formatted}
                          onChange={(e) => setEditingStore({ ...editingStore, description_en_formatted: e.target.value || null })}
                          rows={4}
                          className="w-full px-3 py-2 text-[11px] border-2 outline-none resize-none"
                          style={{ borderRadius: 0, fontFamily: "var(--font-mono)", borderColor: "var(--border)", backgroundColor: "var(--input)", color: "var(--foreground)" }}
                        />
                      ) : (
                        <p
                          className="text-[10px] py-3 px-3 border-2"
                          style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)", borderColor: "var(--border)", backgroundColor: "var(--input)" }}
                        >
                          {t("noFormattedDescription")}
                        </p>
                      )}
                    </div>
                    <div>
                      <FieldLabel>{t("descriptionDeFormatted")}</FieldLabel>
                      {editingStore.description_de_formatted ? (
                        <textarea
                          value={editingStore.description_de_formatted}
                          onChange={(e) => setEditingStore({ ...editingStore, description_de_formatted: e.target.value || null })}
                          rows={4}
                          className="w-full px-3 py-2 text-[11px] border-2 outline-none resize-none"
                          style={{ borderRadius: 0, fontFamily: "var(--font-mono)", borderColor: "var(--border)", backgroundColor: "var(--input)", color: "var(--foreground)" }}
                        />
                      ) : (
                        <p
                          className="text-[10px] py-3 px-3 border-2"
                          style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)", borderColor: "var(--border)", backgroundColor: "var(--input)" }}
                        >
                          {t("noFormattedDescription")}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Media */}
                <SectionLabel>{t("media")}</SectionLabel>
                <div>
                  <FieldLabel>{t("logoUrl")}</FieldLabel>
                  <div className="flex items-center gap-3">
                    <Input
                      value={editingStore.logo_url || ""}
                      onChange={(e) => setEditingStore({ ...editingStore, logo_url: e.target.value || null })}
                      className="flex-1 text-xs border-2 focus-visible:ring-0 focus-visible:border-[var(--border)]"
                      style={{ borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: "11px", borderColor: "var(--border)", backgroundColor: "var(--input)" }}
                    />
                    {editingStore.logo_url && (
                      <img
                        src={editingStore.logo_url}
                        alt="Logo preview"
                        className="w-9 h-9 flex-shrink-0 object-cover"
                        style={{ border: "1.5px solid var(--border)" }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            <button
              onClick={() => setEditingStore(null)}
              className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors hover:opacity-80"
              style={{ fontFamily: "var(--font-mono)", borderColor: "var(--border)", color: "var(--muted-foreground)", borderRadius: 0 }}
            >
              {t("cancel")}
            </button>
            <button
              onClick={() => editingStore && saveStore(editingStore)}
              disabled={saving}
              className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:opacity-80 disabled:opacity-40 disabled:pointer-events-none"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: "var(--primary)",
                color: "#000",
                borderRadius: 0,
              }}
            >
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
