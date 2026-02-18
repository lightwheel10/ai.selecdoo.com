import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { resolveAppRole } from "@/lib/auth/roles-server";
import {
  normalizePermissionList,
  type AppPermission,
  type AppRole,
} from "@/lib/auth/roles";
import {
  computeEffectivePermissions,
  getPermissionOverridesFromMetadata,
  getWorkspaceMatrixFromMetadata,
} from "@/lib/auth/team-access";

export interface AuthContext {
  user: User | null;
  role: AppRole;
  permissions: AppPermission[];
  isDevBypass: boolean;
}

export async function getAuthContext(): Promise<AuthContext> {
  const isDevBypass =
    process.env.NODE_ENV === "development" &&
    process.env.DEV_BYPASS === "true";

  if (isDevBypass) {
    const defaults = getWorkspaceMatrixFromMetadata(null);
    return {
      user: null,
      role: "admin",
      permissions: defaults.admin,
      isDevBypass: true,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = resolveAppRole(user);
  const metadata = (user?.app_metadata as Record<string, unknown> | null) ?? null;
  const hasExplicitPermissions = metadata && "permissions" in metadata;
  const permissions = hasExplicitPermissions
    ? normalizePermissionList(metadata.permissions)
    : computeEffectivePermissions(
        role,
        getWorkspaceMatrixFromMetadata(metadata),
        getPermissionOverridesFromMetadata(metadata)
      );

  return {
    user,
    role,
    permissions,
    isDevBypass: false,
  };
}
