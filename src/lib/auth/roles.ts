export const APP_ROLES = ["admin", "operator", "viewer"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const APP_PERMISSIONS = [
  "admin:access",
  "settings:access",
  "team:manage_roles",
  "store:create",
  "store:update_status",
  "store:edit_details",
  "store:delete",
  "scrape:start",
  "scrape:view",
  "monitoring:run",
  "product:delete",
] as const;

export type AppPermission = (typeof APP_PERMISSIONS)[number];

const APP_PERMISSION_SET = new Set<AppPermission>(APP_PERMISSIONS);

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.includes(value as AppRole);
}

export function normalizeAppRole(value: unknown): AppRole {
  return isAppRole(value) ? value : "viewer";
}

export function isAppPermission(value: unknown): value is AppPermission {
  return typeof value === "string" && APP_PERMISSION_SET.has(value as AppPermission);
}

export function normalizePermissionList(value: unknown): AppPermission[] {
  if (!Array.isArray(value)) return [];

  const requested = new Set<AppPermission>();
  for (const item of value) {
    if (isAppPermission(item)) requested.add(item);
  }

  // Keep canonical ordering for stable diffs and UI rendering.
  return APP_PERMISSIONS.filter((permission) => requested.has(permission));
}

// Keep role capabilities centralized here so UI and API checks stay in sync.
const DEFAULT_ROLE_PERMISSIONS: Record<AppRole, readonly AppPermission[]> = {
  admin: APP_PERMISSIONS,
  operator: [
    "settings:access",
    "store:create",
    "store:update_status",
    "scrape:start",
    "scrape:view",
    "monitoring:run",
  ],
  viewer: ["scrape:view"],
};

export type RolePermissionMatrix = Record<AppRole, AppPermission[]>;

export function getDefaultRolePermissionMatrix(): RolePermissionMatrix {
  return {
    admin: [...APP_PERMISSIONS],
    operator: [...DEFAULT_ROLE_PERMISSIONS.operator],
    viewer: [...DEFAULT_ROLE_PERMISSIONS.viewer],
  };
}

export function normalizeRolePermissionMatrix(value: unknown): RolePermissionMatrix {
  if (!value || typeof value !== "object") {
    return getDefaultRolePermissionMatrix();
  }

  const record = value as Partial<Record<AppRole, unknown>>;
  return {
    // Keep admin full-access so the workspace cannot lock itself out.
    admin: [...APP_PERMISSIONS],
    operator: normalizePermissionList(record.operator),
    viewer: normalizePermissionList(record.viewer),
  };
}

export type PermissionSubject =
  | AppRole
  | {
      role: AppRole;
      permissions?: unknown;
    };

function getPermissionsForSubject(subject: PermissionSubject): readonly AppPermission[] {
  if (typeof subject === "string") {
    return DEFAULT_ROLE_PERMISSIONS[subject];
  }

  if (subject.permissions !== undefined && subject.permissions !== null) {
    return normalizePermissionList(subject.permissions);
  }

  return DEFAULT_ROLE_PERMISSIONS[subject.role];
}

export function hasPermission(
  subject: PermissionSubject,
  permission: AppPermission
): boolean {
  return getPermissionsForSubject(subject).includes(permission);
}

export function canAccessSettings(subject: PermissionSubject): boolean {
  return hasPermission(subject, "settings:access");
}

export function canAccessAdmin(subject: PermissionSubject): boolean {
  return hasPermission(subject, "admin:access");
}

export function canManageTeamRoles(subject: PermissionSubject): boolean {
  return hasPermission(subject, "team:manage_roles");
}

export function canCreateStore(subject: PermissionSubject): boolean {
  return hasPermission(subject, "store:create");
}

export function canUpdateStoreStatus(subject: PermissionSubject): boolean {
  return hasPermission(subject, "store:update_status");
}

export function canEditStoreDetails(subject: PermissionSubject): boolean {
  return hasPermission(subject, "store:edit_details");
}

export function canDeleteStore(subject: PermissionSubject): boolean {
  return hasPermission(subject, "store:delete");
}

export function canStartScrape(subject: PermissionSubject): boolean {
  return hasPermission(subject, "scrape:start");
}

export function canViewScrape(subject: PermissionSubject): boolean {
  return hasPermission(subject, "scrape:view");
}

export function canRunMonitoring(subject: PermissionSubject): boolean {
  return hasPermission(subject, "monitoring:run");
}

export function canDeleteProduct(subject: PermissionSubject): boolean {
  return hasPermission(subject, "product:delete");
}
