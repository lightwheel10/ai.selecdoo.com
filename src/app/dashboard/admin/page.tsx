import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getStores, getProducts, getAIActivityLogs } from "@/lib/queries";
import { canAccessAdmin } from "@/lib/auth/roles";
import { getAuthContext } from "@/lib/auth/session";
import { AdminDashboardLoader } from "./_components/admin-dashboard-loader";

export default async function AdminPage() {
  const { user, role, permissions, isDevBypass } = await getAuthContext();

  if (!user && !isDevBypass) {
    redirect("/login");
  }

  if (!canAccessAdmin({ role, permissions })) {
    redirect("/dashboard");
  }

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
      <AdminDashboardLoader
        stores={stores}
        products={products}
        activityLogs={activityLogs}
      />
    </>
  );
}
