import { getTranslations } from "next-intl/server";
import { MonitoringDashboard } from "./_components/monitoring-dashboard";
import {
  mockMonitoringConfigs,
  mockMonitoringLogs,
  mockProductChanges,
} from "@/lib/mock-data";

export default async function MonitoringPage() {
  const t = await getTranslations("Monitoring");

  // TODO: Replace with real Supabase queries
  const configs = mockMonitoringConfigs;
  const logs = mockMonitoringLogs;
  const changes = mockProductChanges;

  return (
    <MonitoringDashboard
      configs={configs}
      logs={logs}
      changes={changes}
    />
  );
}
