import { Package } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/domain/empty-state";
import { AIContentWorkstation } from "./_components/ai-content-workstation";
import { getFilteredProducts, getStores, getAIContent, getContentStatusCounts } from "@/lib/queries";
import { canAccessAIContent } from "@/lib/auth/roles";
import { getAuthContext } from "@/lib/auth/session";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AIContentPage({ searchParams }: Props) {
  const { user, workspaceId, role, permissions, isDevBypass } = await getAuthContext();
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
  const stockFilter =
    sp.stock === "in_stock" || sp.stock === "out_of_stock"
      ? sp.stock
      : undefined;
  const variantFilter =
    sp.variants === "with_variants" || sp.variants === "without_variants"
      ? sp.variants
      : undefined;
  const minPrice =
    typeof sp.minPrice === "string" ? parseFloat(sp.minPrice) : undefined;
  const maxPrice =
    typeof sp.maxPrice === "string" ? parseFloat(sp.maxPrice) : undefined;
  const sortBy =
    sp.sortBy === "discount_percentage" || sp.sortBy === "price"
      ? sp.sortBy
      : undefined;
  const sortDir =
    sp.sortDir === "asc" || sp.sortDir === "desc" ? sp.sortDir : undefined;
  const page =
    typeof sp.page === "string" ? Math.max(1, parseInt(sp.page, 10)) : 1;

  const VALID_CONTENT_STATUSES = ["no_content", "partial", "complete"];
  const contentStatus =
    typeof sp.contentStatus === "string" && sp.contentStatus
      ? sp.contentStatus.split(",").filter((s) => VALID_CONTENT_STATUSES.includes(s))
      : undefined;

  const [result, stores, contentCounts] = await Promise.all([
    getFilteredProducts({
      search,
      storeIds,
      discountFilter: discountFilter === "all" ? undefined : (discountFilter || undefined),
      stockFilter,
      variantFilter,
      minPrice: minPrice !== undefined && !isNaN(minPrice) ? minPrice : undefined,
      maxPrice: maxPrice !== undefined && !isNaN(maxPrice) ? maxPrice : undefined,
      contentStatus: contentStatus?.length ? contentStatus : undefined,
      sortBy: sortBy as "discount_percentage" | "price" | undefined,
      sortDir,
      page,
      pageSize: 12,
      randomize: !sortBy,
    }, workspaceId!),
    getStores(workspaceId!),
    getContentStatusCounts(workspaceId!),
  ]);

  // Fetch AI content scoped to the current page's products only
  const productIds = result.products.map((p) => p.id);
  const aiContent = productIds.length > 0
    ? await getAIContent(productIds, workspaceId!)
    : [];

  if (result.totalCount === 0 && !search && !storeIds && !discountFilter && !contentStatus) {
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
      contentCounts={contentCounts}
      filters={{
        search: search ?? "",
        storeIds: storeIds ?? [],
        discountFilter: discountFilter ?? null,
        stockFilter: stockFilter ?? null,
        variantFilter: variantFilter ?? null,
        minPrice: typeof sp.minPrice === "string" ? sp.minPrice : "",
        maxPrice: typeof sp.maxPrice === "string" ? sp.maxPrice : "",
        contentStatus: contentStatus ?? [],
        sortBy: sortBy ?? null,
        sortDir: sortDir ?? null,
      }}
    />
  );
}
