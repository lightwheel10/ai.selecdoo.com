/**
 * GET/PUT /api/settings/ai-skills
 *
 * Manages workspace-scoped AI content generation prompts (context & framework).
 * Each workspace has its own config stored under key "ai_skills:{workspaceId}"
 * in the app_settings table. This keeps workspace configs isolated — one
 * workspace's edits never affect another's.
 *
 * When no custom config exists for a workspace, the UI shows empty textareas
 * (the hardcoded Hormozi defaults are NOT shown to admins — they're hidden
 * as the platform's built-in intelligence).
 *
 * Content generation still works without custom config — it falls back to
 * the hardcoded defaults in prompts.ts via getAISkillsFromDB().
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/auth/roles";
import { aiSkillsKey } from "@/lib/ai-content/prompts";

export async function GET() {
  try {
    const { user, role, permissions, isDevBypass, workspaceId } = await getAuthContext();
    if (!user && !isDevBypass) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canAccessAdmin({ role, permissions })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace context" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const dbKey = aiSkillsKey(workspaceId);

    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", dbKey)
      .single();

    // Check if this workspace has a saved config
    const saved =
      data?.value &&
      typeof data.value === "object" &&
      typeof (data.value as Record<string, unknown>).context === "string" &&
      typeof (data.value as Record<string, unknown>).framework === "string"
        ? (data.value as { context: string; framework: string })
        : null;

    return NextResponse.json({
      // Show the workspace's saved config, or empty strings if none exists.
      // The hardcoded defaults (Hormozi) are NEVER exposed in the API response —
      // they're the platform's built-in intelligence that clients shouldn't see.
      context: saved?.context ?? "",
      framework: saved?.framework ?? "",
      hasCustomConfig: !!saved,
    });
  } catch (err) {
    console.error("GET ai-skills error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { user, role, permissions, isDevBypass, workspaceId } = await getAuthContext();
    if (!user && !isDevBypass) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canAccessAdmin({ role, permissions })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace context" }, { status: 400 });
    }

    const body = await req.json();
    const { context, framework } = body;

    // Both fields are required non-empty strings
    if (
      typeof context !== "string" ||
      typeof framework !== "string" ||
      !context.trim() ||
      !framework.trim()
    ) {
      return NextResponse.json(
        { error: "Invalid body: context and framework must be non-empty strings" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const dbKey = aiSkillsKey(workspaceId);

    // Upsert: try update first, insert if the row doesn't exist yet
    const { data: existing } = await supabase
      .from("app_settings")
      .select("key")
      .eq("key", dbKey)
      .single();

    if (existing) {
      const { error } = await supabase
        .from("app_settings")
        .update({
          value: { context, framework },
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        })
        .eq("key", dbKey);

      if (error) {
        console.error("Update ai-skills error:", error);
        return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
      }
    } else {
      const { error } = await supabase.from("app_settings").insert({
        key: dbKey,
        value: { context, framework },
        updated_by: user?.id ?? null,
      });

      if (error) {
        console.error("Insert ai-skills error:", error);
        return NextResponse.json({ error: "Failed to save config" }, { status: 500 });
      }
    }

    return NextResponse.json({ context, framework });
  } catch (err) {
    console.error("PUT ai-skills error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/settings/ai-skills — Reset to defaults.
 * Deletes the workspace's custom AI skills config, causing content
 * generation to fall back to the hardcoded defaults.
 */
export async function DELETE() {
  try {
    const { user, role, permissions, isDevBypass, workspaceId } = await getAuthContext();
    if (!user && !isDevBypass) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canAccessAdmin({ role, permissions })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace context" }, { status: 400 });
    }

    const supabase = createAdminClient();
    await supabase
      .from("app_settings")
      .delete()
      .eq("key", aiSkillsKey(workspaceId));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE ai-skills error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
