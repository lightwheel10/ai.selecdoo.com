/**
 * Admin AI Skills Tab — workspace-scoped AI prompt editor.
 *
 * Each workspace has its own AI skills config. When no custom config exists:
 * - Textareas are EMPTY (hardcoded Hormozi defaults are hidden)
 * - A warning explains that overwriting costs 99 EUR to restore
 * - Content generation still works — falls back to hidden defaults
 *
 * When custom config exists:
 * - Textareas show the saved text
 * - Warning is hidden (they already committed)
 * - "Reset to Default" deletes the config (goes back to empty + defaults)
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, RotateCcw, Save, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface AISkillsData {
  context: string;
  framework: string;
  hasCustomConfig: boolean;
}

export function AdminAISkillsTab() {
  const t = useTranslations("Admin");

  // ── State ──
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  // Current values (what the user sees and edits)
  const [context, setContext] = useState("");
  const [framework, setFramework] = useState("");

  // Saved values (last saved state — for dirty tracking)
  const [savedContext, setSavedContext] = useState("");
  const [savedFramework, setSavedFramework] = useState("");

  // Whether this workspace has ever saved custom config
  const [hasCustomConfig, setHasCustomConfig] = useState(false);

  // ── Dirty tracking ──
  const isDirty = useMemo(
    () => context !== savedContext || framework !== savedFramework,
    [context, framework, savedContext, savedFramework]
  );

  // Whether textareas have any content (determines if save is allowed)
  const hasContent = context.trim().length > 0 && framework.trim().length > 0;

  // ── Fetch on mount ──
  useEffect(() => {
    fetchSkills();
  }, []);

  async function fetchSkills() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/settings/ai-skills");
      if (!res.ok) throw new Error();
      const data: AISkillsData = await res.json();

      setContext(data.context);
      setFramework(data.framework);
      setSavedContext(data.context);
      setSavedFramework(data.framework);
      setHasCustomConfig(data.hasCustomConfig);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  // ── Save ──
  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/ai-skills", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, framework }),
      });
      if (!res.ok) throw new Error();

      setSavedContext(context);
      setSavedFramework(framework);
      setHasCustomConfig(true);
      toast(t("aiSkillsSaved"), {
        description: t("aiSkillsSavedDescription"),
      });
    } catch {
      toast.error(t("aiSkillsSaveFailed"));
    } finally {
      setSaving(false);
    }
  }

  // ── Discard ──
  function handleDiscard() {
    setContext(savedContext);
    setFramework(savedFramework);
  }

  // ── Reset to defaults (delete workspace config) ──
  async function handleReset() {
    try {
      const res = await fetch("/api/settings/ai-skills", { method: "DELETE" });
      if (!res.ok) throw new Error();

      // Clear everything — workspace goes back to empty (hidden defaults used)
      setContext("");
      setFramework("");
      setSavedContext("");
      setSavedFramework("");
      setHasCustomConfig(false);
      toast(t("aiSkillsReset"));
    } catch {
      toast.error(t("aiSkillsSaveFailed"));
    }
  }

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="space-y-4">
        <div
          className="p-6 animate-pulse"
          style={{
            backgroundColor: "var(--card)",
            border: "2px solid var(--border-strong)",
            boxShadow: "var(--hard-shadow)",
          }}
        >
          <div className="h-4 w-48 mb-4" style={{ backgroundColor: "var(--border)" }} />
          <div className="h-32 w-full" style={{ backgroundColor: "var(--border)" }} />
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div
        className="p-6 text-center"
        style={{
          backgroundColor: "var(--card)",
          border: "2px solid var(--border-strong)",
          boxShadow: "var(--hard-shadow)",
        }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
        >
          {t("aiSkillsLoadFailed")}
        </p>
        <button
          onClick={fetchSkills}
          className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] bg-primary text-primary-foreground"
          style={{
            fontFamily: "var(--font-mono)",
            border: "2px solid var(--border-strong)",
          }}
        >
          {t("aiSkillsRetry")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Description ── */}
      <div
        className="p-4"
        style={{
          backgroundColor: "var(--card)",
          border: "2px solid var(--border-strong)",
          boxShadow: "var(--hard-shadow)",
        }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1"
          style={{ fontFamily: "var(--font-mono)", color: "var(--primary-text)" }}
        >
          {t("aiSkillsTitle")}
        </p>
        <p
          className="text-[12px] leading-relaxed"
          style={{ fontFamily: "var(--font-body)", color: "var(--muted-foreground)" }}
        >
          {t("aiSkillsDescription")}
        </p>
      </div>

      {/* ── Warning: 99 EUR restore cost ──
          Only shown when NO custom config exists (workspace hasn't committed yet).
          Once they save, the warning disappears — they made their choice. */}
      {!hasCustomConfig && (
        <div
          className="p-4 flex items-start gap-3"
          style={{
            backgroundColor: "rgba(255,159,10,0.06)",
            border: "2px solid rgba(255,159,10,0.3)",
          }}
        >
          <AlertTriangle
            className="w-4 h-4 shrink-0 mt-0.5"
            style={{ color: "#FF9F0A" }}
          />
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1"
              style={{ fontFamily: "var(--font-mono)", color: "#FF9F0A" }}
            >
              {t("aiSkillsWarningTitle")}
            </p>
            <p
              className="text-[11px] leading-relaxed"
              style={{ fontFamily: "var(--font-body)", color: "var(--muted-foreground)" }}
            >
              {t("aiSkillsWarningDescription")}
            </p>
          </div>
        </div>
      )}

      {/* ── Platform Context ── */}
      <div
        className="p-4"
        style={{
          backgroundColor: "var(--card)",
          border: "2px solid var(--border-strong)",
          boxShadow: "var(--hard-shadow)",
        }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1"
          style={{ fontFamily: "var(--font-mono)", color: "var(--foreground)" }}
        >
          {t("aiSkillsContext")}
        </p>
        <p
          className="text-[11px] leading-relaxed mb-3"
          style={{ fontFamily: "var(--font-body)", color: "var(--muted-foreground)" }}
        >
          {t("aiSkillsContextDescription")}
        </p>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder={t("aiSkillsContextPlaceholder")}
          className="w-full text-[11px] leading-relaxed p-3 border-2 resize-y outline-none transition-all duration-100 focus:border-primary"
          style={{
            backgroundColor: "var(--input)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
            borderRadius: 0,
            minHeight: 120,
            fontFamily: "var(--font-mono)",
            whiteSpace: "pre-wrap",
          }}
        />
        {context.length > 0 && (
          <p
            className="text-[9px] font-bold uppercase tracking-[0.15em] mt-1.5"
            style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
          >
            {context.length} chars
          </p>
        )}
      </div>

      {/* ── Copywriting Framework ── */}
      <div
        className="p-4"
        style={{
          backgroundColor: "var(--card)",
          border: "2px solid var(--border-strong)",
          boxShadow: "var(--hard-shadow)",
        }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1"
          style={{ fontFamily: "var(--font-mono)", color: "var(--foreground)" }}
        >
          {t("aiSkillsFramework")}
        </p>
        <p
          className="text-[11px] leading-relaxed mb-3"
          style={{ fontFamily: "var(--font-body)", color: "var(--muted-foreground)" }}
        >
          {t("aiSkillsFrameworkDescription")}
        </p>
        <textarea
          value={framework}
          onChange={(e) => setFramework(e.target.value)}
          placeholder={t("aiSkillsFrameworkPlaceholder")}
          className="w-full text-[11px] leading-relaxed p-3 border-2 resize-y outline-none transition-all duration-100 focus:border-primary"
          style={{
            backgroundColor: "var(--input)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
            borderRadius: 0,
            minHeight: 240,
            fontFamily: "var(--font-mono)",
            whiteSpace: "pre-wrap",
          }}
        />
        {framework.length > 0 && (
          <p
            className="text-[9px] font-bold uppercase tracking-[0.15em] mt-1.5"
            style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
          >
            {framework.length} chars
          </p>
        )}
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex items-center gap-2">
        {/* Reset — only visible when custom config exists */}
        {hasCustomConfig && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-all duration-100 hover:opacity-80"
            style={{
              fontFamily: "var(--font-mono)",
              backgroundColor: "transparent",
              borderColor: "var(--border)",
              color: "var(--muted-foreground)",
            }}
          >
            <RotateCcw className="w-3 h-3" />
            {t("aiSkillsResetDefaults")}
          </button>
        )}

        {/* Discard changes */}
        {isDirty && (
          <button
            onClick={handleDiscard}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-all duration-100 hover:opacity-80"
            style={{
              fontFamily: "var(--font-mono)",
              backgroundColor: "transparent",
              borderColor: "var(--border)",
              color: "var(--muted-foreground)",
            }}
          >
            {t("aiSkillsDiscard")}
          </button>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!isDirty || !hasContent || saving}
          className="flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] bg-primary text-primary-foreground transition-all duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:pointer-events-none"
          style={{
            fontFamily: "var(--font-mono)",
            border: "2px solid var(--border-strong)",
            boxShadow: "var(--hard-shadow)",
          }}
        >
          {saving ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Save className="w-3 h-3" />
          )}
          {saving ? t("aiSkillsSaving") : t("aiSkillsSave")}
        </button>
      </div>
    </div>
  );
}
