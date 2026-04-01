/**
 * Automatic AI cleaning pipeline for stores and their products.
 *
 * Called by the /api/cron/auto-clean cron after a scrape completes and
 * sets ai_clean_status = 'pending' on the store. This module runs:
 *
 * 1. Store-level clean: scrape shipping policy + about page via Firecrawl,
 *    call Claude to extract shipping data and generate store descriptions.
 *
 * 2. Product-level clean: for each product without ai_cleaned_at, call
 *    Claude to generate cleaned titles, DE/EN descriptions, categories,
 *    and affiliate links. Processes in batches of 5.
 *
 * Reuses all functions from src/lib/ai-clean/ — no duplication.
 *
 * The hasTimeRemaining() callback allows the cron to stop mid-batch
 * when approaching the Vercel function timeout. The next cron invocation
 * continues from where it left off (products without ai_cleaned_at).
 */

import * as Sentry from "@sentry/nextjs";
import type { StorePlatform } from "@/types";
import {
  callClaudeJSON,
  SYSTEM_PROMPT_CLEAN,
  SYSTEM_PROMPT_STORE,
  buildCleanUserPrompt,
  buildStoreUserPrompt,
  generateAffiliateLink,
  scrapeShippingPolicy,
  scrapeStoreDescription,
  clearMapCache,
  type CleanProductInput,
  type CleanProductResult,
  type StoreCleanResult,
} from "@/lib/ai-clean";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = import("@supabase/supabase-js").SupabaseClient<any, any, any>;

// ─── Types ───

interface StoreForClean {
  id: string;
  name: string;
  url: string;
  platform: string | null;
  description_en: string | null;
  description_de: string | null;
  affiliate_link_base: string | null;
  program_id: string | null;
  coupon_code: string | null;
  ai_shipping_country: string | null;
}

export interface AutoCleanResult {
  shippingCleaned: boolean;
  productsProcessed: number;
  productsUpdated: number;
  productsFailed: number;
  stoppedEarly: boolean; // true if we ran out of time
}

// ─── Constants ───

/** Max products per Claude call (matches /api/admin/clean batch limit) */
const PRODUCT_BATCH_SIZE = 5;

/** How many products to fetch at a time from DB for batching */
const PRODUCT_FETCH_LIMIT = 50;

// ─── Main Entry Point ───

/**
 * Run the full auto-clean pipeline for a single store.
 *
 * @param supabase - Admin Supabase client
 * @param storeId - The store to clean
 * @param hasTimeRemaining - Callback returning false when the cron is
 *   approaching its timeout and should stop processing more batches.
 */
export async function runAutoClean(
  supabase: AnySupabaseClient,
  storeId: string,
  hasTimeRemaining: () => boolean
): Promise<AutoCleanResult> {
  const result: AutoCleanResult = {
    shippingCleaned: false,
    productsProcessed: 0,
    productsUpdated: 0,
    productsFailed: 0,
    stoppedEarly: false,
  };

  // Fetch the store with all fields needed for cleaning
  const { data: store, error: storeErr } = await supabase
    .from("stores")
    .select(
      "id, name, url, platform, description_en, description_de, affiliate_link_base, program_id, coupon_code, ai_shipping_country"
    )
    .eq("id", storeId)
    .is("deleted_at", null)
    .single();

  if (storeErr || !store) {
    throw new Error(`Store not found: ${storeErr?.message ?? storeId}`);
  }

  // ── Phase 1: Store-level clean (shipping + descriptions) ──
  // Skip if the store already has shipping data (e.g. from a previous clean)
  if (!store.ai_shipping_country && hasTimeRemaining()) {
    try {
      await cleanStoreShipping(supabase, store);
      result.shippingCleaned = true;
    } catch (err) {
      // Log but continue to product cleaning — partial enrichment is
      // better than no enrichment at all.
      console.error(`Auto-clean shipping failed for store ${store.id}:`, err);
      Sentry.captureException(err, {
        tags: { phase: "auto-clean-shipping", storeId: store.id },
      });
    }
  }

  // ── Phase 2: Product-level clean (descriptions + categories + affiliate links) ──
  if (hasTimeRemaining()) {
    // Re-fetch store to get the latest affiliate_link_base (may have been
    // set by the shipping clean phase above)
    const { data: freshStore } = await supabase
      .from("stores")
      .select("id, name, url, platform, affiliate_link_base, program_id, coupon_code")
      .eq("id", storeId)
      .single();

    if (freshStore) {
      const productResult = await cleanStoreProducts(
        supabase,
        { ...freshStore, platform: (freshStore.platform as StorePlatform) || undefined },
        hasTimeRemaining
      );
      result.productsProcessed = productResult.processed;
      result.productsUpdated = productResult.updated;
      result.productsFailed = productResult.failed;
      result.stoppedEarly = productResult.stoppedEarly;
    }
  } else {
    result.stoppedEarly = true;
  }

  // ── Phase 3: Log to ai_activity_logs ──
  try {
    await supabase.from("ai_activity_logs").insert({
      store_id: storeId,
      workspace_id: store.id ? await getWorkspaceIdForStore(supabase, storeId) : null,
      event_type: "auto_clean",
      scope: "full",
      status: result.productsFailed > 0 ? "partial" : "success",
      message: `Auto-clean: ${result.productsUpdated} products cleaned, ${result.productsFailed} failed${result.stoppedEarly ? " (stopped early — will continue next run)" : ""}`,
      metadata: {
        shipping_cleaned: result.shippingCleaned,
        items_processed: result.productsProcessed,
        items_updated: result.productsUpdated,
        items_skipped: result.productsFailed,
      },
    });
  } catch (err) {
    // Activity logging is non-critical — don't fail the whole clean
    console.error("Failed to log auto-clean activity:", err);
  }

  return result;
}

// ─── Store Shipping Clean ───
// Mirrors the logic from /api/admin/clean/shipping/route.ts but callable
// programmatically without HTTP or auth overhead.

async function cleanStoreShipping(
  supabase: AnySupabaseClient,
  store: StoreForClean
): Promise<void> {
  // 1. Try Firecrawl to scrape shipping policy
  let shippingCorpus: string | null = null;

  const policyText = await scrapeShippingPolicy(store.url);
  if (policyText) {
    shippingCorpus = policyText;
  }

  // 2. Fall back to product descriptions if no shipping policy found
  if (!shippingCorpus) {
    const { data: products } = await supabase
      .from("products")
      .select("description")
      .eq("store_id", store.id)
      .is("deleted_at", null)
      .not("description", "is", null)
      .limit(10);

    const descriptions = (products ?? [])
      .map((p) => p.description)
      .filter(Boolean) as string[];

    if (descriptions.length > 0) {
      shippingCorpus = descriptions
        .map((d) => d.slice(0, 500))
        .join("\n---\n");
    }
  }

  // 3. If no data at all, skip shipping clean (not an error — some stores
  //    genuinely have no shipping info to extract)
  if (!shippingCorpus) {
    clearMapCache(store.url);
    console.log(`Auto-clean: no shipping data available for store ${store.id}, skipping`);
    return;
  }

  // 4. Scrape about/homepage for description generation (only if both empty)
  const needsDescription = !store.description_en && !store.description_de;
  let descriptionCorpus: string | null = null;
  if (needsDescription) {
    descriptionCorpus = await scrapeStoreDescription(store.url);
  }

  // Done with Firecrawl — clear the shared map cache
  clearMapCache(store.url);

  // 5. Call Claude
  const result = await callClaudeJSON<StoreCleanResult>(
    SYSTEM_PROMPT_STORE,
    buildStoreUserPrompt(
      store.name,
      store.url,
      store.platform || "",
      shippingCorpus,
      descriptionCorpus,
      needsDescription
    )
  );

  // 6. Update store record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbUpdate: Record<string, any> = {
    ai_shipping_country: result.shipping.country,
    ai_shipping_price: result.shipping.price,
    ai_shipping_service: result.shipping.service,
    ai_shipping_min_handling_time: result.shipping.min_handling_time,
    ai_shipping_max_handling_time: result.shipping.max_handling_time,
    ai_shipping_min_transit_time: result.shipping.min_transit_time,
    ai_shipping_max_transit_time: result.shipping.max_transit_time,
  };

  if (needsDescription) {
    if (result.description_en) dbUpdate.description_en = result.description_en;
    if (result.description_de) dbUpdate.description_de = result.description_de;
  }

  // Auto-set affiliate_link_base if missing (same logic as the admin route)
  if (!store.affiliate_link_base && store.url) {
    const cleanUrl = store.url.replace(/\/+$/, "");
    dbUpdate.affiliate_link_base = `${cleanUrl}/?utm_source=selecdoo&utm_medium=affiliate&a_aid=4063096d&a_cid=`;
  }

  const { error: updateErr } = await supabase
    .from("stores")
    .update(dbUpdate)
    .eq("id", store.id);

  if (updateErr) {
    throw new Error(`Failed to update store shipping: ${updateErr.message}`);
  }
}

// ─── Product Clean ───
// Mirrors the logic from /api/admin/clean/route.ts (scope = "full") but
// processes all uncleaned products for a store in batches of 5.

interface ProductCleanResult {
  processed: number;
  updated: number;
  failed: number;
  stoppedEarly: boolean;
}

async function cleanStoreProducts(
  supabase: AnySupabaseClient,
  store: { id: string; name: string; url: string; platform: StorePlatform | undefined; affiliate_link_base: string | null; program_id: string | null; coupon_code: string | null },
  hasTimeRemaining: () => boolean
): Promise<ProductCleanResult> {
  const result: ProductCleanResult = { processed: 0, updated: 0, failed: 0, stoppedEarly: false };

  // Fetch uncleaned products in pages
  let offset = 0;
  let hasMore = true;

  while (hasMore && hasTimeRemaining()) {
    const { data: products, error: fetchErr } = await supabase
      .from("products")
      .select(
        "id, store_id, title, cleaned_title, description, brand, price, original_price, discount_percentage, currency, in_stock, product_url, condition"
      )
      .eq("store_id", store.id)
      .is("deleted_at", null)
      .is("ai_cleaned_at", null)
      .order("created_at", { ascending: true })
      .range(offset, offset + PRODUCT_FETCH_LIMIT - 1);

    if (fetchErr || !products || products.length === 0) {
      hasMore = false;
      break;
    }

    // Process in batches of PRODUCT_BATCH_SIZE
    for (let i = 0; i < products.length; i += PRODUCT_BATCH_SIZE) {
      if (!hasTimeRemaining()) {
        result.stoppedEarly = true;
        return result;
      }

      const batch = products.slice(i, i + PRODUCT_BATCH_SIZE);

      for (const product of batch) {
        result.processed++;
        try {
          const input: CleanProductInput = {
            title: product.cleaned_title || product.title,
            description: product.description,
            brand: product.brand,
            price: Number(product.price),
            sale_price: product.original_price ? Number(product.original_price) : null,
            discount: product.discount_percentage ? Number(product.discount_percentage) : null,
            currency: product.currency,
            availability: product.in_stock ? "in stock" : "out of stock",
            condition: product.condition,
            product_url: product.product_url,
            store_name: store.name,
            shop_system: store.platform || "",
            shipping_policy: "",
          };

          const cleanResult = await callClaudeJSON<CleanProductResult>(
            SYSTEM_PROMPT_CLEAN,
            buildCleanUserPrompt(input)
          );

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const updateData: Record<string, any> = {
            cleaned_title: cleanResult.cleaned_title,
            description_de: cleanResult.description,
            description_en: cleanResult.description_english,
            ai_category: cleanResult.category,
            ai_shipping_data: cleanResult.shipping || null,
            ai_cleaned_at: new Date().toISOString(),
          };

          // Generate affiliate link (same as scope="full" in admin clean)
          const link = generateAffiliateLink(product.product_url, store);
          if (link) {
            updateData.affiliate_link = link;
          }

          const { error: updateErr } = await supabase
            .from("products")
            .update(updateData)
            .eq("id", product.id);

          if (updateErr) {
            console.error(`Auto-clean product ${product.id} DB update failed:`, updateErr.message);
            result.failed++;
          } else {
            result.updated++;
          }
        } catch (err) {
          console.error(`Auto-clean product ${product.id} failed:`, err);
          Sentry.captureException(err, {
            tags: { phase: "auto-clean-product", productId: product.id, storeId: store.id },
          });
          result.failed++;
        }
      }
    }

    // If we got a full page, there may be more products
    hasMore = products.length === PRODUCT_FETCH_LIMIT;
    offset += PRODUCT_FETCH_LIMIT;
  }

  return result;
}

// ─── Helpers ───

async function getWorkspaceIdForStore(
  supabase: AnySupabaseClient,
  storeId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("stores")
    .select("workspace_id")
    .eq("id", storeId)
    .single();
  return data?.workspace_id ?? null;
}
