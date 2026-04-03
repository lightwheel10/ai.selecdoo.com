import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/auth/roles";
import { DEFAULT_CONTEXT, DEFAULT_FRAMEWORK } from "@/lib/ai-content/prompts";

// ---------------------------------------------------------------------------
// /api/settings/ai-skills
//
// Manages the custom AI content-generation prompts (context & framework).
// These are stored in the `app_settings` table under the key "ai_skills".
// When no row exists yet, the built-in defaults from prompts.ts are returned
// so the UI always has something to display.
// ---------------------------------------------------------------------------

const DB_KEY = "ai_skills";

export async function GET() {
  try {
    const { user, role, permissions, isDevBypass } = await getAuthContext();
    if (!user && !isDevBypass) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canAccessAdmin({ role, permissions })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();

    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", DB_KEY)
      .single();

    // If a saved row exists with valid shape, use it; otherwise fall back to defaults
    const saved =
      data?.value &&
      typeof data.value === "object" &&
      typeof (data.value as Record<string, unknown>).context === "string" &&
      typeof (data.value as Record<string, unknown>).framework === "string"
        ? (data.value as { context: string; framework: string })
        : null;

    return NextResponse.json({
      context: saved?.context ?? DEFAULT_CONTEXT,
      framework: saved?.framework ?? DEFAULT_FRAMEWORK,
      defaults: {
        context: DEFAULT_CONTEXT,
        framework: DEFAULT_FRAMEWORK,
      },
    });
  } catch (err) {
    console.error("GET ai-skills error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const { user, role, permissions, isDevBypass } = await getAuthContext();
    if (!user && !isDevBypass) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canAccessAdmin({ role, permissions })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    // Upsert: try update first, insert if the row doesn't exist yet
    const { data: existing } = await supabase
      .from("app_settings")
      .select("key")
      .eq("key", DB_KEY)
      .single();

    if (existing) {
      const { error } = await supabase
        .from("app_settings")
        .update({
          value: { context, framework },
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        })
        .eq("key", DB_KEY);

      if (error) {
        console.error("Update ai-skills error:", error);
        return NextResponse.json(
          { error: "Failed to update config" },
          { status: 500 }
        );
      }
    } else {
      const { error } = await supabase.from("app_settings").insert({
        key: DB_KEY,
        value: { context, framework },
        updated_by: user?.id ?? null,
      });

      if (error) {
        console.error("Insert ai-skills error:", error);
        return NextResponse.json(
          { error: "Failed to save config" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ context, framework });
  } catch (err) {
    console.error("PUT ai-skills error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
