export const APP_ROLES = ["admin", "operator", "viewer"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.includes(value as AppRole);
}

export function normalizeAppRole(value: unknown): AppRole {
  return isAppRole(value) ? value : "viewer";
}

export function canAccessSettings(role: AppRole): boolean {
  return role === "admin" || role === "operator";
}

export function canAccessAdmin(role: AppRole): boolean {
  return role === "admin";
}

