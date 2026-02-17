import { ProductCatalog } from "./_components/product-catalog";
import { getFilteredProducts, getStores } from "@/lib/queries";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProductsPage({ searchParams }: Props) {
  const sp = await searchParams;

  const search = typeof sp.search === "string" ? sp.search : undefined;
  const storeId = typeof sp.store === "string" ? sp.store : undefined;
  const stockFilter =
    sp.stock === "in_stock" || sp.stock === "out_of_stock"
      ? sp.stock
      : undefined;
  const discountFilter =
    typeof sp.discount === "string" ? sp.discount : undefined;
  const minPrice =
    typeof sp.minPrice === "string" ? parseFloat(sp.minPrice) : undefined;
  const maxPrice =
    typeof sp.maxPrice === "string" ? parseFloat(sp.maxPrice) : undefined;
  const page =
    typeof sp.page === "string" ? Math.max(1, parseInt(sp.page, 10)) : 1;

  const [result, stores] = await Promise.all([
    getFilteredProducts({
      search,
      storeId,
      stockFilter,
      discountFilter,
      minPrice: minPrice !== undefined && !isNaN(minPrice) ? minPrice : undefined,
      maxPrice: maxPrice !== undefined && !isNaN(maxPrice) ? maxPrice : undefined,
      page,
      pageSize: 24,
    }),
    getStores(),
  ]);

  return (
    <ProductCatalog
      products={result.products}
      totalCount={result.totalCount}
      totalPages={result.totalPages}
      currentPage={result.page}
      stores={stores}
      filters={{
        search: search ?? "",
        storeId: storeId ?? null,
        stockFilter: stockFilter ?? null,
        discountFilter: discountFilter ?? null,
        minPrice: typeof sp.minPrice === "string" ? sp.minPrice : "",
        maxPrice: typeof sp.maxPrice === "string" ? sp.maxPrice : "",
      }}
    />
  );
}
