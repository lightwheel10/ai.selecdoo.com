"use server";

import { cookies } from "next/headers";

export async function setLocale(locale: "en" | "de") {
  const store = await cookies();
  store.set("locale", locale);
}
