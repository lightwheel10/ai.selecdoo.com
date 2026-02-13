"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import React from "react";

const segmentToKey: Record<string, string> = {
  scrape: "scrapeStores",
  jobs: "jobs",
  products: "products",
  stores: "stores",
  "ai-content": "aiContent",
  admin: "admin",
  monitoring: "monitoring",
};

export function AppBreadcrumb() {
  const pathname = usePathname();
  const t = useTranslations("Sidebar");
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .filter((s) => s !== "dashboard");

  return (
    <Breadcrumb>
      <BreadcrumbList
        className="text-[10px] font-bold uppercase tracking-[0.15em]"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        <BreadcrumbItem>
          {segments.length === 0 ? (
            <BreadcrumbPage className="text-foreground/60">
              {t("overview")}
            </BreadcrumbPage>
          ) : (
            <BreadcrumbLink href="/dashboard" className="text-muted-foreground hover:text-foreground">
              {t("overview")}
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {segments.map((segment, i) => {
          const isLast = i === segments.length - 1;
          const href = "/dashboard/" + segments.slice(0, i + 1).join("/");
          const key = segmentToKey[segment];
          const label = key ? t(key) : segment.charAt(0).toUpperCase() + segment.slice(1);

          return (
            <React.Fragment key={segment}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="text-foreground/60">
                    {label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={href} className="text-muted-foreground hover:text-foreground">
                    {label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
