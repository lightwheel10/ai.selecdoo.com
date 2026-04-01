/**
 * Automatic AI cleaning pipeline for stores.
 *
 * Called by the /api/cron/auto-clean cron after a scrape completes and
 * sets ai_clean_status = 'pending' on the store. This module runs
 * STORE-LEVEL cleaning only:
 *
 *   1. Scrape shipping policy + about page via Firecrawl
 *   2. Call Claude to extract shipping data and generate store descriptions
 *   3. Auto-set affiliate_link_base if missing
 *
 * Product-level cleaning (titles, descriptions, categories) is NOT done
 * here. The AI content generation pipeline (src/lib/ai-content/) works
 * directly with the raw scraped product data — cleaned titles and
 * descriptions are nice-to-have but not required. Admins can still
 * manually trigger product cleaning from the settings page if needed.
 *
 * Reuses all functions from src/lib/ai-clean/ — no duplication.
 */

import {
  callClaudeJSON,
  SYSTEM_PROMPT_STORE,
  buildStoreUserPrompt,
  scrapeShippingPolicy,
  scrapeStoreDescription,
  clearMapCache,
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
  ai_shipping_country: string | null;
}

export interface AutoCleanResult {
  shippingCleaned: boolean;
}

// ─── Main Entry Point ───

/**
 * Run the store-level auto-clean pipeline for a single store.
 *
 * Enriches the store with shipping data, descriptions, and affiliate
 * link base — the minimum data needed for the AI content generation
 * pipeline to produce good results.
 *
 * @param supabase - Admin Supabase client
 * @param storeId - The store to clean
 */
export async function runAutoClean(
  supabase: AnySupabaseClient,
  storeId: string
): Promise<AutoCleanResult> {
  const result: AutoCleanResult = {
    shippingCleaned: false,
  };

  // Fetch the store with fields needed for cleaning
  const { data: store, error: storeErr } = await supabase
    .from("stores")
    .select(
      "id, name, url, platform, description_en, description_de, affiliate_link_base, ai_shipping_country"
    )
    .eq("id", storeId)
    .is("deleted_at", null)
    .single();

  if (storeErr || !store) {
    throw new Error(`Store not found: ${storeErr?.message ?? storeId}`);
  }

  // ── Store-level clean (shipping + descriptions) ──
  // Skip if the store already has shipping data (e.g. from a previous clean
  // or manual admin action)
  if (!store.ai_shipping_country) {
    await cleanStoreShipping(supabase, store);
    result.shippingCleaned = true;
  }

  // ── Log to ai_activity_logs ──
  try {
    const workspaceId = await getWorkspaceIdForStore(supabase, storeId);
    await supabase.from("ai_activity_logs").insert({
      store_id: storeId,
      workspace_id: workspaceId,
      event_type: "auto_clean",
      scope: "store",
      status: "success",
      message: `Auto-clean: store shipping ${result.shippingCleaned ? "cleaned" : "already up to date"}`,
      metadata: {
        shipping_cleaned: result.shippingCleaned,
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

  // 5. Call Claude to extract shipping data + generate descriptions
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

  // Save the cleaned store name (strips TLDs, "Store", "Shop" suffixes, etc.)
  // Claude already generates this — no reason to throw it away.
  if (result.cleaned_name) {
    dbUpdate.name = result.cleaned_name;
  }

  // Auto-set affiliate_link_base if missing (same logic as the admin route)
  // ⚠️ utm_source MUST be "selecdoo" — see src/lib/ai-clean/affiliate.ts
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
