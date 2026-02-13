import { getTranslations } from "next-intl/server";
import { MonitoringTable } from "./_components/monitoring-table";
import { ChangeTimeline } from "./_components/change-timeline";
import { mockMonitoringConfigs, mockProductChanges } from "@/lib/mock-data";

export default async function MonitoringPage() {
  const t = await getTranslations("Monitoring");

  // TODO: Replace with real Supabase queries
  const configs = mockMonitoringConfigs;
  const changes = mockProductChanges;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <div className="xl:col-span-3">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
          }}
        >
          {t("storeSchedules")}
        </p>
        <MonitoringTable configs={configs} />
      </div>

      <div className="xl:col-span-2">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
          }}
        >
          {t("recentChanges")}
        </p>
        <ChangeTimeline changes={changes} />
      </div>
    </div>
  );
}
