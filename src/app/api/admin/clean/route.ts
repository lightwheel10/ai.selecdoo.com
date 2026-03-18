import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  callClaudeJSON,
  SYSTEM_PROMPT_CLEAN,
  buildCleanUserPrompt,
  generateAffiliateLink,
  type CleanProductInput,
  type CleanProductResult,
} from "@/lib/ai-clean";

const VALID_SCOPES = ["descriptions", "full"] as const;
type CleanScope = (typeof VALID_SCOPES)[number];

interface CleanRequest {
  productIds: string[];
  scope: CleanScope;
}

interface ProductResult {
  productId: string;
  status: "success" | "error" | "skipped";
  error?: string;
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

    const body: CleanRequest = await req.json();
    const { productIds, scope } = body;

    if (
      !Array.isArray(productIds) ||
      productIds.length === 0 ||
      productIds.length > 5
    ) {
      return NextResponse.json(
        { error: "productIds must be an array of 1-5 IDs" },
        { status: 400 }
      );
    }

    if (!VALID_SCOPES.includes(scope)) {
      return NextResponse.json(
        { error: `scope must be one of: ${VALID_SCOPES.join(", ")}` },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch products with fields needed for prompts
    const { data: products, error: fetchErr } = await supabase
      .from("products")
      .select(
        "id, store_id, title, cleaned_title, description, brand, price, original_price, discount_percentage, currency, in_stock, product_url, condition"
      )
      .in("id", productIds)
      .is("deleted_at", null);

    if (fetchErr || !products) {
      return NextResponse.json(
        { error: "Failed to fetch products" },
        { status: 500 }
      );
    }

    // Fetch stores with platform + affiliate fields
    const storeIds = [...new Set(products.map((p) => p.store_id))];
    const { data: stores } = await supabase
      .from("stores")
      .select("id, name, url, platform, affiliate_link_base, program_id, coupon_code")
      .in("id", storeIds);

    const storeMap = new Map(
      (stores ?? []).map((s) => [s.id, s])
    );

    const results: ProductResult[] = [];

    for (const product of products) {
      const store = storeMap.get(product.store_id);
      if (!store) {
        results.push({ productId: product.id, status: "skipped", error: "Store not found" });
        continue;
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: Record<string, any> = {};

        if (scope === "descriptions" || scope === "full") {
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

          const result = await callClaudeJSON<CleanProductResult>(
            SYSTEM_PROMPT_CLEAN,
            buildCleanUserPrompt(input)
          );

          // Log Claude response for debugging
          console.log(`[clean] Product ${product.id} — Claude response keys:`, Object.keys(result));
          console.log(`[clean] cleaned_title: ${result.cleaned_title ? `✓ (${result.cleaned_title.length} chars)` : "✗ MISSING"}`);
          console.log(`[clean] description (DE): ${result.description ? `✓ (${result.description.length} chars)` : "✗ MISSING"}`);
          console.log(`[clean] description_english: ${result.description_english ? `✓ (${result.description_english.length} chars)` : "✗ MISSING"}`);
          console.log(`[clean] category: ${result.category || "✗ MISSING"}`);

          // Map v1-style field names to v2 DB columns
          updateData.cleaned_title = result.cleaned_title;
          updateData.description_de = result.description;
          updateData.description_en = result.description_english;
          updateData.ai_category = result.category;
          updateData.ai_cleaned_at = new Date().toISOString();
        }

        if (scope === "full") {
          const link = generateAffiliateLink(product.product_url, store);
          if (link) {
            updateData.affiliate_link = link;
          }
        }

        // Log what we're about to write to DB
        console.log(`[clean] Product ${product.id} — DB update fields:`, Object.keys(updateData));
        console.log(`[clean] description_de value: ${updateData.description_de ? `✓ (${updateData.description_de.length} chars)` : "✗ null/undefined"}`);
        console.log(`[clean] description_en value: ${updateData.description_en ? `✓ (${updateData.description_en.length} chars)` : "✗ null/undefined"}`);

        const { error: updateErr, data: updateData_ } = await supabase
          .from("products")
          .update(updateData)
          .eq("id", product.id)
          .select("id, description_de, description_en");

        console.log(`[clean] Product ${product.id} — Supabase update result:`, updateErr ? `ERROR: ${updateErr.message}` : "OK");
        if (updateData_) {
          console.log(`[clean] After update — description_de: ${updateData_[0]?.description_de ? "✓ has value" : "✗ empty"}`);
          console.log(`[clean] After update — description_en: ${updateData_[0]?.description_en ? "✓ has value" : "✗ empty"}`);
        }

        if (updateErr) {
          results.push({ productId: product.id, status: "error", error: updateErr.message });
        } else {
          results.push({ productId: product.id, status: "success" });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        results.push({ productId: product.id, status: "error", error: msg });
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error("Clean API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
