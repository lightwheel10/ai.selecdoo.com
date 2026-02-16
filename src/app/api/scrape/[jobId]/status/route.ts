import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const APIFY_TOKEN = process.env.APIFY_API_KEY!;
const APIFY_FALLBACK_ACTOR_ID = process.env.APIFY_FALLBACK_ACTOR_ID;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapWooCommerceProduct(item: any, storeId: string) {
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
    image_url: item.images?.[0]?.src ?? null,
    product_url: item.url ?? null,
    variants: variants.length > 0 ? variants : null,
    categories: item.categories ?? null,
    tags: item.tags ?? null,
    medias:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      item.images?.map((img: any) => ({
        url: img.src,
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
function mapFallbackProduct(item: any, storeId: string) {
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
function mapApifyProduct(item: any, storeId: string) {
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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const supabase = createAdminClient();

    // Get job
    const { data: job, error: jobErr } = await supabase
      .from("scrape_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobErr || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // If already completed/failed, just return status
    if (job.status === "completed" || job.status === "failed") {
      return NextResponse.json({
        status: job.status,
        products_found: job.products_found,
        products_updated: job.products_updated,
        error_message: job.error_message,
      });
    }

    // Check Apify run status
    if (!job.apify_run_id) {
      return NextResponse.json({ status: "running", products_found: 0, products_updated: 0 });
    }

    const runRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${job.apify_run_id}?token=${APIFY_TOKEN}`
    );

    if (!runRes.ok) {
      return NextResponse.json({ status: "running", products_found: 0, products_updated: 0 });
    }

    const runData = await runRes.json();
    const runStatus = runData.data?.status;

    // Still running — return current count from Apify stats
    if (runStatus === "RUNNING" || runStatus === "READY") {
      const itemCount = runData.data?.stats?.itemCount ?? 0;
      return NextResponse.json({
        status: "running",
        products_found: itemCount,
        products_updated: 0,
        apify_status: runStatus,
      });
    }

    // Failed
    if (runStatus === "FAILED" || runStatus === "ABORTED" || runStatus === "TIMED-OUT") {
      await supabase
        .from("scrape_jobs")
        .update({
          status: "failed",
          error_message: `Apify run ${runStatus}`,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      return NextResponse.json({
        status: "failed",
        products_found: 0,
        products_updated: 0,
        error_message: `Apify run ${runStatus}`,
      });
    }

    // Succeeded — fetch dataset and upsert products
    if (runStatus === "SUCCEEDED") {
      const datasetId = job.apify_dataset_id || runData.data?.defaultDatasetId;

      // Fetch all items from dataset
      const itemsRes = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=10000`
      );

      if (!itemsRes.ok) {
        await supabase
          .from("scrape_jobs")
          .update({
            status: "failed",
            error_message: "Failed to fetch dataset",
            completed_at: new Date().toISOString(),
          })
          .eq("id", jobId);

        return NextResponse.json({
          status: "failed",
          error_message: "Failed to fetch dataset",
          products_found: 0,
          products_updated: 0,
        });
      }

      const items = await itemsRes.json();

      // ── Fallback: if primary Shopify scraper returned 0 products, try the secondary ──
      if (
        items.length === 0 &&
        !job.fallback_attempted &&
        job.scraper_type !== "woocommerce" &&
        APIFY_FALLBACK_ACTOR_ID
      ) {
        // Look up store URL
        const { data: store } = await supabase
          .from("stores")
          .select("url")
          .eq("id", job.store_id)
          .single();

        if (store?.url) {
          const fallbackRes = await fetch(
            `https://api.apify.com/v2/acts/${APIFY_FALLBACK_ACTOR_ID}/runs?token=${APIFY_TOKEN}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                storeUrls: [{ url: store.url }],
                maxProducts: 5000,
                proxyConfiguration: { useApifyProxy: true },
              }),
            }
          );

          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            const newRunId = fallbackData.data?.id;
            const newDatasetId = fallbackData.data?.defaultDatasetId;

            await supabase
              .from("scrape_jobs")
              .update({
                apify_run_id: newRunId,
                apify_dataset_id: newDatasetId,
                fallback_attempted: true,
                scraper_type: "shopify_fallback",
              })
              .eq("id", jobId);

            return NextResponse.json({
              status: "running",
              products_found: 0,
              products_updated: 0,
              fallback: true,
            });
          }
        }
      }

      // Use the correct mapper based on scraper type
      const mapper =
        job.scraper_type === "woocommerce"
          ? mapWooCommerceProduct
          : job.scraper_type === "shopify_fallback" || job.fallback_attempted
            ? mapFallbackProduct
            : mapApifyProduct;
      const products = items.map((item: unknown) => mapper(item, job.store_id));
      const scrapedHashIds = products.map((p: { hash_id: string }) => p.hash_id);

      // Upsert products in batches of 50
      // Note: we intentionally exclude is_published/is_featured/is_slider
      // so re-scraping doesn't reset user-set publishing flags
      let totalUpserted = 0;
      const batchSize = 50;
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        const { error: upsertErr } = await supabase
          .from("products")
          .upsert(batch, { onConflict: "hash_id" });

        if (upsertErr) {
          console.error(`Upsert batch ${i} error:`, upsertErr);
        } else {
          totalUpserted += batch.length;
        }
      }

      // Mark products NOT in this scrape as removed
      // (they were in our DB but no longer on the store)
      if (scrapedHashIds.length > 0) {
        const { data: existing } = await supabase
          .from("products")
          .select("hash_id")
          .eq("store_id", job.store_id)
          .eq("status", "active")
          .is("deleted_at", null);

        const removedHashIds = (existing ?? [])
          .map((p) => p.hash_id)
          .filter((hid: string) => !scrapedHashIds.includes(hid));

        if (removedHashIds.length > 0) {
          await supabase
            .from("products")
            .update({ status: "removed", updated_at: new Date().toISOString() })
            .eq("store_id", job.store_id)
            .in("hash_id", removedHashIds);
        }
      }

      // Update store product_count and last_scraped_at
      await supabase
        .from("stores")
        .update({
          product_count: products.length,
          last_scraped_at: new Date().toISOString(),
        })
        .eq("id", job.store_id);

      // Mark job completed
      await supabase
        .from("scrape_jobs")
        .update({
          status: "completed",
          products_found: products.length,
          products_updated: totalUpserted,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      return NextResponse.json({
        status: "completed",
        products_found: products.length,
        products_updated: totalUpserted,
      });
    }

    // Unknown status
    return NextResponse.json({
      status: "running",
      products_found: 0,
      products_updated: 0,
      apify_status: runStatus,
    });
  } catch (err) {
    console.error("Status API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
