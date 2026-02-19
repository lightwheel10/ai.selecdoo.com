import {
  LayoutDashboard,
  Scan,
  ClipboardList,
  Package,
  Store,
  Sparkles,
  Activity,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  labelKey: string;
  icon: LucideIcon;
  href: string;
}

export const NAV_ITEMS: NavItem[] = [
  { labelKey: "overview", icon: LayoutDashboard, href: "/dashboard" },
  { labelKey: "scrapeStores", icon: Scan, href: "/dashboard/scrape" },
  { labelKey: "jobs", icon: ClipboardList, href: "/dashboard/jobs" },
  { labelKey: "products", icon: Package, href: "/dashboard/products" },
  { labelKey: "stores", icon: Store, href: "/dashboard/stores" },
  { labelKey: "aiContent", icon: Sparkles, href: "/dashboard/ai-content" },
  { labelKey: "monitoring", icon: Activity, href: "/dashboard/monitoring" },
];

export const NAV_BOTTOM: NavItem[] = [
  { labelKey: "settings", icon: Settings, href: "/dashboard/settings" },
];

export const APP_NAME = "Selecdoo";
