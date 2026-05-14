/**
 * Public product feed endpoint (Google Merchant Center XML format).
 *
 * 2026-05-14 (paras): Initial version. New feature for David / RevenueWorks
 * to let workspace owners hand a single URL to Google Merchant / Meta /
 * affiliate networks. The consumer polls the URL on its own schedule.
 *
 * URL shape:
 *   GET /feed/workspace/{workspaceId}/{token}.xml
 *
 * Optional filtering via repeated query params:
 *   ?store={storeUuid}                    → only that store's products
 *   ?store={storeUuid}&store={storeUuid}  → those stores only
 *   (no ?store=)                          → all stores in the workspace
 *
 * Auth model: UNAUTHENTICATED on purpose — Google Merchant / Meta / etc.
 * don't log in. Security comes from the secret `{token}` in the URL path
 * which must match the workspace's stored `feed_secret` column. The token is
 * cryptographically random (24 bytes base64 = ~32 chars). If a workspace
 * owner leaks the URL, regenerating the secret in the UI invalidates the
 * old URL.
 *
 * Middleware: this route is excluded from the Supabase session middleware
 * via the matcher in src/middleware.ts. Re-adding the matcher would break
 * external consumers because they don't have a session cookie.
 *
 * Caching: Cache-Control set to 1h. Vercel edge + the CDN in front of it
 * will serve repeat polls from cache, so the DB hit is bounded to ~once an
 * hour per unique ?store= combination. Big workspaces with 10k+ products
 * still render in seconds since the existing getProducts() helper paginates.
 *
 * On invalid token / missing workspace / soft-deleted workspace: return 404
 * (not 401/403) so external scanners can't enumerate workspace IDs.
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderGoogleMerchantFeed } from "@/lib/feed/google-merchant";
import type { Product } from "@/types";

// Same UUID regex used by other routes in this codebase.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 1 hour. Google Merchant typically polls daily — this just protects the DB
// against accidental rapid-fire polls.
const CACHE_SECONDS = 3600;

const PRODUCT_LIST_COLUMNS =
  "id, store_id, hash_id, cleaned_title, title, handle, sku, brand, price, original_price, discount_percentage, currency, in_stock, product_url, image_url, description, description_de, description_en, updated_at, is_published, is_featured, is_slider, ai_category, affiliate_link, ai_shipping_data";

const PAGE_SIZE = 1000;

function notFound() {
  // Plain text 404 — no body content, no info leak about whether the
  // workspace exists.
  return new NextResponse("Not Found", {
    status: 404,
    headers: { "Content-Type": "text/plain" },
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ wsId: string; token: string }> }
): Promise<Response> {
  const { wsId, token } = await params;

  // The token comes in the URL with a `.xml` suffix so the URL has the
  // expected file extension for consumers. Strip it before validating.
  const rawToken = token.endsWith(".xml") ? token.slice(0, -4) : token;

  // Basic input validation — abort early without hitting the DB.
  if (!UUID_RE.test(wsId)) return notFound();
  if (!rawToken || rawToken.length < 16) return notFound();

  const supabase = createAdminClient();

  // 1) Look up the workspace + its feed_secret. Soft-deleted workspaces are
  //    treated as if they don't exist (via deleted_at filter).
  const { data: workspace, error: wsErr } = await supabase
    .from("workspaces")
    .select("id, name, feed_secret")
    .eq("id", wsId)
    .is("deleted_at", null)
    .maybeSingle();

  if (wsErr || !workspace) return notFound();
  if (!workspace.feed_secret || workspace.feed_secret !== rawToken) {
    return notFound();
  }

  // 2) Resolve the workspace's stores. The route always operates within
  //    the workspace boundary — even if someone passes a ?store= UUID
  //    belonging to a different workspace, the intersection here drops it.
  const { data: storeRows, error: storesErr } = await supabase
    .from("stores")
    .select("id, name, url")
    .eq("workspace_id", wsId)
    .is("deleted_at", null);

  if (storesErr) {
    // DB problem on our side — return 500 so the consumer retries.
    return new NextResponse("Service temporarily unavailable", { status: 500 });
  }

  const allowedStoreIds = new Set((storeRows ?? []).map((s) => s.id));

  // 3) Apply optional ?store= filter. Repeated query params are supported.
  //    Any UUID not in the workspace's allowed set is silently dropped.
  const url = new URL(req.url);
  const requestedStoreParams = url.searchParams.getAll("store");
  let filteredStoreIds: string[];
  if (requestedStoreParams.length === 0) {
    filteredStoreIds = Array.from(allowedStoreIds);
  } else {
    filteredStoreIds = requestedStoreParams.filter((id) => allowedStoreIds.has(id));
  }

  // 4) Empty result → empty feed. Still a 200 with a valid XML doc so the
  //    consumer doesn't error out (Google Merchant will just show 0 items).
  if (filteredStoreIds.length === 0) {
    const { xml } = renderGoogleMerchantFeed([], {
      title: workspace.name || "Marketforce feed",
      link: "https://ai.selecdoo.com",
      description: "Product feed from Marketforce",
    });
    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
      },
    });
  }

  // 5) Fetch products in pages of 1000 (Supabase per-request cap).
  //    Mirrors the existing getProducts() helper but works with an explicit
  //    store-id list rather than implicitly fetching all workspace stores.
  const allProducts: Product[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_LIST_COLUMNS)
      .in("store_id", filteredStoreIds)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error(`[feed] page fetch failed at offset=${offset}:`, error.message);
      return new NextResponse("Service temporarily unavailable", { status: 500 });
    }
    if (!data || data.length === 0) break;

    for (const row of data) {
      // The DB row shape is wider than the typed Product (extra v2 columns).
      // Pass through fields the renderer reads. Type assertion is safe here —
      // we only access well-defined columns in the renderer.
      allProducts.push(row as unknown as Product);
    }

    if (data.length < PAGE_SIZE) break;
  }

  // 6) Render and return.
  const { xml, itemCount, skippedCount } = renderGoogleMerchantFeed(allProducts, {
    title: workspace.name || "Marketforce feed",
    link: "https://ai.selecdoo.com",
    description: "Product feed from Marketforce",
  });

  if (skippedCount > 0) {
    console.log(
      `[feed] workspace=${wsId} rendered=${itemCount} skipped=${skippedCount} (missing required fields like image/link/price)`
    );
  }

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
    },
  });
}
