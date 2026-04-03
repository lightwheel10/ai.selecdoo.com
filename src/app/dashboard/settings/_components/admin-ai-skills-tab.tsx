/**
 * Admin AI Skills Tab — editable platform context and copywriting framework.
 *
 * Allows workspace admins to customize the AI prompts used for content
 * generation without code changes. Two text fields:
 *
 * 1. Platform Context — who the content is for, target audience, how it's used
 * 2. Copywriting Framework — writing style, structure, rules (e.g. Hormozi skill)
 *
 * Values are stored in the app_settings table (key: "ai_skills") and read
 * by the analyze and generate API routes on every content generation call.
 * Falls back to hardcoded defaults if not configured.
 *
 * Follows the same patterns as admin-webhook-tab.tsx:
 * - Fetch on mount, dirty state tracking, save/discard, reset to defaults
 * - Card styling per DESIGN.md §5 (border-strong + hard-shadow)
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface AISkillsData {
  context: string;
  framework: string;
  defaults: {
    context: string;
    framework: string;
  };
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

  // Defaults (for reset button)
  const [defaults, setDefaults] = useState<{ context: string; framework: string }>({
    context: "",
    framework: "",
  });

  // ── Dirty tracking ──
  const isDirty = useMemo(
    () => context !== savedContext || framework !== savedFramework,
    [context, framework, savedContext, savedFramework]
  );

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
      setDefaults(data.defaults);
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

  // ── Reset to defaults ──
  function handleReset() {
    setContext(defaults.context);
    setFramework(defaults.framework);
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
        <div
          className="p-6 animate-pulse"
          style={{
            backgroundColor: "var(--card)",
            border: "2px solid var(--border-strong)",
            boxShadow: "var(--hard-shadow)",
          }}
        >
          <div className="h-4 w-56 mb-4" style={{ backgroundColor: "var(--border)" }} />
          <div className="h-48 w-full" style={{ backgroundColor: "var(--border)" }} />
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
        <p
          className="text-[9px] font-bold uppercase tracking-[0.15em] mt-1.5"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
        >
          {context.length} chars
        </p>
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
        <p
          className="text-[9px] font-bold uppercase tracking-[0.15em] mt-1.5"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
        >
          {framework.length} chars
        </p>
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex items-center gap-2">
        {/* Reset to defaults */}
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
          disabled={!isDirty || saving}
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
