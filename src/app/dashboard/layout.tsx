import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/domain/app-sidebar";
import { Toaster } from "sonner";
import { getAuthContext } from "@/lib/auth/session";
import { RoleProvider } from "@/components/domain/role-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role, permissions, isDevBypass } = await getAuthContext();

  if (!user && !isDevBypass) {
    redirect("/login");
  }

  return (
    <SidebarProvider>
      <RoleProvider role={role} permissions={permissions}>
        <AppSidebar user={user} role={role} permissions={permissions} />
        <SidebarInset>
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </RoleProvider>
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
