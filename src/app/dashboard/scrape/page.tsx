import { ScrapeView } from "./_components/scrape-view";
import { mockStores, mockProducts } from "@/lib/mock-data";

export default async function ScrapePage() {
  // TODO: Replace with real Supabase queries
  const stores = mockStores;
  const products = mockProducts;

  return <ScrapeView stores={stores} mockProducts={products} />;
}
