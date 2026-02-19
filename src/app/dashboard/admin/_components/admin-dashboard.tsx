"use client";

import { Store as StoreIcon, Package, Bot } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import type { Store, Product, AIActivityLog } from "@/types";
import { AdminShopsTab } from "./admin-shops-tab";
import { AdminProductsTab } from "./admin-products-tab";
import { AdminAIActivityTab } from "./admin-ai-activity-tab";

interface AdminDashboardProps {
  stores: Store[];
  products: Product[];
  activityLogs: AIActivityLog[];
}

export function AdminDashboard({ stores, products, activityLogs }: AdminDashboardProps) {
  const t = useTranslations("Admin");

  return (
    <Tabs defaultValue="shops">
      <TabsList variant="line">
        <TabsTrigger value="shops">
          <StoreIcon className="w-3.5 h-3.5" />
          {t("shopsTab")}
        </TabsTrigger>
        <TabsTrigger value="products">
          <Package className="w-3.5 h-3.5" />
          {t("productsTab")}
        </TabsTrigger>
        <TabsTrigger value="ai-activity">
          <Bot className="w-3.5 h-3.5" />
          {t("aiActivityTab")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="shops">
        <AdminShopsTab stores={stores} />
      </TabsContent>
      <TabsContent value="products">
        <AdminProductsTab products={products} stores={stores} />
      </TabsContent>
      <TabsContent value="ai-activity">
        <AdminAIActivityTab activityLogs={activityLogs} stores={stores} products={products} />
      </TabsContent>
    </Tabs>
  );
}
