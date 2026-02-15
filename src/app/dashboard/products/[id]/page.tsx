import { notFound } from "next/navigation";
import { getProductById, getStores } from "@/lib/queries";
import { ProductDetailView } from "./_components/product-detail";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const [product, stores] = await Promise.all([
    getProductById(id),
    getStores(),
  ]);

  if (!product) notFound();

  const store = stores.find((s) => s.id === product.store_id) ?? null;

  return <ProductDetailView product={product} store={store} />;
}
