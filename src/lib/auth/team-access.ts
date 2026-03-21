/**
 * Permission computation utilities.
 *
 * Multi-tenant: these functions compute effective permissions from
 * a role + workspace permission matrix + per-member overrides.
 * Used by workspace.ts and team API routes.
 *
 * The old app_metadata-based functions (getWorkspaceMatrixFromUser,
 * mergeWorkspaceMatrixIntoMetadata, applyRoleAndPermissionsToMetadata,
 * etc.) have been removed — permission data now lives in the
 * workspace_members and workspaces tables, not in JWT metadata.
 */

import {
  APP_PERMISSIONS,
  normalizePermissionList,
  type AppPermission,
  type AppRole,
  type RolePermissionMatrix,
} from "@/lib/auth/roles";

type LooseRecord = Record<string, unknown>;

export interface PermissionOverrides {
  allow: AppPermission[];
  deny: AppPermission[];
}

const EMPTY_OVERRIDES: PermissionOverrides = {
  allow: [],
  deny: [],
};

function toRecord(value: unknown): LooseRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return { ...(value as LooseRecord) };
}


export function normalizePermissionOverrides(value: unknown): PermissionOverrides {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return EMPTY_OVERRIDES;
  }

  const record = toRecord(value);
  const deny = normalizePermissionList(record.deny);
  const denySet = new Set<AppPermission>(deny);
  const allow = normalizePermissionList(record.allow).filter(
    (permission) => !denySet.has(permission)
  );

  return { allow, deny };
}

export function hasPermissionOverrides(overrides: PermissionOverrides): boolean {
  return overrides.allow.length > 0 || overrides.deny.length > 0;
}

export function getPermissionsForRole(
  role: AppRole,
  matrix: RolePermissionMatrix
): AppPermission[] {
  if (role === "admin") return [...APP_PERMISSIONS];
  return [...matrix[role]];
}

export function deriveOverridesFromPermissions(
  role: AppRole,
  matrix: RolePermissionMatrix,
  requestedPermissions: unknown
): PermissionOverrides {
  if (role === "admin") return EMPTY_OVERRIDES;

  const requested = normalizePermissionList(requestedPermissions);
  const requestedSet = new Set<AppPermission>(requested);
  const base = matrix[role];
  const baseSet = new Set<AppPermission>(base);

  const allow = requested.filter((permission) => !baseSet.has(permission));
  const deny = base.filter((permission) => !requestedSet.has(permission));

  return { allow, deny };
}

export function computeEffectivePermissions(
  role: AppRole,
  matrix: RolePermissionMatrix,
  overrides: PermissionOverrides
): AppPermission[] {
  if (role === "admin") return [...APP_PERMISSIONS];

  // Effective permissions = role defaults + explicit allows - explicit denies.
  const baseSet = new Set<AppPermission>(matrix[role]);
  const allowSet = new Set<AppPermission>(overrides.allow);
  const denySet = new Set<AppPermission>(overrides.deny);

  return APP_PERMISSIONS.filter(
    (permission) =>
      (baseSet.has(permission) || allowSet.has(permission)) &&
      !denySet.has(permission)
  );
}

// applyRoleAndPermissionsToMetadata() and applyExplicitPermissionsToMetadata()
// have been removed — they wrote to app_metadata which is no longer used.
// Permissions are now stored in workspace_members.permissions and
// workspaces.role_permissions.
