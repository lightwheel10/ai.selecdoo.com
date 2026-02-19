"use client";

import dynamic from "next/dynamic";
import type { Store, Product, AIActivityLog } from "@/types";

const AdminDashboard = dynamic(
  () => import("./admin-dashboard").then((m) => m.AdminDashboard),
  { ssr: false }
);

interface AdminDashboardLoaderProps {
  stores: Store[];
  products: Product[];
  activityLogs: AIActivityLog[];
}

export function AdminDashboardLoader(props: AdminDashboardLoaderProps) {
  return <AdminDashboard {...props} />;
}
