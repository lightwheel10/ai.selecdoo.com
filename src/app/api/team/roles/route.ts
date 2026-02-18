import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isAppRole,
  normalizeAppRole,
  normalizePermissionList,
} from "@/lib/auth/roles";
import { isBootstrapAdminEmail, resolveAppRole } from "@/lib/auth/roles-server";
import {
  applyRoleAndPermissionsToMetadata,
  computeEffectivePermissions,
  getPermissionOverridesFromMetadata,
  hasPermissionOverrides,
} from "@/lib/auth/team-access";
import { authenticateTeamAdmin, listAllAuthUsers } from "@/lib/auth/team-admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY_SIZE = 8_192; // 8 KB
const DEFAULT_APP_METADATA: Record<string, unknown> = {};

function hasExplicitPermissions(metadata: Record<string, unknown>): boolean {
  return "permissions" in metadata;
}

function listEquals(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

export async function GET() {
  try {
    const actor = await authenticateTeamAdmin();
    if (!actor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await listAllAuthUsers();

    const mapped = users
      .filter((u) => !!u.email)
      .map((u) => {
        const metadata =
          (u.app_metadata as Record<string, unknown> | undefined) ??
          DEFAULT_APP_METADATA;
        const role = resolveAppRole({
          email: u.email,
          app_metadata: metadata,
        });
        const overrides = getPermissionOverridesFromMetadata(metadata);
        const permissions = hasExplicitPermissions(metadata)
          ? normalizePermissionList(metadata.permissions)
          : computeEffectivePermissions(role, actor.workspaceMatrix, overrides);
        const roleDefaults =
          role === "admin" ? actor.workspaceMatrix.admin : actor.workspaceMatrix[role];
        const isCustomized =
          role !== "admin" &&
          (hasPermissionOverrides(overrides) || !listEquals(permissions, roleDefaults));

        return {
          id: u.id,
          email: u.email!,
          role,
          permissions,
          is_customized: isCustomized,
          created_at: u.created_at ?? null,
          last_sign_in_at: u.last_sign_in_at ?? null,
          is_bootstrap_admin: isBootstrapAdminEmail(u.email),
        };
      })
      .sort((a, b) => a.email.localeCompare(b.email));

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

    const users = await listAllAuthUsers();
    const target = users.find((u) => (u.email ?? "").toLowerCase() === email);

    if (!target) {
      return NextResponse.json(
        { error: "User not found. Ask the user to log in once first." },
        { status: 404 }
      );
    }

    if (isBootstrapAdminEmail(target.email)) {
      return NextResponse.json(
        { error: "Bootstrap admin role is controlled by environment." },
        { status: 400 }
      );
    }

    const targetRole = normalizeAppRole(target.app_metadata?.role);
    if (target.id === actor.id && roleInput !== "admin") {
      return NextResponse.json(
        { error: "You cannot remove your own admin role." },
        { status: 400 }
      );
    }

    if (targetRole === "admin" && roleInput !== "admin") {
      const adminCount = users.filter(
        (u) =>
          resolveAppRole({
            email: u.email,
            app_metadata:
              (u.app_metadata as Record<string, unknown> | undefined) ?? null,
          }) === "admin"
      ).length;

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "At least one admin must remain." },
          { status: 400 }
        );
      }
    }

    const supabase = createAdminClient();
    const nextMetadata = applyRoleAndPermissionsToMetadata(
      target.app_metadata,
      roleInput,
      actor.workspaceMatrix
    );
    const { error: updateErr } = await supabase.auth.admin.updateUserById(
      target.id,
      { app_metadata: nextMetadata }
    );

    if (updateErr) {
      console.error("Role update error:", updateErr);
      return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
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
