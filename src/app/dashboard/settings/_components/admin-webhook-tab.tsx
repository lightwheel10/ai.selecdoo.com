"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Check, X, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { FieldMeta } from "@/types/domain";
import { DEFAULT_WEBHOOK_FIELDS } from "@/lib/webhook-payload";

// ─── Toggle Row (matches admin-products-tab pattern) ───

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
      className="w-full flex items-center justify-between px-3 py-2 border-2 transition-all duration-150"
      style={{
        backgroundColor: checked
          ? "rgba(34,197,94,0.06)"
          : "rgba(239,68,68,0.04)",
        borderColor: checked
          ? "rgba(34,197,94,0.3)"
          : "rgba(239,68,68,0.2)",
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
          backgroundColor: checked
            ? "rgba(34,197,94,0.20)"
            : "rgba(239,68,68,0.12)",
          color: checked ? "#22C55E" : "#EF4444",
        }}
      >
        {checked ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      </div>
    </button>
  );
}

function GroupHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-[10px] font-bold uppercase tracking-[0.15em] mt-4 mb-1.5"
      style={{
        fontFamily: "var(--font-mono)",
        color: "var(--muted-foreground)",
      }}
    >
      {children}
    </h3>
  );
}

// ─── Group name mapping for i18n ───

const GROUP_LABELS: Record<string, { en: string; de: string }> = {
  core: { en: "Core", de: "Kern" },
  pricing: { en: "Pricing", de: "Preise" },
  availability: { en: "Availability", de: "Verfügbarkeit" },
  links: { en: "Links & Media", de: "Links & Medien" },
  brand: { en: "Brand & Categories", de: "Marke & Kategorien" },
  rich_data: { en: "Rich Data (JSONB)", de: "Erweiterte Daten (JSONB)" },
  source: { en: "Source Metadata", de: "Quell-Metadaten" },
  coupons: { en: "Coupons", de: "Gutscheine" },
  affiliate: { en: "Affiliate", de: "Affiliate" },
  shipping: { en: "Shipping", de: "Versand" },
  content: { en: "Content", de: "Inhalte" },
  flags: { en: "Flags", de: "Flags" },
};

// ─── Preview builder (generate format, uses real DB data) ───

function buildPreview(
  productKeys: Set<string>,
  storeKeys: Set<string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  realProduct: Record<string, any> | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  realStore: Record<string, any> | null
): string {
  if (!realProduct || !realStore) {
    return "// No product data available";
  }

  // Field name remapping matching buildGeneratePayload
  const REMAP: Record<string, string> = {
    image_url: "image",
    product_url: "link",
    original_price: "sale_price",
    discount_percentage: "discount",
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const product: Record<string, any> = {};
  for (const key of productKeys) {
    if (key === "title") {
      product.title = realProduct.cleaned_title || realProduct.title;
    } else {
      const outKey = REMAP[key] || key;
      product[outKey] = realProduct[key] ?? null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stores: Record<string, any> = {};
  for (const key of storeKeys) {
    stores[key] = realStore[key] ?? null;
  }

  product.stores = stores;

  return JSON.stringify({ product }, null, 2);
}

// ─── Main component ───

interface ApiResponse {
  config: { product: string[]; store: string[] };
  defaults: { product: string[]; store: string[] };
  productFieldGroups: FieldMeta[];
  storeFieldGroups: FieldMeta[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sampleProduct: Record<string, any> | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sampleStore: Record<string, any> | null;
}

export function AdminWebhookTab() {
  const t = useTranslations("Admin");

  const [productFields, setProductFields] = useState<Set<string>>(new Set());
  const [storeFields, setStoreFields] = useState<Set<string>>(new Set());
  const [savedProductFields, setSavedProductFields] = useState<Set<string>>(
    new Set()
  );
  const [savedStoreFields, setSavedStoreFields] = useState<Set<string>>(
    new Set()
  );
  const [productFieldGroups, setProductFieldGroups] = useState<FieldMeta[]>([]);
  const [storeFieldGroups, setStoreFieldGroups] = useState<FieldMeta[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sampleProduct, setSampleProduct] = useState<Record<string, any> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sampleStore, setSampleStore] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/webhook-fields");
      if (!res.ok) throw new Error("Failed to load");
      const data: ApiResponse = await res.json();

      const pf = new Set(data.config.product);
      const sf = new Set(data.config.store);
      setProductFields(pf);
      setStoreFields(sf);
      setSavedProductFields(new Set(pf));
      setSavedStoreFields(new Set(sf));
      setProductFieldGroups(data.productFieldGroups);
      setStoreFieldGroups(data.storeFieldGroups);
      setSampleProduct(data.sampleProduct);
      setSampleStore(data.sampleStore);
    } catch {
      setError(t("webhookSaveFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isDirty = useMemo(() => {
    if (productFields.size !== savedProductFields.size) return true;
    if (storeFields.size !== savedStoreFields.size) return true;
    for (const k of productFields) {
      if (!savedProductFields.has(k)) return true;
    }
    for (const k of storeFields) {
      if (!savedStoreFields.has(k)) return true;
    }
    return false;
  }, [productFields, storeFields, savedProductFields, savedStoreFields]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/webhook-fields", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: Array.from(productFields),
          store: Array.from(storeFields),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");

      setSavedProductFields(new Set(productFields));
      setSavedStoreFields(new Set(storeFields));
      toast.success(t("webhookSaved"), {
        description: t("webhookSavedDescription"),
      });
    } catch {
      toast.error(t("webhookSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setProductFields(new Set(DEFAULT_WEBHOOK_FIELDS.product));
    setStoreFields(new Set(DEFAULT_WEBHOOK_FIELDS.store));
  };

  const toggleProduct = (key: string, on: boolean) => {
    setProductFields((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const toggleStore = (key: string, on: boolean) => {
    setStoreFields((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const preview = useMemo(
    () => buildPreview(productFields, storeFields, sampleProduct, sampleStore),
    [productFields, storeFields, sampleProduct, sampleStore]
  );

  // Group fields by group name
  const productByGroup = useMemo(() => {
    const map = new Map<string, FieldMeta[]>();
    for (const f of productFieldGroups) {
      const arr = map.get(f.group) || [];
      arr.push(f);
      map.set(f.group, arr);
    }
    return map;
  }, [productFieldGroups]);

  const storeByGroup = useMemo(() => {
    const map = new Map<string, FieldMeta[]>();
    for (const f of storeFieldGroups) {
      const arr = map.get(f.group) || [];
      arr.push(f);
      map.set(f.group, arr);
    }
    return map;
  }, [storeFieldGroups]);

  // ─── Loading state ───

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2
          className="w-5 h-5 animate-spin"
          style={{ color: "var(--muted-foreground)" }}
        />
        <span
          className="ml-2 text-xs"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
          }}
        >
          {t("webhookLoading")}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="border-2 p-6 text-center"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        <p className="text-sm mb-3" style={{ color: "var(--danger, #EF4444)" }}>
          {error}
        </p>
        <button
          onClick={loadData}
          className="text-xs font-bold uppercase tracking-[0.15em] px-4 py-2 border-2"
          style={{
            fontFamily: "var(--font-mono)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  const locale = (typeof window !== "undefined" && document.documentElement.lang) || "en";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div
        className="border-2 p-4"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        <h2
          className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--primary-text)",
          }}
        >
          {t("webhookTitle")}
        </h2>
        <p
          className="text-xs"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--muted-foreground)",
          }}
        >
          {t("webhookDescription")}
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Field toggles */}
        <div className="space-y-4">
          {/* Product Fields */}
          <div
            className="border-2 p-4"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <h3
                className="text-[10px] font-bold uppercase tracking-[0.15em]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--primary-text)",
                }}
              >
                {t("webhookProductFields")}
              </h3>
              <span
                className="text-[10px] tracking-[0.1em]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                }}
              >
                {t("webhookFieldsSelected", {
                  selected: productFields.size,
                  total: productFieldGroups.length,
                })}
              </span>
            </div>

            {Array.from(productByGroup.entries()).map(([group, fields]) => (
              <div key={group}>
                <GroupHeader>
                  {GROUP_LABELS[group]?.[locale === "de" ? "de" : "en"] || group}
                </GroupHeader>
                <div className="space-y-1">
                  {fields.map((f) => (
                    <ToggleRow
                      key={f.key}
                      label={f.label}
                      checked={productFields.has(f.key)}
                      onChange={(on) => toggleProduct(f.key, on)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Store Fields */}
          <div
            className="border-2 p-4"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <h3
                className="text-[10px] font-bold uppercase tracking-[0.15em]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--primary-text)",
                }}
              >
                {t("webhookStoreFields")}
              </h3>
              <span
                className="text-[10px] tracking-[0.1em]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                }}
              >
                {t("webhookFieldsSelected", {
                  selected: storeFields.size,
                  total: storeFieldGroups.length,
                })}
              </span>
            </div>

            {Array.from(storeByGroup.entries()).map(([group, fields]) => (
              <div key={group}>
                <GroupHeader>
                  {GROUP_LABELS[group]?.[locale === "de" ? "de" : "en"] || group}
                </GroupHeader>
                <div className="space-y-1">
                  {fields.map((f) => (
                    <ToggleRow
                      key={f.key}
                      label={f.label}
                      checked={storeFields.has(f.key)}
                      onChange={(on) => toggleStore(f.key, on)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div
            className="border-2 p-4"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
            }}
          >
            <h3
              className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--primary-text)",
              }}
            >
              {t("webhookPreview")}
            </h3>
            {sampleProduct && (
              <p
                className="text-[10px] mb-2 truncate"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                }}
              >
                {sampleProduct.cleaned_title || sampleProduct.title || "Unknown"} — {sampleStore?.name || "Unknown Store"}
              </p>
            )}
            <div
              className="border-2 p-3 overflow-auto max-h-[600px]"
              style={{
                backgroundColor: "var(--background)",
                borderColor: "var(--border)",
              }}
            >
              <pre
                className="text-[11px] leading-relaxed whitespace-pre-wrap break-all"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--foreground)",
                }}
              >
                {preview}
              </pre>
            </div>
            <p
              className="text-[10px] mt-2"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--muted-foreground)",
              }}
            >
              {t("webhookPreviewNote")}
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div
        className="border-2 p-4 flex items-center justify-between"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] px-4 py-2 border-2 transition-colors"
          style={{
            fontFamily: "var(--font-mono)",
            borderColor: "var(--border)",
            color: "var(--muted-foreground)",
          }}
        >
          <RotateCcw className="w-3 h-3" />
          {t("webhookResetDefaults")}
        </button>

        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] px-6 py-2 border-2 transition-all disabled:opacity-40"
          style={{
            fontFamily: "var(--font-mono)",
            backgroundColor: isDirty ? "var(--primary)" : "transparent",
            borderColor: isDirty ? "var(--primary)" : "var(--border)",
            color: isDirty
              ? "var(--primary-foreground, #0A0A0A)"
              : "var(--muted-foreground)",
          }}
        >
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
          {saving ? t("webhookSaving") : t("webhookSave")}
        </button>
      </div>
    </div>
  );
}
