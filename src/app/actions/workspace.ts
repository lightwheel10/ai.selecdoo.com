"use server";

import { cookies } from "next/headers";

/**
 * Set the active workspace cookie.
 * Called when user selects a workspace from the workspace picker.
 * The cookie is read by getAuthContext() to resolve the preferred workspace.
 */
export async function setActiveWorkspace(workspaceId: string) {
  const cookieStore = await cookies();
  cookieStore.set("mf_workspace_id", workspaceId, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}
