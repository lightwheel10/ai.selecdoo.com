import { Package } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/domain/empty-state";
import { AIContentWorkstation } from "./_components/ai-content-workstation";
import { getProducts, getStores, getAIContent } from "@/lib/queries";

export default async function AIContentPage() {
  const t = await getTranslations("AIContent");

  const [products, stores, aiContent] = await Promise.all([
    getProducts(),
    getStores(),
    getAIContent(),
  ]);

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
