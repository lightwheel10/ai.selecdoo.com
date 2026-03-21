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
    const { role, permissions, user, isDevBypass, workspaceId } = await getAuthContext();
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
    const storeQuery = supabase
      .from("stores")
      .select("id, name, url, platform, affiliate_link_base, program_id, coupon_code")
      .in("id", storeIds);
    // Workspace isolation: always filter stores by workspace.
    // If workspaceId is null, no stores will match — preventing cross-workspace access.
    storeQuery.eq("workspace_id", workspaceId);
    const { data: stores } = await storeQuery;

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

          // Map v1-style field names to v2 DB columns
          updateData.cleaned_title = result.cleaned_title;
          updateData.description_de = result.description;
          updateData.description_en = result.description_english;
          updateData.ai_category = result.category;
          updateData.ai_shipping_data = result.shipping || null;
          updateData.ai_cleaned_at = new Date().toISOString();
        }

        if (scope === "full") {
          const link = generateAffiliateLink(product.product_url, store);
          if (link) {
            updateData.affiliate_link = link;
          }
        }

        const { error: updateErr } = await supabase
          .from("products")
          .update(updateData)
          .eq("id", product.id);

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
