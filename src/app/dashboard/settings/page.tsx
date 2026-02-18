import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { canAccessSettings } from "@/lib/auth/roles";
import { resolveAppRole } from "@/lib/auth/roles-server";
import { TeamAccessManager } from "./_components/team-access-manager";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isDevBypass =
    process.env.NODE_ENV === "development" &&
    process.env.DEV_BYPASS === "true";

  if (!user && !isDevBypass) {
    redirect("/login");
  }

  const role = isDevBypass ? "admin" : resolveAppRole(user);
  if (!canAccessSettings(role)) {
    redirect("/dashboard");
  }

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
          {ts("placeholderTitle")}
        </p>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          {ts("placeholderDescription")}
        </p>
      </div>

      {role === "admin" ? (
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
