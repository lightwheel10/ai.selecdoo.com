/**
 * Workspace creation API.
 *
 * POST: Creates a new workspace + adds the current user as admin.
 * Called during signup after OTP verification.
 *
 * The workspace slug is auto-generated from the name (kebab-case)
 * with a uniqueness check. If the slug is taken, a random suffix
 * is appended.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MAX_BODY_SIZE = 4_096;

/**
 * Generate a URL-safe slug from a workspace name.
 * e.g., "My Company" → "my-company"
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50) || "workspace";
}

export async function POST(req: Request) {
  try {
    const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
    if (contentLength > MAX_BODY_SIZE) {
      return NextResponse.json({ error: "Request body too large" }, { status: 413 });
    }

    // Get the authenticated user (just verified OTP)
    const supabaseAuth = await createClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Add per-user workspace creation limit (e.g., max 3-5 workspaces).
    // Currently any authenticated user can create unlimited workspaces via
    // direct API calls. Low priority since the UI only creates one on signup,
    // but should be hardened before scaling to many users.

    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "Workspace name must be at least 2 characters" },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: "Workspace name must be under 100 characters" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Generate a unique slug
    let slug = generateSlug(name);
    const { data: existing } = await supabase
      .from("workspaces")
      .select("id")
      .eq("slug", slug)
      .is("deleted_at", null)
      .single();

    if (existing) {
      // Slug taken — append random suffix
      const suffix = Math.random().toString(36).slice(2, 6);
      slug = `${slug}-${suffix}`;
    }

    // Create the workspace
    const { data: workspace, error: createErr } = await supabase
      .from("workspaces")
      .insert({
        name,
        slug,
        created_by: user.id,
      })
      .select("id, name, slug")
      .single();

    if (createErr || !workspace) {
      console.error("Workspace creation error:", createErr);
      return NextResponse.json(
        { error: "Failed to create workspace" },
        { status: 500 }
      );
    }

    // Add the creator as admin member
    const { error: memberErr } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: "admin",
      });

    if (memberErr) {
      console.error("Workspace member creation error:", memberErr);
      // Clean up the workspace if member creation fails
      await supabase.from("workspaces").delete().eq("id", workspace.id);
      return NextResponse.json(
        { error: "Failed to create workspace membership" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
      },
    });
  } catch (err) {
    console.error("Workspace creation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
