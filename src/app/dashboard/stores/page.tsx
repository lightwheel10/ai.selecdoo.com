import { Store } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/domain/empty-state";
import { StoreTable } from "./_components/store-table";
import { AddStoreDialog } from "./_components/add-store-dialog";
import { getStores } from "@/lib/queries";

export default async function StoresPage() {
  const t = await getTranslations("Stores");

  const stores = await getStores();

  if (stores.length === 0) {
    return (
      <EmptyState
        icon={Store}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
        action={<AddStoreDialog />}
      />
    );
  }

  return <StoreTable stores={stores} />;
}
