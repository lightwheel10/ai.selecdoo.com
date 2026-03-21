/**
 * Team admin utilities for workspace-scoped team management.
 *
 * Multi-tenant: team operations are scoped to a single workspace.
 * The old listAllAuthUsers() is removed — team members are now
 * queried from workspace_members, not the global auth.users table.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  canManageTeamRoles,
  getDefaultRolePermissionMatrix,
  normalizeRolePermissionMatrix,
  type RolePermissionMatrix,
} from "@/lib/auth/roles";
import { getAuthContext } from "@/lib/auth/session";

export interface TeamAdminActor {
  id: string;
  email: string | null;
  workspaceId: string;
  workspaceMatrix: RolePermissionMatrix;
}

/**
 * Authenticate the current user as a team admin for a workspace.
 * Returns null if the user is not authenticated, not a member, or
 * lacks team:manage_roles permission in the workspace.
 */
export async function authenticateTeamAdmin(
  workspaceId?: string | null
): Promise<TeamAdminActor | null> {
  const { user, workspaceId: resolvedWorkspaceId, role, permissions, isDevBypass } =
    await getAuthContext(workspaceId);

  const activeWorkspaceId = workspaceId ?? resolvedWorkspaceId;

  if (isDevBypass && activeWorkspaceId) {
    // Dev bypass: look up workspace matrix from DB for realistic testing
    let matrix = getDefaultRolePermissionMatrix();
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("workspaces")
        .select("role_permissions")
        .eq("id", activeWorkspaceId)
        .single();
      if (data?.role_permissions) {
        matrix = normalizeRolePermissionMatrix(data.role_permissions);
      }
    } catch {
      // Fall back to defaults
    }

    return {
      id: "dev-bypass",
      email: null,
      workspaceId: activeWorkspaceId,
      workspaceMatrix: matrix,
    };
  }

  if (!user || !activeWorkspaceId) return null;
  if (!canManageTeamRoles({ role, permissions })) return null;

  // Look up the workspace's permission matrix
  const supabase = createAdminClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("role_permissions")
    .eq("id", activeWorkspaceId)
    .single();

  const matrix = workspace?.role_permissions
    ? normalizeRolePermissionMatrix(workspace.role_permissions)
    : getDefaultRolePermissionMatrix();

  return {
    id: user.id,
    email: user.email ?? null,
    workspaceId: activeWorkspaceId,
    workspaceMatrix: matrix,
  };
}

// listAllAuthUsers() has been removed — it listed ALL Supabase users
// globally which is a multi-tenant data leak. Use listWorkspaceMembers()
// to list members of a specific workspace instead.

/**
 * List members of a specific workspace.
 * Returns workspace_members rows with user email looked up from auth.
 */
export async function listWorkspaceMembers(workspaceId: string) {
  const supabase = createAdminClient();

  // Get workspace members
  const { data: members, error } = await supabase
    .from("workspace_members")
    .select("id, user_id, role, permissions, created_at, updated_at")
    .eq("workspace_id", workspaceId);

  if (error || !members) return [];

  // Batch lookup user emails from auth (we need admin API for this)
  const userIds = members.map((m) => m.user_id);
  const { data: authData } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  // Build a lookup map of user_id -> email
  const emailMap = new Map<string, string>();
  const lastSignInMap = new Map<string, string | null>();
  for (const u of authData?.users ?? []) {
    if (userIds.includes(u.id)) {
      emailMap.set(u.id, u.email ?? "");
      lastSignInMap.set(u.id, u.last_sign_in_at ?? null);
    }
  }

  return members.map((m) => ({
    id: m.id,
    user_id: m.user_id,
    email: emailMap.get(m.user_id) ?? "",
    role: m.role,
    permissions: m.permissions,
    created_at: m.created_at,
    last_sign_in_at: lastSignInMap.get(m.user_id) ?? null,
  }));
}
