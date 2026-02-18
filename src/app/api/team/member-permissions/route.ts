import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePermissionList } from "@/lib/auth/roles";
import { isBootstrapAdminEmail, resolveAppRole } from "@/lib/auth/roles-server";
import {
  applyExplicitPermissionsToMetadata,
  getPermissionOverridesFromMetadata,
  hasPermissionOverrides,
} from "@/lib/auth/team-access";
import { authenticateTeamAdmin, listAllAuthUsers } from "@/lib/auth/team-admin";

const MAX_BODY_SIZE = 8_192; // 8 KB
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

    const users = await listAllAuthUsers();
    const target = users.find((user) => user.id === userId);

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (isBootstrapAdminEmail(target.email)) {
      return NextResponse.json(
        { error: "Bootstrap admin access is controlled by environment." },
        { status: 400 }
      );
    }

    const role = resolveAppRole({
      email: target.email,
      app_metadata:
        (target.app_metadata as Record<string, unknown> | undefined) ?? null,
    });

    if (role === "admin") {
      return NextResponse.json(
        { error: "Admin permissions are fixed to full access." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    // Convert explicit user permissions into role-relative allow/deny overrides.
    const nextMetadata = applyExplicitPermissionsToMetadata(
      target.app_metadata,
      role,
      actor.workspaceMatrix,
      requestedPermissions
    );

    const { error: updateErr } = await supabase.auth.admin.updateUserById(target.id, {
      app_metadata: nextMetadata,
    });

    if (updateErr) {
      console.error("Team member permissions update error:", updateErr);
      return NextResponse.json(
        { error: "Failed to update member permissions" },
        { status: 500 }
      );
    }

    const metadata = nextMetadata as Record<string, unknown>;
    const overrides = getPermissionOverridesFromMetadata(nextMetadata);

    return NextResponse.json({
      success: true,
      member: {
        id: target.id,
        email: target.email,
        role,
        permissions: normalizePermissionList(metadata.permissions),
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
