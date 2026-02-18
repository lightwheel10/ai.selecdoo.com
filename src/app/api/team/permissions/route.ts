import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  normalizeRolePermissionMatrix,
  type RolePermissionMatrix,
} from "@/lib/auth/roles";
import { resolveAppRole } from "@/lib/auth/roles-server";
import { applyRoleAndPermissionsToMetadata } from "@/lib/auth/team-access";
import { authenticateTeamAdmin, listAllAuthUsers } from "@/lib/auth/team-admin";

const MAX_BODY_SIZE = 16_384; // 16 KB
const UPDATE_BATCH_SIZE = 20;

async function applyMatrixToAllUsers(matrix: RolePermissionMatrix): Promise<number> {
  const supabase = createAdminClient();
  const users = await listAllAuthUsers();

  let updatedCount = 0;
  for (let i = 0; i < users.length; i += UPDATE_BATCH_SIZE) {
    const chunk = users.slice(i, i + UPDATE_BATCH_SIZE);

    const results = await Promise.allSettled(
      chunk.map(async (user) => {
        const role = resolveAppRole({
          email: user.email,
          app_metadata:
            (user.app_metadata as Record<string, unknown> | undefined) ?? null,
        });

        const nextMetadata = applyRoleAndPermissionsToMetadata(
          user.app_metadata,
          role,
          matrix
        );

        const { error } = await supabase.auth.admin.updateUserById(user.id, {
          app_metadata: nextMetadata,
        });

        if (error) throw new Error(error.message);
      })
    );

    for (const result of results) {
      if (result.status === "rejected") {
        throw result.reason;
      }
      updatedCount += 1;
    }
  }

  return updatedCount;
}

export async function GET() {
  try {
    const actor = await authenticateTeamAdmin();
    if (!actor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ matrix: actor.workspaceMatrix });
  } catch (err) {
    console.error("Team permissions GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch permissions" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const actor = await authenticateTeamAdmin();
    if (!actor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
    if (contentLength > MAX_BODY_SIZE) {
      return NextResponse.json({ error: "Request body too large" }, { status: 413 });
    }

    const body = await req.json();
    const matrix = normalizeRolePermissionMatrix(body?.matrix);
    const updatedCount = await applyMatrixToAllUsers(matrix);

    return NextResponse.json({
      success: true,
      matrix,
      updated_count: updatedCount,
    });
  } catch (err) {
    console.error("Team permissions POST error:", err);
    return NextResponse.json(
      { error: "Failed to update permissions" },
      { status: 500 }
    );
  }
}

