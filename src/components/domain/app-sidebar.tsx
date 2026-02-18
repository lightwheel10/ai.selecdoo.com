"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { signOut } from "@/app/actions/auth";
import { setLocale } from "@/app/actions/locale";
import { NAV_BOTTOM, NAV_ITEMS } from "@/lib/constants";
import { ThemeToggle } from "@/components/domain/theme-toggle";
import {
  canAccessAdmin,
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

interface AppSidebarProps {
  user: { email?: string } | null;
  role: AppRole;
}

export function AppSidebar({ user, role }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Sidebar");
  const locale = useLocale();

  const visibleMainItems = NAV_ITEMS.filter(
    (item) => item.href !== "/dashboard/admin" || canAccessAdmin(role)
  );
  const visibleBottomItems = NAV_BOTTOM.filter(
    (item) => item.href !== "/dashboard/settings" || canAccessSettings(role)
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
      {/* Logo */}
      <SidebarHeader className="px-4 py-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 flex items-center justify-center text-[10px] font-bold"
            style={{
              fontFamily: "var(--font-mono)",
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            S
          </div>
          <span
            className="text-sm font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Selecdoo
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
                    className="px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors"
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
                    className="px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors"
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
              <form action={signOut}>
                <button
                  type="submit"
                  className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:opacity-80"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--destructive)",
                  }}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {t("signOut")}
                </button>
              </form>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
