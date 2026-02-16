// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ProductMapper = (item: any, storeId: string) => MappedProduct;

export interface MappedProduct {
  store_id: string;
  hash_id: string;
  title: string;
  handle: string | null;
  sku: string | null;
  brand: string | null;
  description: string | null;
  price: number;
  original_price: number | null;
  discount_percentage: number | null;
  currency: string;
  in_stock: boolean;
  image_url: string | null;
  product_url: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  variants: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  categories: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tags: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  medias: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recommend_products: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: any;
  source_retailer: string | null;
  source_language: string | null;
  source_created_at: string | null;
  source_updated_at: string | null;
  source_published_at: string | null;
  status: string;
  updated_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapWooCommerceProduct(item: any, storeId: string): MappedProduct {
  const minorUnit = item.prices?.currency_minor_unit ?? 2;
  const divisor = Math.pow(10, minorUnit);

  const priceRaw = Number(item.prices?.price ?? 0);
  const regularRaw = Number(item.prices?.regular_price ?? 0);
  const price = priceRaw / divisor;
  const regularPrice = regularRaw / divisor;

  const onSale = item.on_sale === true;
  const originalPrice = onSale && regularPrice > price ? regularPrice : null;
  const discountPct =
    originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : null;

  // Extract brand from brands array or from pa_brand attribute
  const brand =
    item.brands?.[0]?.name ??
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    item.attributes?.find((a: any) => a.taxonomy === "pa_brand")?.terms?.[0]
      ?.name ??
    null;

  // Map only variation-controlling attributes as options
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options = (item.attributes ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((a: any) => a.has_variations)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((a: any) => ({
      name: a.name,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      values: (a.terms ?? []).map((t: any) => ({ name: t.name, id: t.slug })),
    }));

  // Map variations (minimal — id + attribute selections)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const variants = (item.variations ?? []).map((v: any, i: number) => ({
    id: v.id,
    title:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      v.attributes?.map((a: any) => a.value).join(" / ") ?? `Variant ${i + 1}`,
    position: i,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(v.attributes ?? []).reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (acc: Record<string, string>, a: any, idx: number) => {
        acc[`option${idx + 1}`] = a.value;
        return acc;
      },
      {}
    ),
  }));

  return {
    store_id: storeId,
    hash_id: String(item.id ?? `${Date.now()}_${Math.random()}`),
    title: item.name ?? "Untitled",
    handle: item.slug ?? null,
    sku: item.sku ?? null,
    brand,
    description: item.short_description || item.description || null,
    price,
    original_price: originalPrice,
    discount_percentage: discountPct,
    currency: item.prices?.currency_code ?? "EUR",
    in_stock: item.is_in_stock ?? true,
    image_url: item.images?.[0]?.thumbnail ?? item.images?.[0]?.src ?? null,
    product_url: item.url ?? null,
    variants: variants.length > 0 ? variants : null,
    categories: item.categories ?? null,
    tags: item.tags ?? null,
    medias:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      item.images?.map((img: any) => ({
        url: img.src,
        thumbnail: img.thumbnail ?? null,
        alt: img.alt ?? null,
        type: "image",
      })) ?? null,
    recommend_products: null,
    options: options.length > 0 ? options : null,
    source_retailer: null,
    source_language: null,
    source_created_at: null,
    source_updated_at: null,
    source_published_at: null,
    status: "active",
    updated_at: new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapFallbackProduct(item: any, storeId: string): MappedProduct {
  const firstVariant = item.variants?.[0];
  const price = item.price ?? 0;
  const originalPrice = item.compare_at_price ?? null;
  const discountPct =
    item.discount_pct ??
    (originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : null);

  const productUrl = item.product_url ?? "";
  const handle = productUrl.split("/products/")[1]?.split("?")[0] ?? null;

  return {
    store_id: storeId,
    hash_id: String(item.product_id ?? `${Date.now()}_${Math.random()}`),
    title: item.title ?? "Untitled",
    handle,
    sku: firstVariant?.sku ?? null,
    brand: item.vendor ?? null,
    description: item.description ?? null,
    price,
    original_price: originalPrice,
    discount_percentage: discountPct,
    currency: item.currency ?? "EUR",
    in_stock: firstVariant?.available ?? true,
    image_url: item.featured_image ?? item.images?.[0] ?? null,
    product_url: productUrl || null,
    variants: item.variants ?? null,
    categories: item.categories ?? null,
    tags: item.tags ?? null,
    medias:
      item.images?.map((url: string) => ({ url, type: "image" })) ?? null,
    recommend_products: null,
    options: item.options ?? null,
    source_retailer: null,
    source_language: null,
    source_created_at: item.created_at ?? null,
    source_updated_at: item.updated_at ?? null,
    source_published_at: item.published_at ?? null,
    status: "active",
    updated_at: new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapApifyProduct(item: any, storeId: string): MappedProduct {
  const firstVariant = item.variants?.[0];
  const priceCents = firstVariant?.price?.current ?? 0;
  const previousCents = firstVariant?.price?.previous ?? 0;
  const price = priceCents / 100;
  const originalPrice = previousCents > 0 ? previousCents / 100 : null;
  const discountPct =
    originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : null;

  const canonicalUrl = item.source?.canonicalUrl ?? "";
  const handle = canonicalUrl.split("/products/")[1]?.split("?")[0] ?? null;

  // Convert epoch ms timestamps to ISO strings
  const toISO = (ms: number | undefined | null) =>
    ms ? new Date(ms).toISOString() : null;

  return {
    store_id: storeId,
    hash_id: String(item.source?.id ?? `${Date.now()}_${Math.random()}`),
    title: item.title ?? "Untitled",
    handle,
    sku: firstVariant?.sku ?? null,
    brand: item.brand ?? null,
    description: item.description ?? null,
    price,
    original_price: originalPrice,
    discount_percentage: discountPct,
    currency: item.source?.currency ?? "EUR",
    in_stock: firstVariant?.price?.stockStatus === "InStock",
    image_url: item.medias?.[0]?.url ?? null,
    product_url: canonicalUrl || null,
    variants: item.variants ?? null,
    categories: item.categories ?? null,
    tags: item.tags ?? null,
    medias: item.medias ?? null,
    recommend_products: item.recommendProducts ?? null,
    options: item.options ?? null,
    source_retailer: item.source?.retailer ?? null,
    source_language: item.source?.language ?? null,
    source_created_at: toISO(item.source?.createdUTC),
    source_updated_at: toISO(item.source?.updatedUTC),
    source_published_at: toISO(item.source?.publishedUTC),
    status: "active",
    updated_at: new Date().toISOString(),
  };
}

export function getMapper(scraperType: string, fallbackAttempted: boolean): ProductMapper {
  if (scraperType === "woocommerce") return mapWooCommerceProduct;
  if (scraperType === "shopify_fallback" || fallbackAttempted) return mapFallbackProduct;
  return mapApifyProduct;
}
