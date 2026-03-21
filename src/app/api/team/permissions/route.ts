/**
 * Team permissions API — workspace-scoped.
 *
 * GET: Return the workspace's role permission matrix.
 * POST: Update the workspace's permission matrix (stored on the workspace row).
 *
 * Multi-tenant: the matrix is stored on workspaces.role_permissions,
 * NOT on individual users' app_metadata.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeRolePermissionMatrix } from "@/lib/auth/roles";
import { authenticateTeamAdmin } from "@/lib/auth/team-admin";

const MAX_BODY_SIZE = 16_384;

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

    // Update the workspace's permission matrix (single row update)
    const supabase = createAdminClient();
    const { error: updateErr } = await supabase
      .from("workspaces")
      .update({ role_permissions: matrix })
      .eq("id", actor.workspaceId);

    if (updateErr) {
      console.error("Workspace matrix update error:", updateErr);
      return NextResponse.json(
        { error: "Failed to update permissions" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      matrix,
    });
  } catch (err) {
    console.error("Team permissions POST error:", err);
    return NextResponse.json(
      { error: "Failed to update permissions" },
      { status: 500 }
    );
  }
}
