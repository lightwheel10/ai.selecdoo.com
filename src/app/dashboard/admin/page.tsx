import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getStores, getProducts, getAIActivityLogs } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { canAccessAdmin } from "@/lib/auth/roles";
import { resolveAppRole } from "@/lib/auth/roles-server";
import { AdminDashboard } from "./_components/admin-dashboard";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isDevBypass =
    process.env.NODE_ENV === "development" &&
    process.env.DEV_BYPASS === "true";

  if (!user && !isDevBypass) {
    redirect("/login");
  }

  const role = isDevBypass ? "admin" : resolveAppRole(user);
  if (!canAccessAdmin(role)) {
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
      <AdminDashboard
        stores={stores}
        products={products}
        activityLogs={activityLogs}
      />
    </>
  );
}
