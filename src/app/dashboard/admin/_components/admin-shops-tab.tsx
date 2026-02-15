"use client";

import { useState, useMemo } from "react";
import { Search, X, Check, ChevronDown, Pencil } from "lucide-react";
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
            onClick={() => { onChange(null); setOpen(false); }}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-white/[0.04]"
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
        backgroundColor: published ? "rgba(34,197,94,0.15)" : "rgba(85,85,85,0.10)",
        border: `1.5px solid ${published ? "rgba(34,197,94,0.4)" : "rgba(85,85,85,0.3)"}`,
        color: published ? "#22C55E" : "#555555",
      }}
    >
      <Check className="w-3 h-3" />
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
    <div className="flex items-center justify-between py-1">
      <span
        className="text-[10px] font-bold uppercase tracking-[0.15em]"
        style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
      >
        {label}
      </span>
      <button
        onClick={() => onChange(!checked)}
        className="w-7 h-7 flex items-center justify-center transition-all duration-150"
        style={{
          backgroundColor: checked ? "rgba(34,197,94,0.15)" : "rgba(85,85,85,0.10)",
          border: `1.5px solid ${checked ? "rgba(34,197,94,0.4)" : "rgba(85,85,85,0.3)"}`,
          color: checked ? "#22C55E" : "#555555",
        }}
      >
        <Check className="w-3 h-3" />
      </button>
    </div>
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
  const [editingStore, setEditingStore] = useState<Store | null>(null);

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

  const hasAnyFilter = platformFilter || publishFilter || couponFilter || descFilter || logoFilter;

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

    return result;
  }, [localStores, search, platformFilter, publishFilter, couponFilter, descFilter, logoFilter]);

  function togglePublish(id: string) {
    setLocalStores((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, is_published: !s.is_published } : s
      )
    );
  }

  function clearAll() {
    setPlatformFilter(null);
    setPublishFilter(null);
    setCouponFilter(null);
    setDescFilter(null);
    setLogoFilter(null);
    setSearch("");
  }

  function saveStore(updated: Store) {
    setLocalStores((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
    setEditingStore(null);
    toast(t("storeSaved"), {
      description: t("storeSavedDescription", { name: updated.name }),
    });
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
                      className="text-[9px] font-bold uppercase tracking-[0.15em] h-10"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--muted-foreground)",
                        backgroundColor: "rgba(255,255,255,0.02)",
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
                  className="border-b hover:bg-white/[0.02]"
                  style={{ borderColor: "var(--border)" }}
                >
                  {/* Name */}
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                        style={{
                          fontFamily: "var(--font-mono)",
                          backgroundColor: "rgba(202,255,4,0.10)",
                          color: "#CAFF04",
                        }}
                      >
                        {store.name[0]}
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
                      style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                    >
                      <Highlight text={store.url.replace("https://", "")} query={search} />
                    </span>
                  </TableCell>

                  {/* Affiliate */}
                  <TableCell>
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
                  <TableCell>
                    <span
                      className="text-[10px] font-bold tracking-wider"
                      style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                    >
                      {store.program_id || "—"}
                    </span>
                  </TableCell>

                  {/* Published */}
                  <TableCell>
                    <PublishToggle
                      published={!!store.is_published}
                      onToggle={() => togglePublish(store.id)}
                    />
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <IconButton
                      onClick={() => setEditingStore({ ...store })}
                      icon={Pencil}
                      title={t("edit")}
                    />
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
          className="sm:max-w-2xl"
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
            <div className="max-h-[60vh] overflow-y-auto scrollbar-none pr-1">
              {/* Basic */}
              <SectionLabel>{t("basicInfo")}</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>{t("name")}</FieldLabel>
                  <Input
                    value={editingStore.name}
                    onChange={(e) => setEditingStore({ ...editingStore, name: e.target.value })}
                    className="text-xs border-2"
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
                    className="text-xs border-2"
                    style={{ borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: "11px", borderColor: "var(--border)", backgroundColor: "var(--input)" }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>{t("programIdLabel")}</FieldLabel>
                    <Input
                      value={editingStore.program_id || ""}
                      onChange={(e) => setEditingStore({ ...editingStore, program_id: e.target.value || null })}
                      className="text-xs border-2"
                      style={{ borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: "11px", borderColor: "var(--border)", backgroundColor: "var(--input)" }}
                    />
                  </div>
                  <div>
                    <FieldLabel>{t("couponCode")}</FieldLabel>
                    <Input
                      value={editingStore.coupon_code || ""}
                      onChange={(e) => setEditingStore({ ...editingStore, coupon_code: e.target.value || null })}
                      className="text-xs border-2"
                      style={{ borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: "11px", borderColor: "var(--border)", backgroundColor: "var(--input)" }}
                    />
                  </div>
                </div>
              </div>

              {/* Descriptions */}
              <SectionLabel>{t("descriptions")}</SectionLabel>
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

              {/* Media */}
              <SectionLabel>{t("media")}</SectionLabel>
              <div>
                <FieldLabel>{t("logoUrl")}</FieldLabel>
                <Input
                  value={editingStore.logo_url || ""}
                  onChange={(e) => setEditingStore({ ...editingStore, logo_url: e.target.value || null })}
                  className="text-xs border-2"
                  style={{ borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: "11px", borderColor: "var(--border)", backgroundColor: "var(--input)" }}
                />
                {editingStore.logo_url && (
                  <div className="mt-2">
                    <p
                      className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1"
                      style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
                    >
                      {t("preview")}
                    </p>
                    <img
                      src={editingStore.logo_url}
                      alt="Logo preview"
                      className="w-12 h-12 object-cover"
                      style={{ border: "1px solid var(--border)" }}
                    />
                  </div>
                )}
              </div>
            </div>
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
              className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:opacity-80"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: "#CAFF04",
                color: "#000",
                borderRadius: 0,
              }}
            >
              {t("save")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
