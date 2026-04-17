/**
 * GET /api/billing/status
 *
 * Returns the current workspace's subscription state + usage counts +
 * plan limits so the billing tab can render meters ("3 of 5 stores
 * used") and the enforcement layer can check caps.
 *
 * Response shape:
 *   {
 *     hasSubscription, plan, status, intendedPlan,
 *     trialStartsAt, trialEndsAt, currentPeriodStart, currentPeriodEnd,
 *     usage:  { stores, products, generationsThisMonth, checksThisMonth },
 *     limits: { maxStores, maxProducts, maxGenerationsPerMonth, maxChecksPerMonth }
 *   }
 *
 * `usage` and `limits` are null when there's no subscription row.
 * `limits` is null when plan_limits has no row for the current plan
 * (e.g., plan='canceled' which doesn't exist in plan_limits).
 *
 * Access: any authenticated workspace member (read-only, no secrets).
 * Dev bypass: synthetic active/pro + zeroed usage + Pro limits.
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
        usage: {
          stores: 0,
          products: 0,
          generationsThisMonth: 0,
          checksThisMonth: 0,
        },
        limits: {
          maxStores: 5,
          maxProducts: 250,
          maxGenerationsPerMonth: 500,
          maxChecksPerMonth: 2,
        },
        devBypass: true,
      });
    }

    const supabase = createAdminClient();

    // ── Phase 1: subscription + store IDs (parallel) ──
    const [subResult, storeResult] = await Promise.all([
      supabase
        .from("workspace_subscriptions")
        .select(
          "plan, status, intended_plan, trial_starts_at, trial_ends_at, current_period_start, current_period_end"
        )
        .eq("workspace_id", ctx.workspaceId)
        .maybeSingle(),
      supabase
        .from("stores")
        .select("id", { count: "exact" })
        .eq("workspace_id", ctx.workspaceId)
        .is("deleted_at", null),
    ]);

    if (subResult.error) {
      console.error("[billing/status] subscription query error:", subResult.error);
      return NextResponse.json(
        { error: "Failed to fetch subscription" },
        { status: 500 }
      );
    }

    const sub = subResult.data;

    if (!sub) {
      return NextResponse.json({
        hasSubscription: false,
        plan: null,
        status: null,
        intendedPlan: null,
        trialStartsAt: null,
        trialEndsAt: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        usage: null,
        limits: null,
      });
    }

    // ── Phase 2: cascading counts ──
    const storeCount = storeResult.count ?? 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storeIds: string[] = (storeResult.data ?? []).map((s: any) => s.id);

    let productCount = 0;
    let genCount = 0;
    let checkCount = 0;

    if (storeIds.length > 0) {
      const now = new Date();
      const firstOfMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      ).toISOString();

      const [prodR, genR, checkR] = await Promise.all([
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .in("store_id", storeIds)
          .is("deleted_at", null),
        supabase
          .from("ai_content")
          .select("id", { count: "exact", head: true })
          .in("store_id", storeIds)
          .gte("created_at", firstOfMonth),
        supabase
          .from("scrape_jobs")
          .select("id", { count: "exact", head: true })
          .in("store_id", storeIds)
          .gte("created_at", firstOfMonth),
      ]);

      productCount = prodR.count ?? 0;
      genCount = genR.count ?? 0;
      checkCount = checkR.count ?? 0;
    }

    // ── Phase 3: plan limits ──
    const { data: limitsRow } = await supabase
      .from("plan_limits")
      .select(
        "max_stores, max_products, max_generations_per_month, max_checks_per_month"
      )
      .eq("plan", sub.plan)
      .maybeSingle();

    return NextResponse.json({
      hasSubscription: true,
      plan: sub.plan,
      status: sub.status,
      intendedPlan: sub.intended_plan,
      trialStartsAt: sub.trial_starts_at,
      trialEndsAt: sub.trial_ends_at,
      currentPeriodStart: sub.current_period_start,
      currentPeriodEnd: sub.current_period_end,
      usage: {
        stores: storeCount,
        products: productCount,
        generationsThisMonth: genCount,
        checksThisMonth: checkCount,
      },
      limits: limitsRow
        ? {
            maxStores: limitsRow.max_stores,
            maxProducts: limitsRow.max_products,
            maxGenerationsPerMonth: limitsRow.max_generations_per_month,
            maxChecksPerMonth: limitsRow.max_checks_per_month,
          }
        : null,
    });
  } catch (err) {
    console.error("[billing/status] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
