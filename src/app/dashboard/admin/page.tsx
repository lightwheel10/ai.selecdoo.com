import { getTranslations } from "next-intl/server";
import { getStores, getProducts, getAIActivityLogs } from "@/lib/queries";
import { AdminDashboard } from "./_components/admin-dashboard";

export default async function AdminPage() {
  const [t, stores, products, activityLogs] = await Promise.all([
    getTranslations("Admin"),
    getStores(),
    getProducts(),
    getAIActivityLogs(),
  ]);

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
        stores={stores}
        products={products}
        activityLogs={activityLogs}
      />
    </>
  );
}
