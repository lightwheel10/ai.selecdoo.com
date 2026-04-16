/**
 * Auth context for the application.
 *
 * Multi-tenant: role and permissions are resolved per-workspace from
 * the workspace_members table, NOT from app_metadata.
 *
 * Subscription state is resolved in parallel and returned alongside
 * role/permissions so API routes can gate premium features via
 * `canUsePaidFeature(ctx)` without a separate DB call.
 *
 * Backward compatible: if no workspaceId is provided, the user's
 * first (or only) workspace is auto-resolved. Adding `subscription`
 * to AuthContext is safe — all 37 existing callers destructure
 * explicitly and aren't affected by a new field.
 */

import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { APP_PERMISSIONS, type AppPermission, type AppRole } from "@/lib/auth/roles";
import {
  getWorkspaceMembership,
  getDefaultWorkspaceMembership,
  type WorkspaceMembership,
} from "@/lib/auth/workspace";

export interface SubscriptionState {
  plan: string | null;
  status: string | null;
}

export interface AuthContext {
  user: User | null;
  workspaceId: string | null;
  role: AppRole;
  permissions: AppPermission[];
  isDevBypass: boolean;
  subscription: SubscriptionState | null;
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
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminClient();

    let devWorkspaceId: string | null = workspaceId ?? null;

    if (!devWorkspaceId) {
      const { data: existing } = await supabase
        .from("workspaces")
        .select("id")
        .is("deleted_at", null)
        .limit(1);

      devWorkspaceId = existing?.[0]?.id ?? null;
    }

    if (!devWorkspaceId) {
      console.warn(
        "[DEV_BYPASS] No workspace found. Sign up at /signup to create one. " +
        "Dev bypass without a workspace will cause null workspaceId errors."
      );
    }

    return {
      user: null,
      workspaceId: devWorkspaceId,
      role: "admin",
      permissions: [...APP_PERMISSIONS],
      isDevBypass: true,
      subscription: { plan: "pro", status: "active" },
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
      subscription: null,
    };
  }

  // ── Resolve workspace membership ──
  let membership: WorkspaceMembership | null = null;

  if (workspaceId) {
    membership = await getWorkspaceMembership(user.id, workspaceId);
  } else {
    const cookieStore = await cookies();
    const preferred = cookieStore.get("mf_workspace_id")?.value;
    if (preferred) {
      membership = await getWorkspaceMembership(user.id, preferred);
    }
    if (!membership) {
      membership = await getDefaultWorkspaceMembership(user.id);
    }
  }

  if (!membership) {
    return {
      user,
      workspaceId: null,
      role: "viewer",
      permissions: [],
      isDevBypass: false,
      subscription: null,
    };
  }

  // ── Resolve subscription state ──
  // Uses admin client to bypass RLS. One indexed query on
  // workspace_subscriptions.workspace_id (UNIQUE) — fast.
  let subscription: SubscriptionState | null = null;
  {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminSb = createAdminClient();
    const { data: sub } = await adminSb
      .from("workspace_subscriptions")
      .select("plan, status")
      .eq("workspace_id", membership.workspaceId)
      .maybeSingle();
    subscription = sub ? { plan: sub.plan, status: sub.status } : null;
  }

  return {
    user,
    workspaceId: membership.workspaceId,
    role: membership.role,
    permissions: membership.permissions,
    isDevBypass: false,
    subscription,
  };
}
