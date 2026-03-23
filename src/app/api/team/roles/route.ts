/**
 * Team roles API — workspace-scoped.
 *
 * GET: List members of the current workspace with their roles/permissions.
 * POST: Add or change a member's role in the workspace.
 *
 * Multi-tenant: all operations are scoped to the actor's workspace.
 * Members are stored in workspace_members, not in app_metadata.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isAppRole,
  normalizeRolePermissionMatrix,
  type AppRole,
} from "@/lib/auth/roles";
import {
  computeEffectivePermissions,
  normalizePermissionOverrides,
  hasPermissionOverrides,
} from "@/lib/auth/team-access";
import { authenticateTeamAdmin, listWorkspaceMembers } from "@/lib/auth/team-admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY_SIZE = 8_192;

export async function GET() {
  try {
    const actor = await authenticateTeamAdmin();
    if (!actor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const members = await listWorkspaceMembers(actor.workspaceId);

    const mapped = members.map((m) => {
      const role = (m.role as AppRole) || "viewer";
      const overrides = normalizePermissionOverrides(m.permissions);
      const permissions = computeEffectivePermissions(
        role,
        actor.workspaceMatrix,
        overrides
      );
      const roleDefaults =
        role === "admin" ? actor.workspaceMatrix.admin : actor.workspaceMatrix[role];
      const isCustomized =
        role !== "admin" && hasPermissionOverrides(overrides);

      return {
        id: m.user_id,
        email: m.email,
        role,
        permissions,
        is_customized: isCustomized,
        created_at: m.created_at,
        last_sign_in_at: m.last_sign_in_at,
      };
    }).sort((a, b) => a.email.localeCompare(b.email));

    return NextResponse.json({ members: mapped });
  } catch (err) {
    console.error("Team roles GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

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
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const roleInput = body.role;

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (!isAppRole(roleInput)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Find user by email in Supabase Auth
    const { data: authData } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    let target = (authData?.users ?? []).find(
      (u) => (u.email ?? "").toLowerCase() === email
    );

    let invited = false;

    if (!target) {
      // User doesn't exist yet — invite them via Supabase (sends email)
      const { data: workspaceData } = await supabase
        .from("workspaces")
        .select("name")
        .eq("id", actor.workspaceId)
        .single();

      const workspaceName = workspaceData?.name ?? "your team";

      const { data: inviteData, error: inviteError } =
        await supabase.auth.admin.inviteUserByEmail(email, {
          data: {
            invited_to_workspace: actor.workspaceId,
            invited_role: roleInput,
            workspace_name: workspaceName,
          },
        });

      if (inviteError || !inviteData.user) {
        console.error("Invite error:", inviteError);
        return NextResponse.json(
          { error: inviteError?.message ?? "Failed to send invitation" },
          { status: 500 }
        );
      }

      target = inviteData.user;
      invited = true;
    }

    // Check if user is already a member of this workspace
    const { data: existingMember } = await supabase
      .from("workspace_members")
      .select("id, role")
      .eq("workspace_id", actor.workspaceId)
      .eq("user_id", target.id)
      .single();

    // Prevent self-demotion from admin
    if (target.id === actor.id && roleInput !== "admin") {
      return NextResponse.json(
        { error: "You cannot remove your own admin role." },
        { status: 400 }
      );
    }

    // Prevent removing last admin
    if (existingMember?.role === "admin" && roleInput !== "admin") {
      const { count } = await supabase
        .from("workspace_members")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", actor.workspaceId)
        .eq("role", "admin");

      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: "At least one admin must remain." },
          { status: 400 }
        );
      }
    }

    if (existingMember) {
      // Update existing member's role
      const { error: updateErr } = await supabase
        .from("workspace_members")
        .update({ role: roleInput })
        .eq("id", existingMember.id);

      if (updateErr) {
        console.error("Role update error:", updateErr);
        return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
      }
    } else {
      // Add new member to workspace
      const { error: insertErr } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: actor.workspaceId,
          user_id: target.id,
          role: roleInput,
          invited_by: actor.id,
        });

      if (insertErr) {
        console.error("Member insert error:", insertErr);
        return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      invited,
      member: {
        id: target.id,
        email: target.email,
        role: roleInput,
      },
    });
  } catch (err) {
    console.error("Team roles POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
