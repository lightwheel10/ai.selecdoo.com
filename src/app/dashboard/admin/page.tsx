import { getTranslations } from "next-intl/server";
import { mockStores, mockProducts, mockAIActivityLogs } from "@/lib/mock-data";
import { AdminDashboard } from "./_components/admin-dashboard";

export default async function AdminPage() {
  const t = await getTranslations("Admin");

  return (
    <>
      <div className="mb-6">
        <h1
          className="text-[11px] font-bold uppercase tracking-[0.15em]"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
          }}
        >
          {t("pageTitle")}
        </h1>
      </div>
      <AdminDashboard
        stores={mockStores}
        products={mockProducts}
        activityLogs={mockAIActivityLogs}
      />
    </>
  );
}
