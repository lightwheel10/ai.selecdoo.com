// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = import("@supabase/supabase-js").SupabaseClient<any, any, any>;
import type { ChangeSummary } from "./change-detection";

/**
 * Creates a monitoring_logs row with status='running'. Returns the log ID.
 */
export async function createMonitoringLog(
  supabase: AnySupabaseClient,
  storeId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("monitoring_logs")
    .insert({
      store_id: storeId,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create monitoring_log:", error.message);
    return null;
  }

  return data.id;
}

/**
 * Updates a monitoring_log with completion data.
 */
export async function completeMonitoringLog(
  supabase: AnySupabaseClient,
  logId: string,
  summary: ChangeSummary,
  failed?: string
): Promise<void> {
  const { error } = await supabase
    .from("monitoring_logs")
    .update({
      status: failed ? "failed" : "completed",
      changes_detected: summary.totalChanges,
      new_products: summary.newCount,
      updated_products: summary.updatedCount,
      removed_products: summary.removedCount,
      error_message: failed ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", logId);

  if (error) {
    console.error("Failed to update monitoring_log:", error.message);
  }
}

/**
 * Updates monitoring_configs timestamps after a check.
 */
export async function updateMonitoringConfigTimestamps(
  supabase: AnySupabaseClient,
  storeId: string
): Promise<void> {
  // Get the store's interval to calculate next_check_at
  const { data: config } = await supabase
    .from("monitoring_configs")
    .select("check_interval_hours")
    .eq("store_id", storeId)
    .single();

  const intervalHours = config?.check_interval_hours ?? 24;
  const now = new Date();
  const nextCheck = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);

  const { error } = await supabase
    .from("monitoring_configs")
    .update({
      last_check_at: now.toISOString(),
      next_check_at: nextCheck.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("store_id", storeId);

  if (error) {
    console.error("Failed to update monitoring_config timestamps:", error.message);
  }
}
