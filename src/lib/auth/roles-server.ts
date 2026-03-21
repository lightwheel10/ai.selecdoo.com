/**
 * Server-side role utilities.
 *
 * Multi-tenant: roles are now resolved from workspace_members table
 * via getAuthContext(), NOT from app_metadata or bootstrap emails.
 *
 * The bootstrap admin mechanism (BOOTSTRAP_ADMIN_EMAILS) has been
 * removed. Admins are determined purely by their workspace_members.role.
 *
 * This file is kept for backward compatibility with any code that
 * imports from it, but the core role resolution has moved to
 * workspace.ts -> getWorkspaceMembership().
 */

import { normalizeAppRole, type AppRole } from "@/lib/auth/roles";

/**
 * @deprecated Role resolution now happens in workspace.ts.
 * Kept for backward compatibility — returns role from metadata
 * or defaults to "viewer". Will be removed in Step 7 cleanup.
 */
export function resolveAppRole(
  identity: { email?: string | null; app_metadata?: Record<string, unknown> | null } | null
): AppRole {
  if (!identity) return "viewer";
  return normalizeAppRole(identity.app_metadata?.role);
}

/**
 * @deprecated Bootstrap admin emails are no longer used.
 * Admin status is now per-workspace via workspace_members.role.
 * Returns false always. Will be removed in Step 7 cleanup.
 */
export function isBootstrapAdminEmail(_email?: string | null): boolean {
  return false;
}
