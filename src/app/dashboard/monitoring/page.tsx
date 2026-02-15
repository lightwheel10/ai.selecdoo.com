import { MonitoringDashboard } from "./_components/monitoring-dashboard";
import {
  getMonitoringConfigs,
  getMonitoringLogs,
  getProductChanges,
} from "@/lib/queries";

export default async function MonitoringPage() {
  const [configs, logs, changes] = await Promise.all([
    getMonitoringConfigs(),
    getMonitoringLogs(),
    getProductChanges(),
  ]);

  return (
    <MonitoringDashboard
      configs={configs}
      logs={logs}
      changes={changes}
    />
  );
}
