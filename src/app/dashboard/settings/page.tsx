import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { canAccessSettings, canAccessAdmin, canManageTeamRoles } from "@/lib/auth/roles";
import { getAuthContext } from "@/lib/auth/session";
import { getStores, getProducts, getAIActivityLogs } from "@/lib/queries";
import { SettingsPage } from "./_components/settings-page";

export default async function SettingsRoute() {
  const { user, role, permissions, isDevBypass } = await getAuthContext();

  if (!user && !isDevBypass) {
    redirect("/login");
  }

  if (!canAccessSettings({ role, permissions })) {
    redirect("/dashboard");
  }

  const isAdmin = canAccessAdmin({ role, permissions });
  const canManageTeam = canManageTeamRoles({ role, permissions });

  // Only fetch heavy admin data if user is admin
  let stores, products, activityLogs;
  if (isAdmin) {
    [stores, products, activityLogs] = await Promise.all([
      getStores(),
      getProducts(),
      getAIActivityLogs(),
    ]);
  }

  const t = await getTranslations("Sidebar");

  return (
    <div className="space-y-4">
      <h1
        className="text-[11px] font-bold uppercase tracking-[0.15em]"
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--muted-foreground)",
        }}
      >
        {t("settings")}
      </h1>

      <SettingsPage
        isAdmin={isAdmin}
        canManageTeam={canManageTeam}
        stores={stores ?? []}
        products={products ?? []}
        activityLogs={activityLogs ?? []}
      />
    </div>
  );
}
