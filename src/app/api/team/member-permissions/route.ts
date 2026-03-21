/**
 * Team member permissions API — workspace-scoped.
 *
 * POST: Set per-member permission overrides within a workspace.
 *
 * Multi-tenant: overrides are stored in workspace_members.permissions,
 * NOT in app_metadata.permission_overrides.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePermissionList } from "@/lib/auth/roles";
import {
  deriveOverridesFromPermissions,
  computeEffectivePermissions,
  normalizePermissionOverrides,
  hasPermissionOverrides,
} from "@/lib/auth/team-access";
import { authenticateTeamAdmin } from "@/lib/auth/team-admin";

const MAX_BODY_SIZE = 8_192;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  try {
    const actor = await authenticateTeamAdmin();
    if (!actor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
    if (contentLength > MAX_BODY_SIZE) {
      return NextResponse.json({ error: "Request body too large" }, { status: 413 });
    }

    const body = await req.json();
    const userId = typeof body.user_id === "string" ? body.user_id.trim() : "";
    const requestedPermissions = normalizePermissionList(body.permissions);

    if (!UUID_RE.test(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Find the member in this workspace
    const { data: member } = await supabase
      .from("workspace_members")
      .select("id, user_id, role")
      .eq("workspace_id", actor.workspaceId)
      .eq("user_id", userId)
      .single();

    if (!member) {
      return NextResponse.json({ error: "Member not found in workspace" }, { status: 404 });
    }

    const role = member.role as "admin" | "operator" | "viewer";

    if (role === "admin") {
      return NextResponse.json(
        { error: "Admin permissions are fixed to full access." },
        { status: 400 }
      );
    }

    // Derive overrides (allow/deny) from the requested permissions
    // relative to the workspace's role defaults
    const overrides = deriveOverridesFromPermissions(
      role,
      actor.workspaceMatrix,
      requestedPermissions
    );
    const effectivePermissions = computeEffectivePermissions(
      role,
      actor.workspaceMatrix,
      overrides
    );

    // Store overrides on workspace_members.permissions
    const permissionsData = hasPermissionOverrides(overrides)
      ? { allow: overrides.allow, deny: overrides.deny }
      : null;

    const { error: updateErr } = await supabase
      .from("workspace_members")
      .update({ permissions: permissionsData })
      .eq("id", member.id);

    if (updateErr) {
      console.error("Member permissions update error:", updateErr);
      return NextResponse.json(
        { error: "Failed to update member permissions" },
        { status: 500 }
      );
    }

    // Look up email for the response
    const { data: authData } = await supabase.auth.admin.getUserById(userId);
    const email = authData?.user?.email ?? "";

    return NextResponse.json({
      success: true,
      member: {
        id: userId,
        email,
        role,
        permissions: effectivePermissions,
        is_customized: hasPermissionOverrides(overrides),
      },
    });
  } catch (err) {
    console.error("Team member permissions POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
