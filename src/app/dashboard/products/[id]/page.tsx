import { notFound } from "next/navigation";
import { getProductById, getStoreById } from "@/lib/queries";
import { getAuthContext } from "@/lib/auth/session";
import { ProductDetailView } from "./_components/product-detail";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { workspaceId } = await getAuthContext();
  const { id } = await params;
  const product = await getProductById(id, workspaceId!);

  if (!product) notFound();

  const store = await getStoreById(product.store_id);

  return <ProductDetailView product={product} store={store} />;
}
