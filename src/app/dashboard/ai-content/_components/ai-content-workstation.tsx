"use client";


import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Search,
  X,
  Tags,
  SlidersHorizontal,
  LayoutGrid,
  Store as StoreIcon,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { Product, Store, AIGeneratedContent, AIContentType } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  buildContentMap,
  CONTENT_TYPE_CONFIG,
  type StoreGroupData,
} from "./utils";
import { AI_PROVIDER } from "@/lib/ai-content/config";
import { QUESTION_STEPS, type QuestionOption, type QuestionStep } from "@/lib/ai-content/prompts";
import { MultiSearchableFilter, MultiSimpleFilter, SimpleFilter, ToggleGroup } from "./filters";
import { Pagination } from "@/components/domain/pagination";
import { ProductCard } from "./product-card";
import { ContentDialog } from "./content-dialog";
import { StoreGroupView } from "./store-group-view";

import { useFilterNavigation } from "@/hooks/use-filter-navigation";
import {
  canDeleteProduct,
  canEditAIContent,
  canGenerateAIContent,
} from "@/lib/auth/roles";
import { useAuthAccess } from "@/components/domain/role-provider";

// ═══════════════════════════════════
// ─── MAIN WORKSTATION ───
// ═══════════════════════════════════

interface AIContentWorkstationProps {
  products: Product[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  stores: Store[];
  aiContent: AIGeneratedContent[];
  contentCounts: Record<string, number>;
  filters: {
    search: string;
    storeIds: string[];
    discountFilter: string | null;
    contentStatus: string[];
    sortBy: string | null;
    sortDir: string | null;
  };
}

export function AIContentWorkstation({
  products,
  totalCount,
  totalPages,
  currentPage,
  stores,
  aiContent,
  contentCounts,
  filters,
}: AIContentWorkstationProps) {
  const t = useTranslations("AIContent");
  const { setFilter, setFilters, clearAll: clearUrlFilters, isPending } = useFilterNavigation();
  const access = useAuthAccess();
  // Delete controls are admin-only in this screen.
  const allowDeleteProduct = canDeleteProduct(access);
  const allowGenerateContent = canGenerateAIContent(access);
  const allowEditContent = canEditAIContent(access);

  const storeMap = useMemo(
    () => Object.fromEntries(stores.map((s) => [s.id, s])),
    [stores]
  );
  const storeNames = useMemo(() => stores.map((s) => s.name).sort(), [stores]);

  // Name-to-ID and ID-to-name maps for store filter conversion
  const storeNameToId = useMemo(
    () => Object.fromEntries(stores.map((s) => [s.name, s.id])),
    [stores]
  );
  const storeIdToName = useMemo(
    () => Object.fromEntries(stores.map((s) => [s.id, s.name])),
    [stores]
  );

  // ── State ──
  const [localContent, setLocalContent] = useState(aiContent);
  const [localProducts, setLocalProducts] = useState(products);

  // Sync when server data changes (e.g., after navigation)
  useEffect(() => {
    setLocalProducts(products);
  }, [products]);
  useEffect(() => {
    setLocalContent(aiContent);
  }, [aiContent]);

  const [viewMode, setViewMode] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(true);
  const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set());

  // Debounced search input
  const [searchInput, setSearchInput] = useState(filters.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilter("search", value || null);
    }, 400);
  }

  // Selection
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  // Modal
  const [modal, setModal] = useState<{
    product: Product;
    contentType: AIContentType;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingContent, setEditingContent] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  // Webhook send
  const [sendingWebhook, setSendingWebhook] = useState<string | null>(null);

  // Bulk generation
  const [bulkGenerating, setBulkGenerating] = useState<{
    storeId: string;
    type: AIContentType;
    current: number;
    total: number;
  } | null>(null);

  // Bulk delete confirm
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // ── Claude questionnaire state ──
  // Sequential: one question at a time. Each step's options are influenced
  // by the user's previous answers. Steps: focus → occasion → tone.
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [questionStep, setQuestionStep] = useState<number>(0); // 0 = not started, 1-3 = step index
  const [currentQuestion, setCurrentQuestion] = useState<QuestionOption | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!allowDeleteProduct) {
      setSelectedProducts(new Set());
      setShowBulkDeleteConfirm(false);
    }
  }, [allowDeleteProduct]);

  // ── Derived ──
  const contentMap = useMemo(() => buildContentMap(localContent), [localContent]);

  // Products are already filtered server-side (including content status)
  const filtered = localProducts;

  // Store groups (for store view)
  const storeGroups = useMemo((): StoreGroupData[] => {
    const groups = new Map<string, Product[]>();
    for (const p of filtered) {
      const arr = groups.get(p.store_id) || [];
      arr.push(p);
      groups.set(p.store_id, arr);
    }
    return Array.from(groups.entries())
      .map(([storeId, prods]) => {
        let dealCount = 0;
        let postCount = 0;
        let totalDiscount = 0;
        let discountedCount = 0;
        for (const p of prods) {
          const entry = contentMap.get(p.id);
          if (entry?.hasDeal) dealCount++;
          if (entry?.hasPost) postCount++;
          if (p.discount_percentage && p.discount_percentage > 0) {
            totalDiscount += p.discount_percentage;
            discountedCount++;
          }
        }
        return {
          store: storeMap[storeId] || {
            id: storeId,
            name: "Unknown",
            url: "",
            user_id: "",
            product_count: 0,
            last_scraped_at: null,
            status: "active" as const,
            created_at: "",
          },
          products: prods,
          dealCount,
          postCount,
          avgDiscount:
            discountedCount > 0
              ? Math.round(totalDiscount / discountedCount)
              : 0,
        };
      })
      .sort((a, b) => b.products.length - a.products.length);
  }, [filtered, contentMap, storeMap]);

  const hasAnyFilter = filters.storeIds.length > 0 || filters.discountFilter || filters.search || filters.contentStatus.length > 0;

  // Convert URL store IDs to names for the MultiSearchableFilter display
  const selectedStoreNames = useMemo(
    () => filters.storeIds.map((id) => storeIdToName[id]).filter(Boolean),
    [filters.storeIds, storeIdToName]
  );

  // ── Filter options ──
  const contentStatusOptions = [
    { label: t("noContent"), value: "no_content", count: contentCounts.no_content ?? 0 },
    { label: t("partial"), value: "partial", count: contentCounts.partial ?? 0 },
    { label: t("complete"), value: "complete", count: contentCounts.complete ?? 0 },
  ];

  const discountOptions = [
    { label: t("allProducts"), value: "all" },
    { label: t("anyDiscount"), value: "1" },
    { label: t("discount17"), value: "17" },
    { label: t("discount20"), value: "20" },
    { label: t("discount30"), value: "30" },
    { label: t("discount50"), value: "50" },
  ];

  const sortDiscountOptions = [
    { label: t("highToLow"), value: "desc" },
    { label: t("lowToHigh"), value: "asc" },
  ];

  const sortPriceOptions = [
    { label: t("highToLow"), value: "desc" },
    { label: t("lowToHigh"), value: "asc" },
  ];

  // Current sort state derived from URL
  const discountSort = filters.sortBy === "discount_percentage" ? filters.sortDir : null;
  const priceSort = filters.sortBy === "price" ? filters.sortDir : null;

  // ── Actions ──

  function clearAll() {
    setSearchInput("");
    clearUrlFilters();
  }

  function handlePageChange(page: number) {
    setFilter("page", String(page));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openModal(product: Product, contentType: AIContentType) {
    setModal({ product, contentType });
  }

  // ── Claude: fetch one question at a time (sequential flow) ──
  // Each call sends previous answers so Claude tailors the next question.
  const handleAnalyze = useCallback(
    async (product: Product, contentType: AIContentType, stepIndex?: number) => {
      const step = stepIndex ?? 0;
      const stepId = QUESTION_STEPS[step] as QuestionStep;
      if (!stepId) return; // all 3 steps done

      setIsAnalyzing(true);
      setCurrentQuestion(null);
      setQuestionStep(step + 1); // 1-indexed for display

      // Build previous answers from current state
      const prevAnswers = QUESTION_STEPS.slice(0, step)
        .filter((id) => answers[id])
        .map((id) => ({ id, answer: answers[id] }));

      try {
        const res = await fetch("/api/ai-content/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.id,
            contentType,
            step: stepId,
            previousAnswers: prevAnswers,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setCurrentQuestion(data.question);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to analyze product");
        setCurrentQuestion(null);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [answers]
  );

  // Called when user picks an answer — saves it and auto-fetches the next question
  const handleAnswerAndNext = useCallback(
    (questionId: string, answer: string, product: Product, contentType: AIContentType) => {
      setAnswers((prev) => ({ ...prev, [questionId]: answer }));
      // Find the next step index
      const currentStepIndex = QUESTION_STEPS.indexOf(questionId as QuestionStep);
      const nextStep = currentStepIndex + 1;
      if (nextStep < QUESTION_STEPS.length) {
        // Fetch next question (need to pass the updated answers including this one)
        // We use setTimeout to ensure the answers state has updated
        const updatedAnswers = { ...answers, [questionId]: answer };
        setIsAnalyzing(true);
        setCurrentQuestion(null);
        setQuestionStep(nextStep + 1);

        const prevAnswers = QUESTION_STEPS.slice(0, nextStep)
          .filter((id) => updatedAnswers[id])
          .map((id) => ({ id, answer: updatedAnswers[id] }));

        fetch("/api/ai-content/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.id,
            contentType,
            step: QUESTION_STEPS[nextStep],
            previousAnswers: prevAnswers,
          }),
        })
          .then(async (res) => {
            if (!res.ok) {
              const err = await res.json().catch(() => ({ error: "Unknown error" }));
              throw new Error(err.error || `HTTP ${res.status}`);
            }
            return res.json();
          })
          .then((data) => {
            setCurrentQuestion(data.question);
          })
          .catch((err) => {
            toast.error(err instanceof Error ? err.message : "Failed to analyze product");
            setCurrentQuestion(null);
          })
          .finally(() => {
            setIsAnalyzing(false);
          });
      } else {
        // All 3 questions answered — auto-trigger content generation.
        // No need for the user to click a separate "Generate" button.
        setCurrentQuestion(null);
        setQuestionStep(QUESTION_STEPS.length + 1);
        // Build the final answers including this last one, since setState
        // for `answers` hasn't flushed yet at this point.
        const finalAnswers = { ...answers, [questionId]: answer };
        // Call generate directly with the complete answers
        setIsGenerating(true);
        const requestBody = {
          productId: product.id,
          contentType,
          answers: Object.entries(finalAnswers).map(([id, a]) => ({ id, answer: a })),
        };
        fetch("/api/ai-content/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        })
          .then(async (res) => {
            if (!res.ok) {
              const err = await res.json().catch(() => ({ error: "Unknown error" }));
              throw new Error(err.error || `HTTP ${res.status}`);
            }
            return res.json();
          })
          .then((newContent: AIGeneratedContent) => {
            setLocalContent((prev) => [
              ...prev.filter(
                (c) => !(c.product_id === product.id && c.content_type === contentType)
              ),
              newContent,
            ]);
            setEditingContent(null);
            const cfg = CONTENT_TYPE_CONFIG[contentType];
            toast(t("contentGenerated"), {
              description: t("contentGeneratedDescription", {
                type: cfg ? t(cfg.labelKey) : contentType,
                title: product.title,
              }),
            });
          })
          .catch((err) => {
            toast.error(err instanceof Error ? err.message : "Failed to generate content");
          })
          .finally(() => {
            setIsGenerating(false);
          });
      }
    },
    [answers, t]
  );

  const handleGenerate = useCallback(
    async (product: Product, contentType: AIContentType) => {
      if (!allowGenerateContent) {
        toast.error(t("noGenerateAccess"));
        return;
      }
      setIsGenerating(true);
      try {
        // When using Claude, include the user's questionnaire answers in the request.
        // The generate endpoint checks AI_PROVIDER and routes accordingly.
        const requestBody: Record<string, unknown> = { productId: product.id, contentType };
        if (AI_PROVIDER === "claude" && Object.keys(answers).length > 0) {
          requestBody.answers = Object.entries(answers).map(([id, answer]) => ({ id, answer }));
        }

        const res = await fetch("/api/ai-content/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(err.error || `HTTP ${res.status}`);
        }

        const newContent: AIGeneratedContent = await res.json();
        // Remove any existing content for this product+type, then add new
        setLocalContent((prev) => [
          ...prev.filter(
            (c) => !(c.product_id === product.id && c.content_type === contentType)
          ),
          newContent,
        ]);
        setEditingContent(null);
        const cfg = CONTENT_TYPE_CONFIG[contentType];
        toast(t("contentGenerated"), {
          description: t("contentGeneratedDescription", {
            type: cfg ? t(cfg.labelKey) : contentType,
            title: product.title,
          }),
        });
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to generate content"
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [allowGenerateContent, t, answers]
  );

  function handleRegenerate(
    product: Product,
    contentType: AIContentType
  ) {
    if (AI_PROVIDER === "claude") {
      // Claude path: restart from question 1 so user can adjust answers
      setCurrentQuestion(null);
      setAnswers({});
      setQuestionStep(0);
      handleAnalyze(product, contentType, 0);
    } else {
      // n8n path: generate directly (upsert on server)
      handleGenerate(product, contentType);
    }
  }

  async function handleSendToWebhook(
    product: Product,
    contentType: AIContentType
  ) {
    const entry = localContent.find(
      (c) => c.product_id === product.id && c.content_type === contentType
    );
    if (!entry) return;

    setSendingWebhook(entry.id);
    try {
      const res = await fetch("/api/ai-content/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId: entry.id,
          productId: product.id,
          contentType,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const { webhook_sent_at, webhook_status } = await res.json();

      // Update local state with webhook tracking
      setLocalContent((prev) =>
        prev.map((c) =>
          c.id === entry.id
            ? { ...c, webhook_sent_at, webhook_status }
            : c
        )
      );

      const cfg = CONTENT_TYPE_CONFIG[contentType];
      toast(t("webhookSentToast"), {
        description: t("webhookSentDescription", {
          type: cfg ? t(cfg.labelKey) : contentType,
          title: product.title,
        }),
      });
    } catch (err) {
      // Update local state to show failed status
      setLocalContent((prev) =>
        prev.map((c) =>
          c.id === entry.id
            ? { ...c, webhook_status: "failed" }
            : c
        )
      );
      toast.error(
        err instanceof Error ? err.message : t("webhookFailed")
      );
    } finally {
      setSendingWebhook(null);
    }
  }

  // Save edit — supports both combined (legacy/n8n) and per-language (Claude) editing.
  // When `editLang` is provided ("de" or "en"), only that language column is updated
  // and the combined content column is rebuilt server-side for backward compatibility.
  async function handleSaveEdit(
    productId: string,
    contentType: AIContentType,
    editLang?: "de" | "en"
  ) {
    if (!allowEditContent) {
      toast.error(t("noEditAccess"));
      return;
    }

    // Find the content entry to get its ID
    const entry = localContent.find(
      (c) => c.product_id === productId && c.content_type === contentType
    );

    // Update local state immediately
    setLocalContent((prev) =>
      prev.map((c) => {
        if (c.product_id !== productId || c.content_type !== contentType) return c;
        if (editLang === "de") {
          return { ...c, content_de: editText, content: editText + "\n\n---\n\n" + (c.content_en || "") };
        }
        if (editLang === "en") {
          return { ...c, content_en: editText, content: (c.content_de || "") + "\n\n---\n\n" + editText };
        }
        return { ...c, content: editText };
      })
    );
    setEditingContent(null);
    setEditText("");

    // Persist to database
    if (entry) {
      try {
        // Send language-specific field if editing a specific language,
        // otherwise send the combined content field.
        const body = editLang
          ? { [`content_${editLang}`]: editText }
          : { content: editText };

        const res = await fetch(`/api/ai-content/${entry.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          toast.error("Failed to save edit to database");
        }
      } catch {
        toast.error("Failed to save edit to database");
      }
    }
  }

  async function handleBulkGenerate(
    storeId: string,
    storeProducts: Product[],
    contentType: AIContentType
  ) {
    if (!allowGenerateContent) {
      toast.error(t("noGenerateAccess"));
      return;
    }

    const hasContentLookup: Record<string, (e: import("./utils").ContentEntry | undefined) => boolean> = {
      deal_post: (e) => !!e?.hasDeal,
      social_post: (e) => !!e?.hasPost,
      website_text: (e) => !!e?.hasWebsite,
      facebook_ad: (e) => !!e?.hasFacebook,
    };
    const hasContentFn = hasContentLookup[contentType] ?? (() => false);
    const needsContent = storeProducts.filter((p) => !hasContentFn(contentMap.get(p.id)));

    if (needsContent.length === 0) return;

    setBulkGenerating({
      storeId,
      type: contentType,
      current: 0,
      total: needsContent.length,
    });

    let completed = 0;
    for (const product of needsContent) {
      try {
        const res = await fetch("/api/ai-content/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product.id, contentType }),
        });

        if (res.ok) {
          const newContent: AIGeneratedContent = await res.json();
          setLocalContent((prev) => [
            ...prev.filter(
              (c) =>
                !(c.product_id === product.id && c.content_type === contentType)
            ),
            newContent,
          ]);
        }
      } catch {
        // Log and continue to next product
        console.error(`Bulk generate failed for product ${product.id}`);
      }

      completed++;
      setBulkGenerating((prev) =>
        prev ? { ...prev, current: completed } : null
      );
    }

    setBulkGenerating(null);
    const cfg = CONTENT_TYPE_CONFIG[contentType];
    const typeLabel = cfg ? t(cfg.labelKey) : contentType;
    toast(
      t("bulkComplete", {
        count: needsContent.length,
        type: typeLabel,
        store: storeMap[storeId]?.name || "Store",
      })
    );
  }

  // Selection
  function toggleSelect(productId: string) {
    if (!allowDeleteProduct) return;
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!allowDeleteProduct) return;
    const currentIds = filtered.map((p) => p.id);
    const allSelected = currentIds.every((id) => selectedProducts.has(id));
    if (allSelected) {
      setSelectedProducts((prev) => {
        const next = new Set(prev);
        for (const id of currentIds) next.delete(id);
        return next;
      });
    } else {
      setSelectedProducts((prev) => {
        const next = new Set(prev);
        for (const id of currentIds) next.add(id);
        return next;
      });
    }
  }

  function handleToggleStoreProducts(productIds: string[]) {
    if (!allowDeleteProduct) return;
    const allSelected = productIds.every((id) => selectedProducts.has(id));
    if (allSelected) {
      setSelectedProducts((prev) => {
        const next = new Set(prev);
        for (const id of productIds) next.delete(id);
        return next;
      });
    } else {
      setSelectedProducts((prev) => {
        const next = new Set(prev);
        for (const id of productIds) next.add(id);
        return next;
      });
    }
  }

  const allFilteredSelected =
    filtered.length > 0 &&
    filtered.every((p) => selectedProducts.has(p.id));

  // Delete
  async function handleDeleteProduct(product: Product) {
    if (!allowDeleteProduct) return;
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setLocalProducts((prev) => prev.filter((p) => p.id !== product.id));
      setLocalContent((prev) => prev.filter((c) => c.product_id !== product.id));
      setSelectedProducts((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
      toast(t("productDeleted"), {
        description: t("productDeletedDescription", { title: product.title }),
      });
    } catch {
      toast.error(t("deleteFailed"));
    }
  }

  async function handleBulkDelete() {
    if (!allowDeleteProduct) return;
    const ids = Array.from(selectedProducts);
    const results = await Promise.allSettled(
      ids.map((id) => fetch(`/api/products/${id}`, { method: "DELETE" }))
    );
    const succeeded = results.filter((r) => r.status === "fulfilled" && (r.value as Response).ok);
    if (succeeded.length > 0) {
      const deletedIds = new Set(ids.filter((_, i) => results[i].status === "fulfilled" && (results[i] as PromiseFulfilledResult<Response>).value.ok));
      setLocalProducts((prev) => prev.filter((p) => !deletedIds.has(p.id)));
      setLocalContent((prev) => prev.filter((c) => !c.product_id || !deletedIds.has(c.product_id)));
      setSelectedProducts((prev) => {
        const next = new Set(prev);
        deletedIds.forEach((id) => next.delete(id));
        return next;
      });
      toast(t("bulkDeleted", { count: succeeded.length }));
    }
    if (succeeded.length < ids.length) {
      toast.error(t("deleteFailed"));
    }
    setShowBulkDeleteConfirm(false);
  }

  // Store expand/collapse
  function toggleStore(storeId: string) {
    setExpandedStores((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) next.delete(storeId);
      else next.add(storeId);
      return next;
    });
  }

  function expandAll() {
    setExpandedStores(new Set(storeGroups.map((g) => g.store.id)));
  }

  function collapseAll() {
    setExpandedStores(new Set());
  }

  // ── Store filter handlers (name <-> id conversion) ──
  function handleStoreFilterChange(names: string[]) {
    const ids = names.map((n) => storeNameToId[n]).filter(Boolean);
    setFilter("stores", ids.length > 0 ? ids.join(",") : null);
  }

  // ═══════════════════════════════════
  // ─── RENDER ───
  // ═══════════════════════════════════

  return (
    <div>
      {/* Discount notice banner */}
      {filters.discountFilter && filters.discountFilter !== "all" && (
        <div
          className="flex items-center gap-2 px-4 py-2 mb-4 border-2"
          style={{
            backgroundColor: "var(--primary-muted)",
            borderColor: "var(--border)",
            borderLeft: "4px solid var(--primary-text)",
          }}
        >
          <Tags className="w-3.5 h-3.5" style={{ color: "var(--primary-text)" }} />
          <p
            className="text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            {t("discountNotice", { min: filters.discountFilter })}
          </p>
        </div>
      )}

      {/* ── Toolbar Row 1: Search + View Toggle + Filter Toggle + Selection Actions ── */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {/* Search */}
        <div className="relative" style={{ minWidth: 220 }}>
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: "var(--muted-foreground)" }}
          />
          <Input
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t("searchProducts")}
            className="pl-8 pr-3 py-2 text-xs border-2 outline-none transition-all duration-100 focus:border-primary"
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

        {/* View mode toggle */}
        <ToggleGroup
          options={[
            {
              label: t("viewAll"),
              value: "all",
              icon: <LayoutGrid className="w-3 h-3" />,
            },
            {
              label: t("viewStores"),
              value: "stores",
              icon: <StoreIcon className="w-3 h-3" />,
            },
          ]}
          value={viewMode}
          onChange={setViewMode}
        />

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-all duration-100"
          style={{
            fontFamily: "var(--font-mono)",
            backgroundColor: showFilters
              ? "var(--primary-muted)"
              : "transparent",
            borderColor: showFilters
              ? "var(--primary-border)"
              : "var(--border)",
            color: showFilters ? "var(--primary-text)" : "var(--muted-foreground)",
          }}
        >
          <SlidersHorizontal className="w-3 h-3" />
          {t("showFilters")}
        </button>

        {allowDeleteProduct && (
          <label className="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleSelectAll}
              className="sr-only"
            />
            <div
              className="w-4 h-4 border-2 flex items-center justify-center transition-colors"
              style={{
                backgroundColor: allFilteredSelected
                  ? "var(--primary)"
                  : "transparent",
                borderColor: allFilteredSelected
                  ? "var(--primary-text)"
                  : "var(--border)",
              }}
            >
              {allFilteredSelected && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  stroke="var(--primary-foreground)"
                  strokeWidth="2"
                  strokeLinecap="square"
                >
                  <path d="M2 5l2.5 2.5L8 3" />
                </svg>
              )}
            </div>
            <span
              className="text-[10px] font-bold uppercase tracking-[0.15em]"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--muted-foreground)",
              }}
            >
              {t("selectAll")}
            </span>
          </label>
        )}

        {/* Selected count + Bulk Delete */}
        {allowDeleteProduct && selectedProducts.size > 0 && (
          <>
            <span
              className="text-[10px] font-bold uppercase tracking-[0.15em]"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--primary-text)",
              }}
            >
              {t("selectedCount", { count: selectedProducts.size })}
            </span>
            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-100 hover:opacity-80"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: "#FF453A12",
                border: "1.5px solid #FF453A40",
                color: "#FF453A",
              }}
            >
              <Trash2 className="w-3 h-3" />
              {t("deleteSelected")}
            </button>
          </>
        )}

        {/* Clear all */}
        {(hasAnyFilter || filters.search) && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-100 hover:opacity-80"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            <X className="w-3 h-3" />
            {t("clear")}
          </button>
        )}

        {/* Count */}
        <p
          className="ml-auto text-[10px] font-bold uppercase tracking-[0.15em] whitespace-nowrap"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
          }}
        >
          {hasAnyFilter || filters.search
            ? t("productsFiltered", {
                filtered: filtered.length,
                total: totalCount,
              })
            : t("productsFound", { count: totalCount })}
        </p>
      </div>

      {/* ── Toolbar Row 2: Filters (collapsible) ── */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <MultiSearchableFilter
            label={t("store")}
            resetLabel={t("allStores")}
            searchPlaceholder={t("searchStore")}
            emptyText={t("noResults")}
            selectedText={(count) => t("storesSelected", { count })}
            options={storeNames}
            value={selectedStoreNames}
            onChange={handleStoreFilterChange}
          />
          <MultiSimpleFilter
            label={t("contentStatus")}
            resetLabel={t("allContent")}
            selectedText={(count) => t("contentSelected", { count })}
            options={contentStatusOptions}
            value={filters.contentStatus}
            onChange={(values) => {
              setFilter("contentStatus", values.length > 0 ? values.join(",") : null);
            }}
          />
          <SimpleFilter
            label={t("discount")}
            resetLabel={t("allDiscounts")}
            options={discountOptions}
            value={filters.discountFilter}
            onChange={(v) => setFilter("discount", v)}
          />
          <SimpleFilter
            label={t("sortDiscount")}
            resetLabel={t("noSort")}
            options={sortDiscountOptions}
            value={discountSort}
            onChange={(v) => {
              if (v) {
                setFilters({ sortBy: "discount_percentage", sortDir: v });
              } else {
                setFilters({ sortBy: null, sortDir: null });
              }
            }}
          />
          <SimpleFilter
            label={t("sortPrice")}
            resetLabel={t("noSort")}
            options={sortPriceOptions}
            value={priceSort}
            onChange={(v) => {
              if (v) {
                setFilters({ sortBy: "price", sortDir: v });
              } else {
                setFilters({ sortBy: null, sortDir: null });
              }
            }}
          />
        </div>
      )}

      {/* ── ALL PRODUCTS VIEW ── */}
      <div
        style={{ opacity: isPending ? 0.6 : 1, transition: "opacity 100ms" }}
      >
        {viewMode === "all" && (
          <>
            {/* Empty state — DESIGN.md §5: border-strong + hard-shadow */}
            {filtered.length === 0 ? (
              <div
                className="py-16 text-center"
                style={{
                  backgroundColor: "var(--card)",
                  border: "2px solid var(--border-strong)",
                  boxShadow: "var(--hard-shadow)",
                }}
              >
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.15em]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  {t("noProducts")}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                {filtered.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    store={storeMap[product.store_id]}
                    entry={contentMap.get(product.id)}
                    search={filters.search}
                    isSelected={selectedProducts.has(product.id)}
                    t={t}
                    canSelect={allowDeleteProduct}
                    canDeleteProduct={allowDeleteProduct}
                    canGenerateContent={allowGenerateContent}
                    onOpenModal={openModal}
                    onToggleSelect={toggleSelect}
                    onDelete={allowDeleteProduct ? handleDeleteProduct : undefined}
                  />
                ))}
              </div>
            )}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}

        {/* ── STORE GROUPED VIEW ── */}
        {viewMode === "stores" && (
          <StoreGroupView
            storeGroups={storeGroups}
            expandedStores={expandedStores}
            contentMap={contentMap}
            search={filters.search}
            selectedProducts={selectedProducts}
            allowSelection={allowDeleteProduct}
            allowDeleteProduct={allowDeleteProduct}
            allowGenerateContent={allowGenerateContent}
            bulkGenerating={bulkGenerating}
            t={t}
            onToggleStore={toggleStore}
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
            onBulkGenerate={handleBulkGenerate}
            onOpenModal={openModal}
            onToggleSelect={toggleSelect}
            onToggleStoreProducts={handleToggleStoreProducts}
            onDeleteProduct={allowDeleteProduct ? handleDeleteProduct : undefined}
          />
        )}
      </div>

      {/* ── CONTENT DIALOG ── */}
      <ContentDialog
        modal={modal}
        contentMap={contentMap}
        isGenerating={isGenerating}
        isSending={sendingWebhook !== null}
        editingContent={editingContent}
        editText={editText}
        storeMap={storeMap}
        canGenerateContent={allowGenerateContent}
        canEditContent={allowEditContent}
        // Claude questionnaire props (sequential: one question at a time)
        isAnalyzing={isAnalyzing}
        questionStep={questionStep}
        currentQuestion={currentQuestion}
        onAnalyze={handleAnalyze}
        onAnswerAndNext={(id: string, answer: string) => {
          if (modal) handleAnswerAndNext(id, answer, modal.product, modal.contentType);
        }}
        t={t}
        onClose={() => {
          setModal(null);
          setIsGenerating(false);
          setEditingContent(null);
          setEditText("");
          // Reset questionnaire state
          setIsAnalyzing(false);
          setQuestionStep(0);
          setCurrentQuestion(null);
              setAnswers({});
        }}
        onGenerate={handleGenerate}
        onRegenerate={handleRegenerate}
        onSendToWebhook={handleSendToWebhook}
        onStartEdit={(id, text) => {
          setEditingContent(id);
          setEditText(text);
        }}
        onCancelEdit={() => {
          setEditingContent(null);
          setEditText("");
        }}
        onSaveEdit={handleSaveEdit}
        onEditTextChange={setEditText}
      />

      {/* ── BULK DELETE CONFIRM DIALOG ── */}
      {allowDeleteProduct && (
        <Dialog
          open={showBulkDeleteConfirm}
          onOpenChange={(open) => {
            if (!open) setShowBulkDeleteConfirm(false);
          }}
        >
          {/* Bulk delete dialog — DESIGN.md §5: border-strong + hard-shadow */}
          <DialogContent
            className="p-0 gap-0 sm:max-w-md"
            style={{
              border: "2px solid var(--border-strong)",
              boxShadow: "var(--hard-shadow)",
              backgroundColor: "var(--card)",
              borderRadius: 0,
            }}
          >
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle
                className="text-[13px] font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                {t("confirmBulkDelete", { count: selectedProducts.size })}
              </DialogTitle>
              <p
                className="text-[11px] mt-2"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                }}
              >
                {t("confirmBulkDeleteDescription", {
                  count: selectedProducts.size,
                })}
              </p>
            </DialogHeader>
            <div
              className="flex items-center justify-end gap-2 px-6 pb-6 pt-2"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-all duration-100 hover:opacity-80"
                style={{
                  fontFamily: "var(--font-mono)",
                  backgroundColor: "transparent",
                  borderColor: "var(--border)",
                  color: "var(--muted-foreground)",
                }}
              >
                {t("cancel")}
              </button>
              {/* Destructive confirm — uses #FF453A instead of --hard-shadow */}
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                style={{
                  fontFamily: "var(--font-mono)",
                  backgroundColor: "#FF453A",
                  border: "2px solid #FF453A",
                  color: "#fff",
                  boxShadow: "none",
                }}
              >
                <Trash2 className="w-3 h-3" />
                {t("deleteSelected")}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
