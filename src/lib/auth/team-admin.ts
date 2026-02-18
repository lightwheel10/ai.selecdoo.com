import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  canManageTeamRoles,
  getDefaultRolePermissionMatrix,
  type RolePermissionMatrix,
} from "@/lib/auth/roles";
import { getAuthContext } from "@/lib/auth/session";
import { getWorkspaceMatrixFromUser } from "@/lib/auth/team-access";

const PAGE_SIZE = 200;
const MAX_PAGES = 20;

export interface TeamAdminActor {
  id: string;
  email: string | null;
  workspaceMatrix: RolePermissionMatrix;
}

export async function authenticateTeamAdmin(): Promise<TeamAdminActor | null> {
  const { user, role, permissions, isDevBypass } = await getAuthContext();

  if (isDevBypass) {
    return {
      id: "dev-bypass",
      email: null,
      workspaceMatrix: getDefaultRolePermissionMatrix(),
    };
  }

  if (!user) return null;
  if (!canManageTeamRoles({ role, permissions })) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    workspaceMatrix: getWorkspaceMatrixFromUser(user),
  };
}

export async function listAllAuthUsers(): Promise<User[]> {
  const supabase = createAdminClient();
  const users: User[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });

    if (error) {
      throw new Error(error.message);
    }

    const batch = data.users ?? [];
    users.push(...batch);

    if (batch.length < PAGE_SIZE) break;
  }

  return users;
}

