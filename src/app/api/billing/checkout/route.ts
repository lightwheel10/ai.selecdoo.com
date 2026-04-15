/**
 * POST /api/billing/checkout
 *
 * Creates a Stripe Checkout Session for a workspace's paid subscription
 * and returns its hosted-page URL. The caller redirects the browser
 * there; the user enters their card on Stripe; Stripe fires the
 * `checkout.session.completed` webhook which writes the real
 * subscription state into v2.workspace_subscriptions.
 *
 * Body:
 *   { plan: "pro" | "business" }
 *
 * Response (200):
 *   { url: string }             — redirect the browser here
 *   { url, devBypass: true }    — when DEV_BYPASS=true, skips Stripe
 *                                  entirely and sends the caller to
 *                                  /dashboard directly
 *
 * Access:
 *   - Admin-only (role=admin or admin:access permission). Non-admin
 *     workspace members shouldn't be able to trigger charges against
 *     the admin's card.
 *   - Workspace must exist (resolved via getAuthContext cookie/default).
 *
 * Side effects:
 *   - Stripe Customer is created (or reused if the workspace already
 *     has one from a prior attempt). idempotencyKey scoped per-workspace
 *     so retries don't duplicate.
 *   - v2.workspace_subscriptions row is upserted with:
 *       plan='trial', status='incomplete', stripe_customer_id, intended_plan
 *     A pre-existing row with status trialing/active is left alone and
 *     the request is rejected with 409 (use /api/billing/portal to
 *     change plan).
 *   - No Subscription in Stripe yet — Checkout creates it on success.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import { getAuthContext } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/auth/roles";

// Body is tiny — just { plan }. Anything larger is suspect.
const MAX_BODY_SIZE = 1024;
const TRIAL_DAYS = 7;

export async function POST(req: Request) {
  try {
    const cl = parseInt(req.headers.get("content-length") ?? "0", 10);
    if (cl > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: "Request body too large" },
        { status: 413 }
      );
    }

    const ctx = await getAuthContext();
    if (!ctx.user && !ctx.isDevBypass) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!ctx.workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }
    if (!canAccessAdmin({ role: ctx.role, permissions: ctx.permissions })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const plan = body?.plan;
    if (plan !== "pro" && plan !== "business") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Map plan → Stripe Price id. Env vars are set per-mode
    // (test vs live) so the same code works in both.
    const priceId =
      plan === "pro"
        ? process.env.STRIPE_PRICE_PRO
        : process.env.STRIPE_PRICE_BUSINESS;
    if (!priceId) {
      console.error(
        `[billing/checkout] Missing env STRIPE_PRICE_${String(plan).toUpperCase()}`
      );
      return NextResponse.json(
        { error: "Billing misconfigured" },
        { status: 500 }
      );
    }

    // Dev bypass: skip Stripe entirely. Dev users proceed straight to
    // dashboard without a real subscription. Documented behavior —
    // billing can only be exercised end-to-end with DEV_BYPASS off.
    if (ctx.isDevBypass) {
      const origin = new URL(req.url).origin;
      return NextResponse.json({
        url: `${origin}/dashboard`,
        devBypass: true,
      });
    }

    // Past the dev-bypass check, user is guaranteed non-null.
    const user = ctx.user!;
    if (!user.email) {
      return NextResponse.json(
        { error: "User account has no email" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Workspace name is used as the Stripe Customer display name. Looking
    // up via admin client (RLS bypass) is fine — we've already verified
    // membership + admin role via getAuthContext.
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id, name")
      .eq("id", ctx.workspaceId)
      .is("deleted_at", null)
      .single();
    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Reuse an existing Stripe Customer if one was created on a prior
    // (abandoned) checkout attempt. Prevents orphan customers.
    const { data: existingSub } = await supabase
      .from("workspace_subscriptions")
      .select("stripe_customer_id, stripe_subscription_id, status")
      .eq("workspace_id", ctx.workspaceId)
      .maybeSingle();

    // If a Subscription is already live in Stripe for this workspace,
    // block a fresh Checkout. Plan changes go through the Customer
    // Portal (/api/billing/portal) so Stripe can handle proration.
    if (
      existingSub?.stripe_subscription_id &&
      (existingSub.status === "trialing" || existingSub.status === "active")
    ) {
      return NextResponse.json(
        {
          error:
            "This workspace already has an active subscription. Use the billing portal to change plan.",
        },
        { status: 409 }
      );
    }

    // Find-or-create Stripe Customer. Idempotency key is per-workspace
    // so a retried request on a fresh workspace can't create two
    // customers for the same workspace.
    let stripeCustomerId: string | null =
      existingSub?.stripe_customer_id ?? null;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create(
        {
          email: user.email,
          name: workspace.name,
          metadata: {
            workspace_id: workspace.id,
            user_id: user.id,
          },
        },
        { idempotencyKey: `workspace-${workspace.id}-customer` }
      );
      stripeCustomerId = customer.id;
    }

    // Upsert the subscription row with the Customer id + intended plan.
    // Preserve a pre-existing trialing/active status (the 409 above
    // means that's already a no-op path); otherwise move to 'incomplete'
    // until the webhook confirms Checkout succeeded.
    const safeStatus =
      existingSub?.status === "trialing" || existingSub?.status === "active"
        ? existingSub.status
        : "incomplete";
    const { error: upsertErr } = await supabase
      .from("workspace_subscriptions")
      .upsert(
        {
          workspace_id: ctx.workspaceId,
          plan: "trial",
          status: safeStatus,
          intended_plan: plan,
          stripe_customer_id: stripeCustomerId,
        },
        { onConflict: "workspace_id" }
      );
    if (upsertErr) {
      console.error(
        "[billing/checkout] workspace_subscriptions upsert error:",
        upsertErr
      );
      return NextResponse.json(
        { error: "Failed to record subscription" },
        { status: 500 }
      );
    }

    // Create the Checkout Session. Everything billing-sensitive
    // (card, tax id, billing address, 3DS, localization) is handled
    // by Stripe's hosted page.
    const origin = new URL(req.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: {
          workspace_id: workspace.id,
          intended_plan: plan,
        },
      },
      // client_reference_id is echoed on the session.completed event —
      // gives the webhook a primary key fallback if metadata is lost.
      client_reference_id: workspace.id,
      success_url: `${origin}/signup/complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/signup?plan=${plan}`,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      // Back-fill the Customer object with the address + name the user
      // enters on the Checkout page. Needed for accurate invoices /
      // future Stripe Tax (once enabled in the account).
      customer_update: {
        address: "auto",
        name: "auto",
      },
      // TODO: enable automatic_tax once Stripe Tax is turned on for
      //       the account (Settings → Tax → Stripe Tax).
      // automatic_tax: { enabled: true },
      metadata: {
        workspace_id: workspace.id,
        intended_plan: plan,
      },
    });

    if (!session.url) {
      console.error("[billing/checkout] Stripe returned a session without a url");
      return NextResponse.json(
        { error: "Stripe returned no URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    // Don't leak raw Stripe error messages to the client; they can
    // include internal ids. Log server-side, return generic 500.
    console.error("[billing/checkout] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
