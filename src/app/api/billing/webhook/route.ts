/**
 * POST /api/billing/webhook
 *
 * Stripe → us. Verifies the signature, dedupes events, and syncs
 * workspace_subscriptions state to Stripe's version of reality.
 *
 * What we handle:
 *   checkout.session.completed        first time a workspace starts paying
 *   customer.subscription.created     safety net (fires alongside the above)
 *   customer.subscription.updated     status / plan / period changes
 *   customer.subscription.deleted     workspace cancels
 *   customer.subscription.trial_will_end  3 days before trial end (email hook)
 *   invoice.payment_failed            card declined → status=past_due
 *   invoice.paid                      ack success (no-op; updated via sub event)
 *
 * Anything else is logged as 'ignored' in v2.stripe_events and 200-acked.
 *
 * Safety rails:
 *   - Raw body via req.text() — Stripe signature verification depends
 *     on byte-exact payload; DO NOT use req.json() here.
 *   - stripe.webhooks.constructEventAsync — the async variant works
 *     everywhere (Node + Edge) and doesn't warn about deprecated
 *     platforms; we stick to Node runtime anyway because the Supabase
 *     admin client needs it.
 *   - Dedup via v2.stripe_events.id PK — Stripe retries up to 3 days.
 *     If we've already processed an id, ack 200 immediately.
 *   - Processing errors → 500 so Stripe retries with exponential
 *     backoff. Middleware already excludes /api/billing/*.
 */

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 30; // webhook processing should be fast

type AdminSupabase = ReturnType<typeof createAdminClient>;

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    // Don't leak this to the client; it's our problem. Return 500 so
    // Stripe retries (by which time we'll hopefully have fixed env).
    console.error("[billing/webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  // Raw body — MUST NOT be parsed before signature verification.
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret
    );
  } catch (err) {
    // Signature failure or malformed payload. 400, don't retry —
    // the retry would have the same bad signature.
    console.error(
      "[billing/webhook] signature verification failed:",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Dedup: if we've already decided about this event, ack and stop.
  const { data: existing } = await supabase
    .from("stripe_events")
    .select("status")
    .eq("id", event.id)
    .maybeSingle();

  if (existing?.status === "processed" || existing?.status === "ignored") {
    return NextResponse.json({ received: true, dedup: true });
  }

  // Extract workspace_id best-effort for indexing/debugging.
  const workspaceId = extractWorkspaceId(event);

  // Record receipt. Upsert so a retry after a prior 'failed' /
  // 'received' row just resets status to 'received'.
  const { error: logErr } = await supabase.from("stripe_events").upsert(
    {
      id: event.id,
      event_type: event.type,
      workspace_id: workspaceId,
      data: event as unknown as Record<string, unknown>,
      status: "received",
      error_message: null,
      processed_at: null,
    },
    { onConflict: "id" }
  );
  if (logErr) {
    // If we can't even log the event, something's badly wrong. Return
    // 500 so Stripe retries — retrying is safer than silent loss.
    console.error("[billing/webhook] stripe_events upsert error:", logErr);
    return NextResponse.json(
      { error: "Failed to record event" },
      { status: 500 }
    );
  }

  // Route + process.
  try {
    const outcome = await routeEvent(supabase, event);

    await supabase
      .from("stripe_events")
      .update({
        status: outcome,
        processed_at: new Date().toISOString(),
      })
      .eq("id", event.id);

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[billing/webhook] processing failed (${event.type} ${event.id}):`,
      err
    );
    await supabase
      .from("stripe_events")
      .update({
        status: "failed",
        error_message: message,
        processed_at: new Date().toISOString(),
      })
      .eq("id", event.id);
    // 500 → Stripe retries with exponential backoff.
    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 }
    );
  }
}

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

/**
 * Pulls a workspace_id out of the event when one is encoded. Used for
 * the stripe_events.workspace_id column (indexing, not authorization).
 */
function extractWorkspaceId(event: Stripe.Event): string | null {
  // event.data.object is a giant union of 80+ Stripe types; we treat
  // it as a generic record for this best-effort extraction since not
  // every object type has `metadata` or `client_reference_id`.
  const obj = event.data.object as unknown as Record<string, unknown>;

  const metadata = (obj.metadata ?? {}) as Record<string, string>;
  if (typeof metadata.workspace_id === "string") return metadata.workspace_id;

  if (
    "client_reference_id" in obj &&
    typeof obj.client_reference_id === "string"
  ) {
    return obj.client_reference_id as string;
  }

  return null;
}

/** Returns the subscription-items' shared current_period_start/end
    (they all share the same billing cycle in our simple one-item
    setup). Returns [null, null] if items array is empty (edge case
    for pending or malformed subs). */
function getPeriodBounds(
  sub: Stripe.Subscription
): { start: string | null; end: string | null } {
  const item = sub.items?.data?.[0];
  if (!item) return { start: null, end: null };
  return {
    start: new Date(item.current_period_start * 1000).toISOString(),
    end: new Date(item.current_period_end * 1000).toISOString(),
  };
}

/**
 * Derives our internal `plan` value from Stripe's subscription.status
 * plus the workspace's intended_plan.
 *
 *   Stripe status    → our plan
 *   trialing          → 'trial'
 *   active            → intended_plan (pro | business)
 *   past_due          → keep existing plan (subscription paused but
 *                       still associated with tier)
 *   canceled | unpaid | incomplete_expired → 'canceled'
 */
function mapStatusToPlan(
  stripeStatus: Stripe.Subscription.Status,
  intendedPlan: string | null | undefined,
  currentPlan: string | null | undefined
): string {
  if (stripeStatus === "trialing") return "trial";
  if (stripeStatus === "active") return intendedPlan ?? "pro";
  if (
    stripeStatus === "canceled" ||
    stripeStatus === "unpaid" ||
    stripeStatus === "incomplete_expired"
  ) {
    return "canceled";
  }
  // past_due / incomplete / paused — keep existing if set, fallback to trial
  return currentPlan ?? "trial";
}

/**
 * Routes a single event to its handler. Returns 'processed' when the
 * event matched a handler and the handler completed, 'ignored' when
 * the event type is not one we care about. Throws on handler errors
 * so the outer catch can log + 500 for retry.
 */
async function routeEvent(
  supabase: AdminSupabase,
  event: Stripe.Event
): Promise<"processed" | "ignored"> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(
        supabase,
        event.data.object as Stripe.Checkout.Session
      );
      return "processed";

    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionChange(
        supabase,
        event.data.object as Stripe.Subscription
      );
      return "processed";

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(
        supabase,
        event.data.object as Stripe.Subscription
      );
      return "processed";

    case "customer.subscription.trial_will_end":
      // Informational only. Future: trigger an email / notification.
      console.log(
        "[billing/webhook] trial_will_end for subscription",
        (event.data.object as Stripe.Subscription).id
      );
      return "processed";

    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(
        supabase,
        event.data.object as Stripe.Invoice
      );
      return "processed";

    case "invoice.paid":
      // subscription.updated handles the actual state change back to
      // 'active'. This handler is a no-op logger.
      return "processed";

    default:
      return "ignored";
  }
}

/* ─────────────────────────────────────────────
   Per-event handlers
   ───────────────────────────────────────────── */

async function handleCheckoutCompleted(
  supabase: AdminSupabase,
  session: Stripe.Checkout.Session
): Promise<void> {
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;
  const workspaceId =
    session.client_reference_id ?? session.metadata?.workspace_id ?? null;

  if (!subscriptionId || !customerId || !workspaceId) {
    throw new Error(
      `checkout.session.completed missing fields: sub=${subscriptionId} cust=${customerId} ws=${workspaceId}`
    );
  }

  // Fetch the fresh subscription so we get trial dates + items in
  // one round trip. session.subscription is usually just an id.
  const sub = await stripe.subscriptions.retrieve(subscriptionId);

  const { data: existing } = await supabase
    .from("workspace_subscriptions")
    .select("intended_plan, plan")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const { start, end } = getPeriodBounds(sub);
  const plan = mapStatusToPlan(
    sub.status,
    existing?.intended_plan ?? session.metadata?.intended_plan,
    existing?.plan
  );

  const { error } = await supabase
    .from("workspace_subscriptions")
    .upsert(
      {
        workspace_id: workspaceId,
        plan,
        status: sub.status,
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        stripe_price_id: sub.items.data[0]?.price.id ?? null,
        trial_starts_at: sub.trial_start
          ? new Date(sub.trial_start * 1000).toISOString()
          : null,
        trial_ends_at: sub.trial_end
          ? new Date(sub.trial_end * 1000).toISOString()
          : null,
        current_period_start: start,
        current_period_end: end,
      },
      { onConflict: "workspace_id" }
    );
  if (error) throw new Error(`workspace_subscriptions upsert: ${error.message}`);
}

async function handleSubscriptionChange(
  supabase: AdminSupabase,
  sub: Stripe.Subscription
): Promise<void> {
  const workspaceId = await resolveWorkspaceFromSubscription(supabase, sub);
  if (!workspaceId) {
    // No row yet — common race: subscription.created arrives before
    // checkout.session.completed. Skip silently; the session handler
    // will write everything a moment later.
    console.log(
      `[billing/webhook] subscription ${sub.id} has no matching workspace yet — skipping`
    );
    return;
  }

  const { data: existing } = await supabase
    .from("workspace_subscriptions")
    .select("intended_plan, plan")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const { start, end } = getPeriodBounds(sub);
  const plan = mapStatusToPlan(
    sub.status,
    existing?.intended_plan ?? sub.metadata?.intended_plan,
    existing?.plan
  );

  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const { error } = await supabase
    .from("workspace_subscriptions")
    .update({
      plan,
      status: sub.status,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      stripe_price_id: sub.items.data[0]?.price.id ?? null,
      trial_starts_at: sub.trial_start
        ? new Date(sub.trial_start * 1000).toISOString()
        : null,
      trial_ends_at: sub.trial_end
        ? new Date(sub.trial_end * 1000).toISOString()
        : null,
      current_period_start: start,
      current_period_end: end,
    })
    .eq("workspace_id", workspaceId);
  if (error) throw new Error(`workspace_subscriptions update: ${error.message}`);
}

async function handleSubscriptionDeleted(
  supabase: AdminSupabase,
  sub: Stripe.Subscription
): Promise<void> {
  const { error } = await supabase
    .from("workspace_subscriptions")
    .update({
      plan: "canceled",
      status: "canceled",
    })
    .eq("stripe_subscription_id", sub.id);
  if (error) throw new Error(`workspace_subscriptions cancel: ${error.message}`);
}

async function handleInvoicePaymentFailed(
  supabase: AdminSupabase,
  inv: Stripe.Invoice
): Promise<void> {
  // In 2026-03-25.dahlia, invoice.subscription moved to
  // invoice.parent.subscription_details.subscription.
  const subRef = inv.parent?.subscription_details?.subscription;
  const subscriptionId = typeof subRef === "string" ? subRef : subRef?.id;
  if (!subscriptionId) {
    // One-off invoice, not subscription-bound. Ignore.
    return;
  }

  const { error } = await supabase
    .from("workspace_subscriptions")
    .update({ status: "past_due" })
    .eq("stripe_subscription_id", subscriptionId);
  if (error) throw new Error(`workspace_subscriptions past_due: ${error.message}`);
}

/**
 * Resolve our workspace_id for a Stripe Subscription. Metadata is the
 * cheapest path (we write it on Checkout Session creation), but older
 * subscriptions might lack it — fall back to customer id lookup.
 */
async function resolveWorkspaceFromSubscription(
  supabase: AdminSupabase,
  sub: Stripe.Subscription
): Promise<string | null> {
  const metaWs = sub.metadata?.workspace_id;
  if (typeof metaWs === "string" && metaWs.length > 0) return metaWs;

  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const { data } = await supabase
    .from("workspace_subscriptions")
    .select("workspace_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.workspace_id ?? null;
}
