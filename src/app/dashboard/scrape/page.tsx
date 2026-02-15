import { ScrapeView } from "./_components/scrape-view";
import { getStores, getProducts } from "@/lib/queries";

export default async function ScrapePage() {
  const [stores, products] = await Promise.all([getStores(), getProducts()]);

  return <ScrapeView stores={stores} products={products} />;
}
