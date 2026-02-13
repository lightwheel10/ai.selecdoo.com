"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { signOut } from "@/app/actions/auth";
import { setLocale } from "@/app/actions/locale";
import { NAV_ITEMS } from "@/lib/constants";
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
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Sidebar");
  const locale = useLocale();

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
              backgroundColor: "#CAFF04",
              color: "#0A0A0A",
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
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className="h-9"
                      style={{
                        borderLeft: active ? "3px solid #CAFF04" : "3px solid transparent",
                        backgroundColor: active ? "rgba(202,255,4,0.10)" : "transparent",
                        borderRadius: 0,
                      }}
                    >
                      <Link href={item.href}>
                        <item.icon
                          className="w-4 h-4"
                          style={{ color: active ? "#CAFF04" : "var(--muted-foreground)" }}
                        />
                        <span
                          className="text-[10px] font-bold uppercase tracking-[0.15em]"
                          style={{
                            fontFamily: "var(--font-mono)",
                            color: active ? "#CAFF04" : "var(--muted-foreground)",
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
              {/* Language Toggle */}
              <div className="flex gap-0 mb-3">
                <button
                  onClick={() => switchLocale("en")}
                  className="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors"
                  style={{
                    fontFamily: "var(--font-mono)",
                    backgroundColor: locale === "en" ? "#CAFF04" : "transparent",
                    color: locale === "en" ? "#0A0A0A" : "var(--muted-foreground)",
                    borderTop: `2px solid ${locale === "en" ? "#CAFF04" : "var(--border)"}`,
                    borderBottom: `2px solid ${locale === "en" ? "#CAFF04" : "var(--border)"}`,
                    borderLeft: `2px solid ${locale === "en" ? "#CAFF04" : "var(--border)"}`,
                    borderRight: `1px solid var(--border)`,
                  }}
                >
                  EN
                </button>
                <button
                  onClick={() => switchLocale("de")}
                  className="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors"
                  style={{
                    fontFamily: "var(--font-mono)",
                    backgroundColor: locale === "de" ? "#CAFF04" : "transparent",
                    color: locale === "de" ? "#0A0A0A" : "var(--muted-foreground)",
                    borderTop: `2px solid ${locale === "de" ? "#CAFF04" : "var(--border)"}`,
                    borderBottom: `2px solid ${locale === "de" ? "#CAFF04" : "var(--border)"}`,
                    borderRight: `2px solid ${locale === "de" ? "#CAFF04" : "var(--border)"}`,
                    borderLeft: `1px solid var(--border)`,
                  }}
                >
                  DE
                </button>
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
                    color: "#FF453A",
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
