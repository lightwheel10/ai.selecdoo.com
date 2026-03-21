/**
 * Dashboard layout — protected, workspace-aware.
 *
 * Resolves the current user's workspace and provides it to all
 * child components via WorkspaceProvider. If the user has no
 * workspace (new signup that failed, or removed from workspace),
 * redirects to /signup.
 */

import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/domain/app-sidebar";
import { Toaster } from "sonner";
import { getAuthContext } from "@/lib/auth/session";
import { RoleProvider } from "@/components/domain/role-provider";
import { WorkspaceProvider } from "@/components/domain/workspace-provider";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, workspaceId, role, permissions, isDevBypass } = await getAuthContext();

  if (!user && !isDevBypass) {
    redirect("/login");
  }

  // If user has no workspace, redirect to signup to create one.
  // In dev bypass mode, also redirect — dev bypass needs a real
  // workspace to function correctly (queries use workspaceId!).
  if (!workspaceId) {
    redirect("/signup");
  }

  // Fetch workspace name + public site URL for the provider
  let workspaceName: string | null = null;
  let publicSiteUrl: string | null = null;
  if (workspaceId) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("workspaces")
      .select("name, public_site_url")
      .eq("id", workspaceId)
      .single();
    workspaceName = data?.name ?? null;
    publicSiteUrl = data?.public_site_url ?? null;
  }

  return (
    <SidebarProvider>
      <WorkspaceProvider workspaceId={workspaceId} workspaceName={workspaceName} publicSiteUrl={publicSiteUrl}>
        <RoleProvider role={role} permissions={permissions}>
          <AppSidebar user={user} role={role} permissions={permissions} />
          <SidebarInset>
            <main className="flex-1 p-6">{children}</main>
          </SidebarInset>
        </RoleProvider>
      </WorkspaceProvider>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            borderRadius: "0px",
            border: "2px solid var(--border)",
            backgroundColor: "var(--card)",
            color: "var(--foreground)",
            fontFamily: "var(--font-body)",
          },
        }}
      />
    </SidebarProvider>
  );
}
