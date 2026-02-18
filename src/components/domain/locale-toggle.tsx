"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { setLocale } from "@/app/actions/locale";

export function LocaleToggle() {
  const locale = useLocale();
  const router = useRouter();

  async function switchLocale() {
    const next = locale === "en" ? "de" : "en";
    await setLocale(next as "en" | "de");
    router.refresh();
  }

  return (
    <button
      onClick={switchLocale}
      className="relative text-[10px] font-bold uppercase tracking-[0.15em] transition-colors duration-200"
      style={{
        fontFamily: "var(--font-mono)",
        color: "var(--muted-foreground)",
      }}
      aria-label={`Switch to ${locale === "en" ? "German" : "English"}`}
    >
      <span
        className="transition-opacity duration-200"
        style={{ opacity: locale === "en" ? 1 : 0.4 }}
      >
        EN
      </span>
      <span className="mx-0.5" style={{ opacity: 0.3 }}>/</span>
      <span
        className="transition-opacity duration-200"
        style={{ opacity: locale === "de" ? 1 : 0.4 }}
      >
        DE
      </span>
    </button>
  );
}
