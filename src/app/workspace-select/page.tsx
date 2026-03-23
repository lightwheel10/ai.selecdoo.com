import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserWorkspaces } from "@/lib/auth/workspace";
import { getTranslations } from "next-intl/server";
import { WorkspaceCards } from "./_components/workspace-cards";

export default async function WorkspaceSelectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const workspaces = await getUserWorkspaces(user.id);

  if (workspaces.length === 0) redirect("/signup");

  const t = await getTranslations("WorkspaceSelect");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(202,255,4,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(202,255,4,0.02) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 w-full max-w-lg px-6 py-16">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10">
          <div
            className="w-7 h-7 flex items-center justify-center text-[9px] font-bold"
            style={{
              fontFamily: "var(--font-mono)",
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            MF
          </div>
          <span
            className="text-sm font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            MarketForce One
          </span>
        </div>

        {/* Header */}
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--primary-text)",
          }}
        >
          {t("label")}
        </p>
        <h1
          className="text-2xl font-bold tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("title")}
        </h1>
        <p
          className="text-sm mb-8"
          style={{ color: "var(--muted-foreground)" }}
        >
          {t("description")}
        </p>

        <WorkspaceCards workspaces={workspaces} />
      </div>
    </div>
  );
}
