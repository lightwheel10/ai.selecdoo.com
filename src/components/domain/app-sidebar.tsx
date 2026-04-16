"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftRight, LogOut } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { signOut } from "@/app/actions/auth";
import { setLocale } from "@/app/actions/locale";
import { NAV_BOTTOM, NAV_ITEMS } from "@/lib/constants";
import { ThemeToggle } from "@/components/domain/theme-toggle";
import { useWorkspace } from "@/components/domain/workspace-provider";
import { useAuthAccess } from "@/components/domain/role-provider";
import {
  type AppPermission,
  canAccessAIContent,
  canAccessProducts,
  canAccessSettings,
  type AppRole,
} from "@/lib/auth/roles";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AppSidebarProps {
  user: { email?: string } | null;
  role: AppRole;
  permissions: AppPermission[];
}

export function AppSidebar({ user, role, permissions }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Sidebar");
  const locale = useLocale();
  const { workspaceName } = useWorkspace();
  const { subscription } = useAuthAccess();
  const [signOutOpen, setSignOutOpen] = useState(false);

  const visibleMainItems = NAV_ITEMS.filter((item) => {
    if (item.href === "/dashboard/products") {
      return canAccessProducts({ role, permissions });
    }
    if (item.href === "/dashboard/ai-content") {
      return canAccessAIContent({ role, permissions });
    }
    return true;
  });
  const visibleBottomItems = NAV_BOTTOM.filter(
    (item) =>
      item.href !== "/dashboard/settings" ||
      canAccessSettings({ role, permissions })
  );

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  async function switchLocale(newLocale: "en" | "de") {
    await setLocale(newLocale);
    router.refresh();
  }

  return (
    <Sidebar
      className="border-r-2"
      style={{ borderColor: "var(--border)" }}
    >
      {/* Logo — DESIGN.md §5: border-strong on logo box, heavy weight */}
      <SidebarHeader className="px-4 py-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 flex items-center justify-center text-[9px] font-bold bg-primary text-primary-foreground"
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
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Main Nav */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMainItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className="h-9"
                      style={{
                        borderLeft: active ? "3px solid var(--primary-text)" : "3px solid transparent",
                        backgroundColor: active ? "var(--primary-muted)" : "transparent",
                        borderRadius: 0,
                      }}
                    >
                      <Link href={item.href}>
                        <item.icon
                          className="w-4 h-4"
                          style={{ color: active ? "var(--primary-text)" : "var(--muted-foreground)" }}
                        />
                        <span
                          className="text-[10px] font-bold uppercase tracking-[0.15em]"
                          style={{
                            fontFamily: "var(--font-mono)",
                            color: active ? "var(--primary-text)" : "var(--muted-foreground)",
                          }}
                        >
                          {t(item.labelKey)}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      {/* Bottom */}
      <SidebarFooter className="px-2 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="px-3 py-2">
              {/* Bottom Nav */}
              {visibleBottomItems.length > 0 && (
                <div className="mb-3">
                  {visibleBottomItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="h-8 px-2 flex items-center gap-2"
                        style={{
                          borderLeft: active ? "3px solid var(--primary-text)" : "3px solid transparent",
                          backgroundColor: active ? "var(--primary-muted)" : "transparent",
                          borderRadius: 0,
                        }}
                      >
                        <item.icon
                          className="w-4 h-4"
                          style={{ color: active ? "var(--primary-text)" : "var(--muted-foreground)" }}
                        />
                        <span
                          className="text-[10px] font-bold uppercase tracking-[0.15em]"
                          style={{
                            fontFamily: "var(--font-mono)",
                            color: active ? "var(--primary-text)" : "var(--muted-foreground)",
                          }}
                        >
                          {t(item.labelKey)}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Language + Theme Toggle */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-0">
                  <button
                    onClick={() => switchLocale("en")}
                    className="px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-100"
                    style={{
                      fontFamily: "var(--font-mono)",
                      backgroundColor: locale === "en" ? "var(--primary)" : "transparent",
                      color: locale === "en" ? "var(--primary-foreground)" : "var(--muted-foreground)",
                      borderTop: `2px solid ${locale === "en" ? "var(--primary)" : "var(--border)"}`,
                      borderBottom: `2px solid ${locale === "en" ? "var(--primary)" : "var(--border)"}`,
                      borderLeft: `2px solid ${locale === "en" ? "var(--primary)" : "var(--border)"}`,
                      borderRight: `1px solid var(--border)`,
                    }}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => switchLocale("de")}
                    className="px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-100"
                    style={{
                      fontFamily: "var(--font-mono)",
                      backgroundColor: locale === "de" ? "var(--primary)" : "transparent",
                      color: locale === "de" ? "var(--primary-foreground)" : "var(--muted-foreground)",
                      borderTop: `2px solid ${locale === "de" ? "var(--primary)" : "var(--border)"}`,
                      borderBottom: `2px solid ${locale === "de" ? "var(--primary)" : "var(--border)"}`,
                      borderRight: `2px solid ${locale === "de" ? "var(--primary)" : "var(--border)"}`,
                      borderLeft: `1px solid var(--border)`,
                    }}
                  >
                    DE
                  </button>
                </div>
                <ThemeToggle />
              </div>

              {/* Workspace name + switch */}
              {workspaceName && (
                <div className="flex items-center justify-between mb-0.5">
                  <p
                    className="text-[10px] font-bold truncate"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--primary-text)",
                    }}
                  >
                    {workspaceName}
                  </p>
                  <Link
                    href="/workspace-select"
                    className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.15em] transition-colors hover:opacity-80 shrink-0"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                  </Link>
                </div>
              )}

              {/* Plan badge */}
              <SidebarPlanBadge subscription={subscription} />

              {/* User email */}
              <p
                className="text-[9px] font-bold uppercase tracking-[0.15em] mb-2 truncate"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                }}
              >
                {user?.email ?? t("devMode")}
              </p>

              {/* Sign Out */}
              <button
                type="button"
                onClick={() => setSignOutOpen(true)}
                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-100 hover:opacity-80"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--destructive)",
                }}
              >
                <LogOut className="w-3.5 h-3.5" />
                {t("signOut")}
              </button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* Sign-out confirmation — DESIGN.md §5: border-strong, hard-shadow */}
      <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <DialogContent
          className="p-0 gap-0"
          style={{
            border: "2px solid var(--border-strong)",
            boxShadow: "var(--hard-shadow)",
            backgroundColor: "var(--card)",
            borderRadius: 0,
          }}
        >
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle
              className="text-[10px] font-bold uppercase tracking-[0.15em]"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--primary-text)",
              }}
            >
              {t("signOutConfirmTitle")}
            </DialogTitle>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              {t("signOutConfirmDescription")}
            </p>
          </DialogHeader>
          <div className="px-6 pb-6 flex items-center justify-end gap-2">
            {/* Cancel — secondary button: no shadow per DESIGN.md §5 */}
            <button
              type="button"
              onClick={() => setSignOutOpen(false)}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-100 hover:opacity-80"
              style={{
                fontFamily: "var(--font-mono)",
                border: "2px solid var(--border)",
                color: "var(--muted-foreground)",
                backgroundColor: "transparent",
              }}
            >
              {t("cancel")}
            </button>

            {/* Confirm sign-out — destructive action button.
                Uses onClick instead of <form action> because Radix Dialog
                portals content outside the React tree, which can break
                Next.js server action form bindings in some environments. */}
            <button
              type="button"
              onClick={() => signOut()}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-100"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: "var(--destructive)",
                color: "var(--destructive-foreground)",
                border: "2px solid var(--destructive)",
              }}
            >
              {t("signOutConfirmAction")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}

/* ─── Plan badge shown in the sidebar footer ──────────── */

import type { SubscriptionInfo } from "@/components/domain/role-provider";

const PLAN_DISPLAY: Record<string, string> = {
  pro: "Pro",
  business: "Business Class",
  trial: "Trial",
  canceled: "Canceled",
};

function SidebarPlanBadge({
  subscription,
}: {
  subscription: SubscriptionInfo | null;
}) {
  // Capture time once on mount — avoids the react-hooks/purity
  // warning for Date.now() inside a render path.
  const [now] = useState(() => Date.now());

  if (!subscription) {
    return (
      <PlanChip
        label="No Plan"
        bg="var(--status-neutral-bg)"
        border="var(--status-neutral-border)"
        color="var(--muted-foreground)"
      />
    );
  }

  const { status, plan, trialEndsAt } = subscription;

  // Incomplete = checkout in progress, don't show a badge
  if (status === "incomplete") return null;

  if (status === "trialing" && trialEndsAt) {
    const daysLeft = Math.max(
      0,
      Math.ceil(
        (new Date(trialEndsAt).getTime() - now) /
          (1000 * 60 * 60 * 24)
      )
    );
    return (
      <PlanChip
        label={`Trial · ${daysLeft}d left`}
        bg="var(--primary-muted)"
        border="var(--primary-border)"
        color="var(--primary-text)"
      />
    );
  }

  if (status === "active") {
    const displayName = PLAN_DISPLAY[plan ?? ""] ?? plan ?? "Active";
    return (
      <PlanChip
        label={displayName}
        bg="rgba(34,197,94,0.08)"
        border="rgba(34,197,94,0.3)"
        color="#22C55E"
      />
    );
  }

  if (status === "past_due") {
    return (
      <PlanChip
        label="Past Due"
        bg="rgba(255,159,10,0.06)"
        border="rgba(255,159,10,0.3)"
        color="#FF9F0A"
      />
    );
  }

  // canceled / expired / unpaid
  return (
    <PlanChip
      label="Expired"
      bg="rgba(255,69,58,0.06)"
      border="rgba(255,69,58,0.25)"
      color="#FF453A"
    />
  );
}

function PlanChip({
  label,
  bg,
  border,
  color,
}: {
  label: string;
  bg: string;
  border: string;
  color: string;
}) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.15em] mb-1.5"
      style={{
        fontFamily: "var(--font-mono)",
        backgroundColor: bg,
        border: `1.5px solid ${border}`,
        color,
      }}
    >
      {label}
    </span>
  );
}
