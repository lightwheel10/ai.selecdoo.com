import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { canAccessSettings, canManageTeamRoles } from "@/lib/auth/roles";
import { getAuthContext } from "@/lib/auth/session";
import { TeamAccessManager } from "./_components/team-access-manager";

export default async function SettingsPage() {
  const { user, role, permissions, isDevBypass } = await getAuthContext();

  if (!user && !isDevBypass) {
    redirect("/login");
  }

  if (!canAccessSettings({ role, permissions })) {
    redirect("/dashboard");
  }

  const canManageTeam = canManageTeamRoles({ role, permissions });

  const [t, ts] = await Promise.all([
    getTranslations("Sidebar"),
    getTranslations("Settings"),
  ]);

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

      {canManageTeam ? (
        <TeamAccessManager />
      ) : (
        <div
          className="border-2 p-6"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--primary-text)",
            }}
          >
            {ts("limitedTitle")}
          </p>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {ts("limitedDescription")}
          </p>
        </div>
      )}
    </div>
  );
}
