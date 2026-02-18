import type { User } from "@supabase/supabase-js";
import {
  APP_PERMISSIONS,
  getDefaultRolePermissionMatrix,
  normalizePermissionList,
  normalizeRolePermissionMatrix,
  normalizeAppRole,
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

export function getWorkspaceMatrixFromMetadata(metadata: unknown): RolePermissionMatrix {
  const record = toRecord(metadata);
  if (!("role_permissions" in record)) {
    return getDefaultRolePermissionMatrix();
  }
  return normalizeRolePermissionMatrix(record.role_permissions);
}

export function getWorkspaceMatrixFromUser(
  user: Pick<User, "app_metadata"> | null | undefined
): RolePermissionMatrix {
  return getWorkspaceMatrixFromMetadata(user?.app_metadata);
}

export function mergeWorkspaceMatrixIntoMetadata(
  metadata: unknown,
  matrix: RolePermissionMatrix
): LooseRecord {
  const record = toRecord(metadata);
  return {
    ...record,
    role_permissions: {
      admin: [...matrix.admin],
      operator: [...matrix.operator],
      viewer: [...matrix.viewer],
    },
  };
}

export function getUserRoleFromMetadata(metadata: unknown): AppRole {
  return normalizeAppRole(toRecord(metadata).role);
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

export function getPermissionOverridesFromMetadata(
  metadata: unknown
): PermissionOverrides {
  const record = toRecord(metadata);
  if (!("permission_overrides" in record)) {
    return EMPTY_OVERRIDES;
  }
  return normalizePermissionOverrides(record.permission_overrides);
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

export function applyRoleAndPermissionsToMetadata(
  metadata: unknown,
  role: AppRole,
  matrix: RolePermissionMatrix
): LooseRecord {
  const merged = mergeWorkspaceMatrixIntoMetadata(metadata, matrix);
  const overrides = getPermissionOverridesFromMetadata(metadata);
  const permissions = computeEffectivePermissions(role, matrix, overrides);

  return {
    ...merged,
    role,
    permission_overrides: {
      allow: [...overrides.allow],
      deny: [...overrides.deny],
    },
    permissions,
  };
}

export function applyExplicitPermissionsToMetadata(
  metadata: unknown,
  role: AppRole,
  matrix: RolePermissionMatrix,
  requestedPermissions: unknown
): LooseRecord {
  const merged = mergeWorkspaceMatrixIntoMetadata(metadata, matrix);
  // Store user-specific differences from role defaults so matrix updates can
  // still re-compute the final permission set consistently.
  const overrides = deriveOverridesFromPermissions(
    role,
    matrix,
    requestedPermissions
  );
  const permissions = computeEffectivePermissions(role, matrix, overrides);

  return {
    ...merged,
    role,
    permission_overrides: {
      allow: [...overrides.allow],
      deny: [...overrides.deny],
    },
    permissions,
  };
}
