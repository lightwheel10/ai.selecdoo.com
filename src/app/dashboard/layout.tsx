/**
 * Dashboard layout — protected, workspace-aware.
 *
 * Resolves the current user's workspace and provides it to all
 * child components via WorkspaceProvider + RoleProvider. If the user
 * has no workspace (new signup that failed, or removed from
 * workspace), redirects to /signup.
 *
 * Subscription state is fetched here once and piped through
 * RoleProvider so client components (TrialBanner, billing tab, etc.)
 * can read it via useAuthAccess().subscription without re-fetching.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/domain/app-sidebar";
import { Toaster } from "sonner";
import { getAuthContext } from "@/lib/auth/session";
import { RoleProvider, type SubscriptionInfo } from "@/components/domain/role-provider";
import { WorkspaceProvider } from "@/components/domain/workspace-provider";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserWorkspaces } from "@/lib/auth/workspace";
import { TrialBanner } from "@/components/domain/trial-banner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, workspaceId, role, permissions, isDevBypass } = await getAuthContext();

  if (!user && !isDevBypass) {
    redirect("/login");
  }

  if (!workspaceId) {
    redirect("/signup");
  }

  if (user && !isDevBypass) {
    const cookieStore = await cookies();
    const hasPreference = !!cookieStore.get("mf_workspace_id")?.value;
    if (!hasPreference) {
      const workspaces = await getUserWorkspaces(user.id);
      if (workspaces.length > 1) {
        redirect("/workspace-select");
      }
    }
  }

  // Fetch workspace name + subscription in parallel
  const supabase = createAdminClient();
  const [wsResult, subResult] = await Promise.all([
    supabase
      .from("workspaces")
      .select("name, public_site_url")
      .eq("id", workspaceId)
      .single(),
    supabase
      .from("workspace_subscriptions")
      .select("plan, status, trial_ends_at, intended_plan")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
  ]);

  const workspaceName = wsResult.data?.name ?? null;
  const publicSiteUrl = wsResult.data?.public_site_url ?? null;

  const subscription: SubscriptionInfo | null = subResult.data
    ? {
        plan: subResult.data.plan,
        status: subResult.data.status,
        trialEndsAt: subResult.data.trial_ends_at,
        intendedPlan: subResult.data.intended_plan,
      }
    : null;

  return (
    <SidebarProvider>
      <WorkspaceProvider workspaceId={workspaceId} workspaceName={workspaceName} publicSiteUrl={publicSiteUrl}>
        <RoleProvider role={role} permissions={permissions} subscription={subscription}>
          <AppSidebar user={user} role={role} permissions={permissions} />
          <SidebarInset>
            <TrialBanner />
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
