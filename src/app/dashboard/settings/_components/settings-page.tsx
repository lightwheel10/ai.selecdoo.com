"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";
import { Users, Store as StoreIcon, Package, Bot, Webhook, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TeamAccessManager } from "./team-access-manager";

const AdminShopsTab = dynamic(
  () => import("./admin-shops-tab").then((m) => m.AdminShopsTab),
  { ssr: false }
);
const AdminProductsTab = dynamic(
  () => import("./admin-products-tab").then((m) => m.AdminProductsTab),
  { ssr: false }
);
const AdminAIActivityTab = dynamic(
  () => import("./admin-ai-activity-tab").then((m) => m.AdminAIActivityTab),
  { ssr: false }
);
const AdminWebhookTab = dynamic(
  () => import("./admin-webhook-tab").then((m) => m.AdminWebhookTab),
  { ssr: false }
);
const AdminAISkillsTab = dynamic(
  () => import("./admin-ai-skills-tab").then((m) => m.AdminAISkillsTab),
  { ssr: false }
);

interface SettingsPageProps {
  isAdmin: boolean;
  canManageTeam: boolean;
}

// Valid tab values — used to validate URL param
const VALID_TABS = ["team", "shops", "products", "webhook", "ai-skills", "ai-activity"] as const;
type TabValue = (typeof VALID_TABS)[number];

export function SettingsPage({ isAdmin, canManageTeam }: SettingsPageProps) {
  const t = useTranslations("Settings");
  const ta = useTranslations("Admin");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Persist active tab in URL so navigating away and back restores position
  const tabParam = searchParams.get("tab");
  const activeTab: TabValue =
    tabParam && VALID_TABS.includes(tabParam as TabValue)
      ? (tabParam as TabValue)
      : "team";

  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "team") {
        // "team" is the default — no need to clutter the URL
        params.delete("tab");
      } else {
        params.set("tab", value);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams]
  );

  // No tabs visible — limited access
  if (!canManageTeam && !isAdmin) {
    return (
      /* Limited access card — DESIGN.md §5: border-strong + hard-shadow */
      <div
        className="p-6"
        style={{
          backgroundColor: "var(--card)",
          border: "2px solid var(--border-strong)",
          boxShadow: "var(--hard-shadow)",
        }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--primary-text)",
          }}
        >
          {t("limitedTitle")}
        </p>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          {t("limitedDescription")}
        </p>
      </div>
    );
  }

  // Only team tab visible — no tab bar needed
  if (!isAdmin) {
    return <TeamAccessManager />;
  }

  // Admin — full tabbed interface
  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList variant="line">
        <TabsTrigger value="team">
          <Users className="w-3.5 h-3.5" />
          {t("teamTab")}
        </TabsTrigger>
        <TabsTrigger value="shops">
          <StoreIcon className="w-3.5 h-3.5" />
          {ta("shopsTab")}
        </TabsTrigger>
        <TabsTrigger value="products">
          <Package className="w-3.5 h-3.5" />
          {ta("productsTab")}
        </TabsTrigger>
        <TabsTrigger value="webhook">
          <Webhook className="w-3.5 h-3.5" />
          {ta("webhookTab")}
        </TabsTrigger>
        <TabsTrigger value="ai-skills">
          <Sparkles className="w-3.5 h-3.5" />
          {ta("aiSkillsTab")}
        </TabsTrigger>
        <TabsTrigger value="ai-activity">
          <Bot className="w-3.5 h-3.5" />
          {ta("aiActivityTab")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="team">
        <TeamAccessManager />
      </TabsContent>
      <TabsContent value="shops">
        <AdminShopsTab />
      </TabsContent>
      <TabsContent value="products">
        <AdminProductsTab />
      </TabsContent>
      <TabsContent value="webhook">
        <AdminWebhookTab />
      </TabsContent>
      <TabsContent value="ai-skills">
        <AdminAISkillsTab />
      </TabsContent>
      <TabsContent value="ai-activity">
        <AdminAIActivityTab />
      </TabsContent>
    </Tabs>
  );
}
