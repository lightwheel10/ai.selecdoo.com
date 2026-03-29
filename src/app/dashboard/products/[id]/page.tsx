import { notFound, redirect } from "next/navigation";
import { getProductById, getStoreById } from "@/lib/queries";
import { canAccessProducts } from "@/lib/auth/roles";
import { getAuthContext } from "@/lib/auth/session";
import { ProductDetailView } from "./_components/product-detail";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { workspaceId, role, permissions } = await getAuthContext();

  // Guard: must have products:access (matches /dashboard/products list page).
  if (!canAccessProducts({ role, permissions })) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const product = await getProductById(id, workspaceId!);

  if (!product) notFound();

  // Pass workspaceId to ensure the store belongs to the user's workspace
  const store = await getStoreById(product.store_id, workspaceId!);

  return <ProductDetailView product={product} store={store} />;
}
