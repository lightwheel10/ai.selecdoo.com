"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Users, Store as StoreIcon, Package, Bot } from "lucide-react";
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

interface SettingsPageProps {
  isAdmin: boolean;
  canManageTeam: boolean;
}

export function SettingsPage({ isAdmin, canManageTeam }: SettingsPageProps) {
  const t = useTranslations("Settings");
  const ta = useTranslations("Admin");

  // No tabs visible — limited access
  if (!canManageTeam && !isAdmin) {
    return (
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
    <Tabs defaultValue="team">
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
      <TabsContent value="ai-activity">
        <AdminAIActivityTab />
      </TabsContent>
    </Tabs>
  );
}
