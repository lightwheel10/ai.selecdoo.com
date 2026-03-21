import { ScrapeView } from "./_components/scrape-view";
import { getStores, getProducts } from "@/lib/queries";
import { getAuthContext } from "@/lib/auth/session";

export default async function ScrapePage() {
  const { workspaceId } = await getAuthContext();
  const [stores, products] = await Promise.all([getStores(workspaceId!), getProducts(workspaceId!)]);

  return <ScrapeView stores={stores} products={products} />;
}
