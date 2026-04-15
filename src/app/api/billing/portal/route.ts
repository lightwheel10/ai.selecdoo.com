/**
 * POST /api/billing/portal
 *
 * Creates a Stripe Customer Portal session for the authenticated
 * workspace and returns its hosted-page URL. The caller redirects
 * the browser there; Stripe handles everything (invoice list, card
 * update, cancel subscription, VAT id, etc.) and redirects back to
 * our dashboard on close.
 *
 * Body: {} (none — workspace comes from auth context)
 *
 * Response (200):
 *   { url: string }             — redirect here
 *   { url, devBypass: true }    — dev bypass skips Stripe entirely
 *
 * Access:
 *   - Admin-only. Non-admin workspace members shouldn't see
 *     invoices or cancel the admin's subscription.
 *
 * Preconditions:
 *   - Workspace must have a stripe_customer_id. If the workspace
 *     hasn't subscribed yet, there's nothing to manage in the portal —
 *     returns 400 with a "start a subscription first" hint.
 *
 * Customer Portal features (invoice access, cancel, card update,
 * plan switch) are configured in the Stripe dashboard at
 * Settings → Billing → Customer portal. Nothing to configure here.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import { getAuthContext } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/auth/roles";

// Body is empty — cap tight.
const MAX_BODY_SIZE = 256;

// Where Stripe sends the user after they close the portal.
// Fits the existing settings-page tab convention (?tab=billing).
// The Billing tab (P3.2) doesn't exist yet; until then the tab
// param falls back to the default "team" tab via settings-page.tsx.
const RETURN_PATH = "/dashboard/settings?tab=billing";

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

    const origin = new URL(req.url).origin;

    // Dev bypass: no Stripe Customer exists for a fake workspace.
    // Route the user straight to the (future) billing tab so the
    // "Manage Billing" button still gives feedback in dev mode.
    if (ctx.isDevBypass) {
      return NextResponse.json({
        url: `${origin}${RETURN_PATH}`,
        devBypass: true,
      });
    }

    const supabase = createAdminClient();

    const { data: sub } = await supabase
      .from("workspace_subscriptions")
      .select("stripe_customer_id")
      .eq("workspace_id", ctx.workspaceId)
      .maybeSingle();

    if (!sub?.stripe_customer_id) {
      // No Stripe Customer on record — workspace hasn't subscribed
      // yet. Nothing to show in the portal.
      return NextResponse.json(
        {
          error:
            "No billing details yet. Start a subscription before managing billing.",
        },
        { status: 400 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}${RETURN_PATH}`,
      locale: "auto",
    });

    if (!session.url) {
      console.error("[billing/portal] Stripe returned a session without a url");
      return NextResponse.json(
        { error: "Stripe returned no URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[billing/portal] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
