/**
 * Plan limit enforcement helpers.
 *
 * Called from API routes AFTER canUsePaidFeature passes (subscription
 * is active/trialing). Checks whether the workspace has hit the cap
 * for a specific metric (stores, AI generations, scrape checks).
 *
 * Uses the same counting logic as /api/billing/status so the numbers
 * shown on the billing tab match what gets enforced.
 *
 * All queries use the admin client (service_role) so RLS is bypassed.
 */

type LimitMetric = "stores" | "generations" | "checks";

export interface LimitCheckResult {
  /** True when usage < max (action is allowed). */
  allowed: boolean;
  /** Current usage count. */
  used: number;
  /** Plan's max for this metric. */
  max: number;
}

/**
 * Check whether the workspace is within its plan's limit for the
 * given metric. Returns `{ allowed: true }` when:
 *   - usage is under the cap
 *   - plan has no matching plan_limits row (defensive — don't block
 *     on missing config)
 *   - plan is null (shouldn't happen if canUsePaidFeature ran first)
 */
export async function checkPlanLimit(
  workspaceId: string,
  metric: LimitMetric,
  plan: string | null
): Promise<LimitCheckResult> {
  // No plan → don't enforce (canUsePaidFeature handles the binary gate)
  if (!plan) return { allowed: true, used: 0, max: 0 };

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();

  // Look up the plan's limits
  const { data: limits } = await supabase
    .from("plan_limits")
    .select(
      "max_stores, max_products, max_generations_per_month, max_checks_per_month"
    )
    .eq("plan", plan)
    .maybeSingle();

  // No limits row for this plan (e.g., 'canceled') → allow
  if (!limits) return { allowed: true, used: 0, max: 0 };

  // Get workspace store IDs (needed for all metrics — stores count
  // comes from the length, cascading counts need the IDs for IN).
  const { data: storeRows } = await supabase
    .from("stores")
    .select("id")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storeIds: string[] = (storeRows ?? []).map((s: any) => s.id);

  // Calendar month start — matches /api/billing/status so the
  // billing tab and enforcement show the same numbers.
  const now = new Date();
  const firstOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString();

  let used = 0;
  let max = 0;

  switch (metric) {
    case "stores": {
      used = storeIds.length;
      max = limits.max_stores;
      break;
    }
    case "generations": {
      max = limits.max_generations_per_month;
      if (storeIds.length > 0) {
        const { count } = await supabase
          .from("ai_content")
          .select("id", { count: "exact", head: true })
          .in("store_id", storeIds)
          .gte("created_at", firstOfMonth);
        used = count ?? 0;
      }
      break;
    }
    case "checks": {
      max = limits.max_checks_per_month;
      if (storeIds.length > 0) {
        const { count } = await supabase
          .from("scrape_jobs")
          .select("id", { count: "exact", head: true })
          .in("store_id", storeIds)
          .gte("created_at", firstOfMonth);
        used = count ?? 0;
      }
      break;
    }
  }

  return { allowed: used < max, used, max };
}
