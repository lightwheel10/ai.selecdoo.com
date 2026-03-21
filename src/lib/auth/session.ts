/**
 * Auth context for the application.
 *
 * Multi-tenant: role and permissions are resolved per-workspace from
 * the workspace_members table, NOT from app_metadata.
 *
 * Backward compatible: if no workspaceId is provided, the user's
 * first (or only) workspace is auto-resolved. This means all existing
 * callers continue to work without changes.
 */

import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { APP_PERMISSIONS, type AppPermission, type AppRole } from "@/lib/auth/roles";
import {
  getWorkspaceMembership,
  getDefaultWorkspaceMembership,
  type WorkspaceMembership,
} from "@/lib/auth/workspace";

export interface AuthContext {
  user: User | null;
  workspaceId: string | null;
  role: AppRole;
  permissions: AppPermission[];
  isDevBypass: boolean;
}

/**
 * Get the auth context for the current request.
 *
 * @param workspaceId - Optional workspace ID. If provided, resolves
 *   role/permissions for that specific workspace. If omitted, auto-
 *   resolves the user's first workspace (most users have exactly one).
 */
export async function getAuthContext(
  workspaceId?: string | null
): Promise<AuthContext> {
  // ── Dev bypass: full admin access for local development ──
  const isDevBypass =
    process.env.NODE_ENV === "development" &&
    process.env.DEV_BYPASS === "true";

  if (isDevBypass) {
    // In dev bypass, try to resolve a real workspace for realistic testing.
    // Falls back to null workspaceId if no workspaces exist yet.
    let devWorkspaceId: string | null = workspaceId ?? null;
    if (!devWorkspaceId) {
      try {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const supabase = createAdminClient();
        const { data } = await supabase
          .from("workspaces")
          .select("id")
          .is("deleted_at", null)
          .limit(1);
        devWorkspaceId = data?.[0]?.id ?? null;
      } catch {
        // No workspaces yet — fine for initial setup
      }
    }

    return {
      user: null,
      workspaceId: devWorkspaceId,
      role: "admin",
      permissions: [...APP_PERMISSIONS],
      isDevBypass: true,
    };
  }

  // ── Standard auth flow ──
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      workspaceId: null,
      role: "viewer",
      permissions: [],
      isDevBypass: false,
    };
  }

  // ── Resolve workspace membership ──
  // If workspaceId provided, check membership in that workspace.
  // Otherwise, auto-resolve the user's first workspace.
  let membership: WorkspaceMembership | null = null;

  if (workspaceId) {
    membership = await getWorkspaceMembership(user.id, workspaceId);
  } else {
    membership = await getDefaultWorkspaceMembership(user.id);
  }

  // User exists but has no workspace membership — new user who hasn't
  // created a workspace yet, or was removed from their workspace.
  if (!membership) {
    return {
      user,
      workspaceId: null,
      role: "viewer",
      permissions: [],
      isDevBypass: false,
    };
  }

  return {
    user,
    workspaceId: membership.workspaceId,
    role: membership.role,
    permissions: membership.permissions,
    isDevBypass: false,
  };
}
