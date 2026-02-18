import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canCreateStore } from "@/lib/auth/roles";
import { getAuthContext } from "@/lib/auth/session";

const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
];

function validateStoreUrl(
  raw: string
): { ok: true; url: string } | { ok: false; error: string } {
  let normalized = raw.trim();
  if (!normalized.startsWith("http")) {
    normalized = `https://${normalized}`;
  }
  normalized = normalized.replace(/\/+$/, "");

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return { ok: false, error: "Invalid URL format" };
  }

  if (
    parsed.protocol !== "https:" &&
    !(process.env.NODE_ENV === "development" && parsed.protocol === "http:")
  ) {
    return { ok: false, error: "Only HTTPS URLs are allowed" };
  }

  if (!["https:", "http:"].includes(parsed.protocol)) {
    return { ok: false, error: "Invalid URL scheme" };
  }

  const hostname = parsed.hostname;
  if (PRIVATE_IP_RANGES.some((r) => r.test(hostname))) {
    return {
      ok: false,
      error: "Private or reserved IP addresses are not allowed",
    };
  }

  if (hostname === "localhost" || hostname === "[::1]") {
    return { ok: false, error: "Localhost URLs are not allowed" };
  }

  if (!hostname.includes(".")) {
    return { ok: false, error: "Invalid hostname" };
  }

  return { ok: true, url: normalized };
}

const MAX_BODY_SIZE = 16_384; // 16 KB

export async function POST(req: Request) {
  try {
    const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
    if (contentLength > MAX_BODY_SIZE) {
      return NextResponse.json({ error: "Request body too large" }, { status: 413 });
    }

    const { user, role, permissions, isDevBypass } = await getAuthContext();
    if (!user && !isDevBypass) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canCreateStore({ role, permissions })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const validation = validateStoreUrl(url);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const normalized = validation.url;

    const hostname = new URL(normalized).hostname;
    const storeName =
      hostname.replace(/^www\./, "").split(".")[0].charAt(0).toUpperCase() +
      hostname.replace(/^www\./, "").split(".")[0].slice(1);

    const supabase = createAdminClient();

    const { data: existingStore } = await supabase
      .from("stores")
      .select("id")
      .eq("url", normalized)
      .is("deleted_at", null)
      .single();

    if (existingStore) {
      return NextResponse.json({ error: "Store already exists" }, { status: 409 });
    }

    const { data: newStore, error: insertErr } = await supabase
      .from("stores")
      .insert({
        url: normalized,
        name: storeName,
        platform: "shopify",
        status: "active",
        user_id: user?.id ?? null,
      })
      .select("id, url, name, platform, status")
      .single();

    if (insertErr || !newStore) {
      console.error("Store insert error:", insertErr);
      return NextResponse.json({ error: "Failed to create store" }, { status: 500 });
    }

    const now = new Date();
    const nextCheck = new Date(now.getTime() + 72 * 60 * 60 * 1000);
    await supabase.from("monitoring_configs").insert({
      store_id: newStore.id,
      enabled: true,
      check_interval_hours: 72,
      next_check_at: nextCheck.toISOString(),
    });

    return NextResponse.json({ store: newStore });
  } catch (err) {
    console.error("Store POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
