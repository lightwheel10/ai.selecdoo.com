import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  callClaudeJSON,
  SYSTEM_PROMPT_STORE,
  buildStoreUserPrompt,
  scrapeShippingPolicy,
  scrapeStoreDescription,
  clearMapCache,
  type StoreCleanResult,
} from "@/lib/ai-clean";

interface ShippingRequest {
  storeId: string;
}

export async function POST(req: Request) {
  try {
    const { role, permissions, user, isDevBypass } = await getAuthContext();
    if (!user && !isDevBypass) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canAccessAdmin({ role, permissions })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: ShippingRequest = await req.json();
    const { storeId } = body;

    if (!storeId || typeof storeId !== "string") {
      return NextResponse.json({ error: "storeId is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch store with URL + platform for the prompt
    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select("id, name, url, platform, description_en, description_de")
      .eq("id", storeId)
      .is("deleted_at", null)
      .single();

    if (storeErr || !store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // 1. Try Firecrawl to scrape the store's shipping page
    let shippingCorpus: string | null = null;
    let source: "firecrawl" | "products" = "products";

    const policyText = await scrapeShippingPolicy(store.url);
    if (policyText) {
      shippingCorpus = policyText;
      source = "firecrawl";
    }

    // 2. Fall back to product descriptions
    if (!shippingCorpus) {
      const { data: products } = await supabase
        .from("products")
        .select("description")
        .eq("store_id", storeId)
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

    // 3. Nothing found
    if (!shippingCorpus) {
      clearMapCache(store.url);
      return NextResponse.json(
        { error: "No shipping data available" },
        { status: 400 }
      );
    }

    // 4. Scrape about/homepage for description generation (only if both empty)
    const needsDescription = !store.description_en && !store.description_de;
    let descriptionCorpus: string | null = null;
    if (needsDescription) {
      descriptionCorpus = await scrapeStoreDescription(store.url);
    }

    // Done with Firecrawl — clear the shared map cache
    clearMapCache(store.url);

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

    // Update store with shipping data + descriptions (if empty)
    const dbUpdate: Record<string, unknown> = {
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

    const { error: updateErr } = await supabase
      .from("stores")
      .update(dbUpdate)
      .eq("id", storeId);

    if (updateErr) {
      console.error("Store shipping update error:", updateErr);
      return NextResponse.json({ error: "Failed to update store" }, { status: 500 });
    }

    return NextResponse.json({
      shipping: result.shipping,
      cleaned_name: result.cleaned_name,
      source,
      descriptions_generated: needsDescription && !!(result.description_en || result.description_de),
    });
  } catch (err) {
    console.error("Shipping API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
