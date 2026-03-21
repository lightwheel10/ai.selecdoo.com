/**
 * Workspace access helpers for multi-tenant isolation.
 *
 * Workspaces are the top-level isolation boundary. Each user belongs
 * to one or more workspaces via workspace_members. Stores (and all
 * cascading data) belong to a workspace.
 *
 * These helpers use the admin client (service_role) because they run
 * server-side in API routes and server components where RLS is not
 * the primary access control — the workspaceId filter is.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  normalizeRolePermissionMatrix,
  type AppPermission,
  type AppRole,
  type RolePermissionMatrix,
} from "@/lib/auth/roles";
import {
  computeEffectivePermissions,
  normalizePermissionOverrides,
} from "@/lib/auth/team-access";

// ─── Types ───

export interface WorkspaceMembership {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  role: AppRole;
  permissions: AppPermission[];
  matrix: RolePermissionMatrix;
}

// ─── Workspace resolution ───

/**
 * Look up the user's membership in a specific workspace.
 * Returns null if the user is not a member.
 */
export async function getWorkspaceMembership(
  userId: string,
  workspaceId: string
): Promise<WorkspaceMembership | null> {
  const supabase = createAdminClient();

  // Fetch membership + workspace in one query
  const { data: member } = await supabase
    .from("workspace_members")
    .select("role, permissions, workspaces:workspace_id(id, name, slug, role_permissions)")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single();

  if (!member) return null;

  // Supabase returns the joined workspace as an object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workspace = member.workspaces as any;
  if (!workspace) return null;

  const role = (member.role as AppRole) || "viewer";
  const matrix = normalizeRolePermissionMatrix(workspace.role_permissions);
  const overrides = normalizePermissionOverrides(member.permissions);
  const permissions = computeEffectivePermissions(role, matrix, overrides);

  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    workspaceSlug: workspace.slug,
    role,
    permissions,
    matrix,
  };
}

/**
 * Get the user's first (or only) workspace membership.
 * Used when no explicit workspaceId is provided — most users
 * have exactly one workspace, so this auto-resolves it.
 * Returns null if the user has no workspaces.
 */
export async function getDefaultWorkspaceMembership(
  userId: string
): Promise<WorkspaceMembership | null> {
  const supabase = createAdminClient();

  const { data: members } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1);

  if (!members || members.length === 0) return null;

  return getWorkspaceMembership(userId, members[0].workspace_id);
}

/**
 * List all workspaces the user belongs to.
 * Used for workspace selector when a user has multiple workspaces.
 */
export async function getUserWorkspaces(
  userId: string
): Promise<{ id: string; name: string; slug: string; role: string }[]> {
  const supabase = createAdminClient();

  const { data: members } = await supabase
    .from("workspace_members")
    .select("role, workspaces:workspace_id(id, name, slug)")
    .eq("user_id", userId);

  if (!members) return [];

  return members
    .filter((m) => m.workspaces)
    .map((m) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ws = m.workspaces as any;
      return {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        role: m.role,
      };
    });
}

// ─── Authorization helpers ───

/**
 * Verify that a store belongs to the given workspace.
 * Used by API routes to ensure the user isn't accessing
 * a store from another workspace.
 */
export async function verifyStoreInWorkspace(
  storeId: string,
  workspaceId: string
): Promise<boolean> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("stores")
    .select("id")
    .eq("id", storeId)
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .single();

  return !!data;
}

/**
 * Get the workspace_id for a store.
 * Used when we need to resolve workspace from a resource.
 */
export async function getStoreWorkspaceId(
  storeId: string
): Promise<string | null> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("stores")
    .select("workspace_id")
    .eq("id", storeId)
    .single();

  return data?.workspace_id ?? null;
}
