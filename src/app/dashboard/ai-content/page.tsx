import { Package } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/domain/empty-state";
import { AIContentWorkstation } from "./_components/ai-content-workstation";
import { mockProducts, mockStores, mockAIContent } from "@/lib/mock-data";

export default async function AIContentPage() {
  const t = await getTranslations("AIContent");

  // TODO: Replace with real Supabase queries
  const products = mockProducts;
  const stores = mockStores;
  const aiContent = mockAIContent;

  if (products.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
      />
    );
  }

  return (
    <AIContentWorkstation
      products={products}
      stores={stores}
      aiContent={aiContent}
    />
  );
}
