import { MonitoringDashboard } from "./_components/monitoring-dashboard";
import {
  getMonitoringConfigs,
  getMonitoringLogs,
  getProductChanges,
} from "@/lib/queries";
import { getAuthContext } from "@/lib/auth/session";

export default async function MonitoringPage() {
  const { workspaceId } = await getAuthContext();
  const [configs, logs, changes] = await Promise.all([
    getMonitoringConfigs(workspaceId!),
    getMonitoringLogs(workspaceId!),
    getProductChanges(500, workspaceId!),
  ]);

  return (
    <MonitoringDashboard
      configs={configs}
      logs={logs}
      changes={changes}
    />
  );
}
