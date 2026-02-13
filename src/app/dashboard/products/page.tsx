import { ProductCatalog } from "./_components/product-catalog";
import { mockProducts, mockStores } from "@/lib/mock-data";

export default async function ProductsPage() {
  // TODO: Replace with real Supabase queries
  const products = mockProducts;
  const stores = mockStores;

  return <ProductCatalog products={products} stores={stores} />;
}
