"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { setActiveWorkspace } from "@/app/actions/workspace";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export function WorkspaceCards({ workspaces }: { workspaces: Workspace[] }) {
  const router = useRouter();
  const t = useTranslations("WorkspaceSelect");
  const [selecting, setSelecting] = useState<string | null>(null);

  async function handleSelect(workspace: Workspace) {
    setSelecting(workspace.id);
    await setActiveWorkspace(workspace.id);
    router.push("/dashboard");
  }

  return (
    <div className="grid gap-3">
      {workspaces.map((ws) => {
        const isSelecting = selecting === ws.id;
        return (
          /* Card — DESIGN.md §5: 2px border-strong, hard-shadow,
             active = shadow retracts (pressed into page) */
          <button
            key={ws.id}
            type="button"
            onClick={() => handleSelect(ws)}
            disabled={!!selecting}
            className="w-full text-left p-5 transition-all duration-100 hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60 disabled:pointer-events-none"
            style={{
              backgroundColor: "var(--card)",
              border: isSelecting
                ? "2px solid var(--primary)"
                : "2px solid var(--border-strong)",
              boxShadow: isSelecting
                ? "none"
                : "var(--hard-shadow)",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-sm font-extrabold mb-1"
                  style={{
                    fontFamily: "var(--font-display-landing)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {ws.name}
                </p>
                <p
                  className="text-[9px] font-bold uppercase tracking-[0.15em]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  {ws.slug}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Role badge — DESIGN.md §5 chips: primary-muted bg,
                    primary-border, monospaced label */}
                <span
                  className="inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    backgroundColor: "var(--primary-muted)",
                    border: "1.5px solid var(--primary-border)",
                    color: "var(--primary-text)",
                  }}
                >
                  {ws.role}
                </span>
                {isSelecting && (
                  <span
                    className="text-[9px] font-bold uppercase tracking-[0.15em]"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--primary-text)",
                    }}
                  >
                    {t("selecting")}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
