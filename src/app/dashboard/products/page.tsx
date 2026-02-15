import { ProductCatalog } from "./_components/product-catalog";
import { getProducts, getStores } from "@/lib/queries";

export default async function ProductsPage() {
  const [products, stores] = await Promise.all([getProducts(), getStores()]);

  return <ProductCatalog products={products} stores={stores} />;
}
