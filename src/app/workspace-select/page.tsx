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
    /* .landing-page scopes the Neo-Industrial CSS variable overrides
       (gold #FFD700 primary, #F9F9F9/#000 backgrounds, hard shadows) */
    <div className="landing-page min-h-screen bg-background flex items-center justify-center">
      {/* 20px blueprint grid — DESIGN.md §2 signature texture */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(128,128,128,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(128,128,128,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
        }}
      />

      <div className="relative z-10 w-full max-w-lg px-6 py-16">
        {/* Branding — Epilogue display font, border-strong on logo */}
        <div className="flex items-center gap-3 mb-10">
          <div
            className="w-8 h-8 flex items-center justify-center text-[9px] font-bold bg-primary text-primary-foreground"
            style={{
              fontFamily: "var(--font-mono)",
              border: "2px solid var(--border-strong)",
            }}
          >
            MF
          </div>
          <span
            className="text-sm font-black tracking-tight"
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
          className="text-2xl font-extrabold tracking-tight mb-2"
          style={{
            fontFamily: "var(--font-display)",
            letterSpacing: "-0.02em",
          }}
        >
          {t("title")}
        </h1>
        <p
          className="text-sm mb-8"
          style={{
            color: "var(--muted-foreground)",
            fontFamily: "var(--font-body)",
          }}
        >
          {t("description")}
        </p>

        <WorkspaceCards workspaces={workspaces} />
      </div>
    </div>
  );
}
