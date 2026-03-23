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
          <button
            key={ws.id}
            type="button"
            onClick={() => handleSelect(ws)}
            disabled={!!selecting}
            className="w-full text-left p-5 border-2 transition-all duration-150 hover:border-[var(--primary-border)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:pointer-events-none"
            style={{
              backgroundColor: "var(--card)",
              borderColor: isSelecting
                ? "var(--primary-text)"
                : "var(--border)",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-sm font-bold mb-1"
                  style={{ fontFamily: "var(--font-display)" }}
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
                <span
                  className="inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    backgroundColor: "rgba(202,255,4,0.12)",
                    border: "1.5px solid rgba(202,255,4,0.35)",
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
