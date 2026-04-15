/**
 * GET /api/billing/status
 *
 * Returns the current workspace's subscription state so the UI can
 * render the trial banner, billing tab, and gate paid features
 * client-side. Read-only, cheap, safe to poll.
 *
 * Response shape:
 *   {
 *     hasSubscription:     boolean
 *     plan:                "trial" | "pro" | "business" | "canceled" | null
 *     status:              Stripe-style status string | null
 *     intendedPlan:        "pro" | "business" | null
 *     trialStartsAt:       ISO string | null
 *     trialEndsAt:         ISO string | null
 *     currentPeriodStart:  ISO string | null
 *     currentPeriodEnd:    ISO string | null
 *   }
 *
 * Access:
 *   - Any authenticated member of the workspace. Non-admins need to
 *     see "5 days left in trial" on their dashboard too; there's
 *     nothing sensitive here (no card digits, no invoice amounts).
 *   - Customer id / subscription id are intentionally NOT included —
 *     the billing portal route uses those server-side, the UI doesn't
 *     need them.
 *
 * Dev bypass returns a synthetic "active / pro" state so UIs that
 * gate on subscription status don't show a paywall in local dev.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth/session";

export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user && !ctx.isDevBypass) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!ctx.workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    // Dev bypass: synthesize an "active pro" state so the UI renders
    // as if fully paid. We never hit the DB in this branch.
    if (ctx.isDevBypass) {
      return NextResponse.json({
        hasSubscription: true,
        plan: "pro",
        status: "active",
        intendedPlan: "pro",
        trialStartsAt: null,
        trialEndsAt: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        devBypass: true,
      });
    }

    const supabase = createAdminClient();

    const { data: sub, error } = await supabase
      .from("workspace_subscriptions")
      .select(
        "plan, status, intended_plan, trial_starts_at, trial_ends_at, current_period_start, current_period_end"
      )
      .eq("workspace_id", ctx.workspaceId)
      .maybeSingle();

    if (error) {
      console.error("[billing/status] DB error:", error);
      return NextResponse.json(
        { error: "Failed to fetch subscription" },
        { status: 500 }
      );
    }

    if (!sub) {
      // No row yet — freshly created workspace pre-checkout. UI treats
      // this as "no subscription" and prompts the user to subscribe.
      return NextResponse.json({
        hasSubscription: false,
        plan: null,
        status: null,
        intendedPlan: null,
        trialStartsAt: null,
        trialEndsAt: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
      });
    }

    return NextResponse.json({
      hasSubscription: true,
      plan: sub.plan,
      status: sub.status,
      intendedPlan: sub.intended_plan,
      trialStartsAt: sub.trial_starts_at,
      trialEndsAt: sub.trial_ends_at,
      currentPeriodStart: sub.current_period_start,
      currentPeriodEnd: sub.current_period_end,
    });
  } catch (err) {
    console.error("[billing/status] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
