/**
 * Workspace creation API.
 *
 * POST: creates the workspace + its creator + (optional) first store.
 * This endpoint stops short of starting a subscription — the caller
 * follows up with POST /api/billing/checkout to redirect the user to
 * Stripe's hosted checkout. The subscription row is later written
 * by the webhook handler at /api/billing/webhook when Stripe fires
 * checkout.session.completed.
 *
 *   1. Upsert v2.user_profiles    (first_name, last_name, country)
 *   2. Insert v2.workspaces        (name + slug, created_by = user.id)
 *   3. Insert v2.workspace_members (user_id, role = 'admin')
 *   4. (optional) Insert v2.stores + v2.monitoring_configs when a
 *      storeUrl was provided in signup step 3, then kick off the
 *      Apify product import via next/server `after()` so the response
 *      returns fast.
 *
 * Failures at step 3 roll back step 2 (delete workspace). Step 1 is
 * an idempotent upsert so we leave it in place on any failure. Step 4
 * is best-effort — a failed store insert (e.g. URL collision against
 * the global unique constraint) does NOT roll back the workspace;
 * the user can add stores manually later from the dashboard.
 *
 * No card data is ever received here — the card form is on Stripe's
 * hosted page. workspace_subscriptions is NOT written by this route;
 * that's the webhook handler's job so there's one source of truth.
 *
 * Per the D2 decision, one trial per workspace (not per user), so the
 * v2.user_profiles.first_trial_started_at column is no longer read
 * or written by signup. The column stays (unused) until a later
 * migration drops it.
 */

import { NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isValidCountryCode } from "@/lib/countries";
import { triggerScrape } from "@/lib/scrape-trigger";

const MAX_BODY_SIZE = 4_096;

function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || "workspace"
  );
}

// ─── Store URL validation ───
// Duplicated from /api/stores/route.ts so this route has no hard
// dependency on that file. Keep the two in sync — if you tighten rules
// in either, update the other.
const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
];

function validateStoreUrl(
  raw: string
): { ok: true; url: string; name: string } | { ok: false; error: string } {
  let normalized = raw.trim();
  if (!normalized.startsWith("http")) {
    normalized = `https://${normalized}`;
  }
  normalized = normalized.replace(/\/+$/, "");

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return { ok: false, error: "Invalid store URL format" };
  }
  if (
    parsed.protocol !== "https:" &&
    !(process.env.NODE_ENV === "development" && parsed.protocol === "http:")
  ) {
    return { ok: false, error: "Store URL must use HTTPS" };
  }
  const hostname = parsed.hostname;
  if (PRIVATE_IP_RANGES.some((r) => r.test(hostname))) {
    return { ok: false, error: "Private IP addresses are not allowed" };
  }
  if (hostname === "localhost" || hostname === "[::1]") {
    return { ok: false, error: "Localhost URLs are not allowed" };
  }
  if (!hostname.includes(".")) {
    return { ok: false, error: "Invalid hostname in store URL" };
  }

  // Derive a display name from the hostname (e.g. "www.shop.com" → "Shop")
  const bare = hostname.replace(/^www\./, "").split(".")[0];
  const name = bare.charAt(0).toUpperCase() + bare.slice(1);
  return { ok: true, url: normalized, name };
}

export async function POST(req: Request) {
  try {
    const contentLength = parseInt(
      req.headers.get("content-length") ?? "0",
      10
    );
    if (contentLength > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: "Request body too large" },
        { status: 413 }
      );
    }

    const supabaseAuth = await createClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: per-user workspace creation limit (carried over). Still
    // unbounded — low priority since signup UI only triggers one, but
    // direct API calls are unbounded.

    const body = await req.json();
    const firstName =
      typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName =
      typeof body.lastName === "string" ? body.lastName.trim() : "";
    const country = typeof body.country === "string" ? body.country : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const rawStoreUrl =
      typeof body.storeUrl === "string" ? body.storeUrl.trim() : "";

    if (firstName.length < 1 || firstName.length > 100) {
      return NextResponse.json(
        { error: "First name is required" },
        { status: 400 }
      );
    }
    if (lastName.length < 1 || lastName.length > 100) {
      return NextResponse.json(
        { error: "Last name is required" },
        { status: 400 }
      );
    }
    if (!isValidCountryCode(country)) {
      return NextResponse.json(
        { error: "Invalid country code" },
        { status: 400 }
      );
    }
    if (name.length < 2) {
      return NextResponse.json(
        { error: "Workspace name must be at least 2 characters" },
        { status: 400 }
      );
    }
    if (name.length > 100) {
      return NextResponse.json(
        { error: "Workspace name must be under 100 characters" },
        { status: 400 }
      );
    }

    // Validate optional storeUrl up front so we fail fast before any
    // DB writes happen. When present and invalid, return 400.
    let validatedStore: { url: string; name: string } | null = null;
    if (rawStoreUrl.length > 0) {
      const v = validateStoreUrl(rawStoreUrl);
      if (!v.ok) {
        return NextResponse.json({ error: v.error }, { status: 400 });
      }
      validatedStore = { url: v.url, name: v.name };
    }

    const supabase = createAdminClient();

    // ── 1. Upsert user_profile ──
    const { error: profileErr } = await supabase
      .from("user_profiles")
      .upsert(
        {
          user_id: user.id,
          first_name: firstName,
          last_name: lastName,
          country,
        },
        { onConflict: "user_id" }
      );

    if (profileErr) {
      console.error("user_profiles upsert error:", profileErr);
      return NextResponse.json(
        { error: "Failed to save profile" },
        { status: 500 }
      );
    }

    // ── 2. Create workspace (unique slug with random suffix on collision) ──
    let slug = generateSlug(name);
    const { data: existing } = await supabase
      .from("workspaces")
      .select("id")
      .eq("slug", slug)
      .is("deleted_at", null)
      .single();

    if (existing) {
      const suffix = Math.random().toString(36).slice(2, 6);
      slug = `${slug}-${suffix}`;
    }

    const { data: workspace, error: createErr } = await supabase
      .from("workspaces")
      .insert({
        name,
        slug,
        created_by: user.id,
      })
      .select("id, name, slug")
      .single();

    if (createErr || !workspace) {
      console.error("Workspace creation error:", createErr);
      return NextResponse.json(
        { error: "Failed to create workspace" },
        { status: 500 }
      );
    }

    // ── 3. Add creator as admin member ──
    const { error: memberErr } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: "admin",
      });

    if (memberErr) {
      console.error("workspace_members insert error:", memberErr);
      await supabase.from("workspaces").delete().eq("id", workspace.id);
      return NextResponse.json(
        { error: "Failed to create workspace membership" },
        { status: 500 }
      );
    }

    // ── 4. (optional) Create the user's first store + monitoring config ──
    // Best-effort: a failure here (e.g. unique-URL collision) does NOT
    // roll back the workspace. The user still has a valid workspace and
    // can add stores manually from the dashboard.
    let firstStoreId: string | null = null;
    if (validatedStore) {
      const { data: newStore, error: storeErr } = await supabase
        .from("stores")
        .insert({
          url: validatedStore.url,
          name: validatedStore.name,
          platform: "shopify", // triggerScrape auto-detects platform on first run
          status: "active",
          user_id: user.id,
          workspace_id: workspace.id,
        })
        .select("id")
        .single();

      if (storeErr || !newStore) {
        console.warn(
          "Signup store insert skipped — continuing without first store:",
          storeErr?.message
        );
      } else {
        firstStoreId = newStore.id;

        // Match /api/stores/route.ts: 72h monitoring interval.
        const nextCheck = new Date();
        nextCheck.setHours(nextCheck.getHours() + 72);
        const { error: monErr } = await supabase
          .from("monitoring_configs")
          .insert({
            store_id: newStore.id,
            enabled: true,
            check_interval_hours: 72,
            next_check_at: nextCheck.toISOString(),
          });
        if (monErr) {
          console.warn(
            "Signup monitoring_config insert failed (store created):",
            monErr.message
          );
        }
      }
    }

    // ── Async: trigger the Apify import after the response returns ──
    // Same pattern as /api/stores/route.ts — keeps the sync path fast.
    if (firstStoreId && validatedStore) {
      const storePayload = {
        id: firstStoreId,
        url: validatedStore.url,
        name: validatedStore.name,
        platform: "shopify" as const,
        last_scraped_at: null,
      };
      after(async () => {
        try {
          const adminClient = createAdminClient();
          await triggerScrape(adminClient, storePayload);
        } catch (err) {
          console.error(
            "Signup import trigger failed (store was still created):",
            err
          );
        }
      });
    }

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
      },
      store: firstStoreId ? { id: firstStoreId } : null,
    });
  } catch (err) {
    console.error("Workspace creation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
