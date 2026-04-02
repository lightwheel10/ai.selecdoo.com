import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

// Only these locales have message files in /messages/*.json.
// If the locale cookie contains an unsupported value (e.g. "es" from a
// bot or misconfigured browser), fall back to English to avoid a crash.
const SUPPORTED_LOCALES = ["en", "de"];

export default getRequestConfig(async () => {
  const store = await cookies();
  const raw = store.get("locale")?.value || "en";
  const locale = SUPPORTED_LOCALES.includes(raw) ? raw : "en";

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
