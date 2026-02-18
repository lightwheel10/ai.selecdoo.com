import { Package } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/domain/empty-state";
import { AIContentWorkstation } from "./_components/ai-content-workstation";
import { getFilteredProducts, getStores, getAIContent } from "@/lib/queries";
import { canAccessAIContent } from "@/lib/auth/roles";
import { getAuthContext } from "@/lib/auth/session";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AIContentPage({ searchParams }: Props) {
  const { user, role, permissions, isDevBypass } = await getAuthContext();
  if (!user && !isDevBypass) {
    redirect("/login");
  }
  if (!canAccessAIContent({ role, permissions })) {
    redirect("/dashboard");
  }

  const t = await getTranslations("AIContent");
  const sp = await searchParams;

  const search = typeof sp.search === "string" ? sp.search : undefined;
  const storeIds =
    typeof sp.stores === "string" && sp.stores
      ? sp.stores.split(",").filter(Boolean)
      : undefined;
  const discountFilter =
    typeof sp.discount === "string" ? sp.discount : "17";
  const sortBy =
    sp.sortBy === "discount_percentage" || sp.sortBy === "price"
      ? sp.sortBy
      : undefined;
  const sortDir =
    sp.sortDir === "asc" || sp.sortDir === "desc" ? sp.sortDir : undefined;
  const page =
    typeof sp.page === "string" ? Math.max(1, parseInt(sp.page, 10)) : 1;

  const [result, stores, aiContent] = await Promise.all([
    getFilteredProducts({
      search,
      storeIds,
      discountFilter: discountFilter || undefined,
      sortBy: sortBy as "discount_percentage" | "price" | undefined,
      sortDir,
      page,
      pageSize: 12,
    }),
    getStores(),
    getAIContent(),
  ]);

  if (result.totalCount === 0 && !search && !storeIds && !discountFilter) {
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
      products={result.products}
      totalCount={result.totalCount}
      totalPages={result.totalPages}
      currentPage={result.page}
      stores={stores}
      aiContent={aiContent}
      filters={{
        search: search ?? "",
        storeIds: storeIds ?? [],
        discountFilter: discountFilter ?? null,
        sortBy: sortBy ?? null,
        sortDir: sortDir ?? null,
      }}
    />
  );
}
