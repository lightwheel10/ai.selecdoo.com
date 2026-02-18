import { normalizeAppRole, type AppRole } from "@/lib/auth/roles";

interface RoleIdentity {
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
}

function getBootstrapAdminEmails(): Set<string> {
  const raw = process.env.BOOTSTRAP_ADMIN_EMAILS ?? "";
  if (!raw.trim()) return new Set();
  return new Set(
    raw
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isBootstrapAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return getBootstrapAdminEmails().has(email.toLowerCase());
}

export function resolveAppRole(identity: RoleIdentity | null): AppRole {
  if (!identity) return "viewer";

  const explicitRole = normalizeAppRole(identity.app_metadata?.role);
  if (explicitRole === "admin" || explicitRole === "operator") {
    return explicitRole;
  }

  if (isBootstrapAdminEmail(identity.email)) {
    return "admin";
  }

  return explicitRole;
}

