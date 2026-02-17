import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── URL Validation ───

const PRIVATE_IP_RANGES = [
  /^127\./,                         // 127.0.0.0/8 loopback
  /^10\./,                          // 10.0.0.0/8 private
  /^172\.(1[6-9]|2\d|3[01])\./,    // 172.16.0.0/12 private
  /^192\.168\./,                    // 192.168.0.0/16 private
  /^169\.254\./,                    // 169.254.0.0/16 link-local (AWS metadata)
  /^0\./,                           // 0.0.0.0/8
];

function validateStoreUrl(raw: string): { ok: true; url: string } | { ok: false; error: string } {
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

  // Require https (allow http only in development)
  if (parsed.protocol !== "https:" && !(process.env.NODE_ENV === "development" && parsed.protocol === "http:")) {
    return { ok: false, error: "Only HTTPS URLs are allowed" };
  }

  // Block dangerous schemes that might have slipped through
  if (!["https:", "http:"].includes(parsed.protocol)) {
    return { ok: false, error: "Invalid URL scheme" };
  }

  // Block IP addresses in hostname (prevents SSRF to private ranges)
  const hostname = parsed.hostname;
  if (PRIVATE_IP_RANGES.some((r) => r.test(hostname))) {
    return { ok: false, error: "Private or reserved IP addresses are not allowed" };
  }

  // Block localhost variants
  if (hostname === "localhost" || hostname === "[::1]") {
    return { ok: false, error: "Localhost URLs are not allowed" };
  }

  // Must have a dot in hostname (no bare hostnames like "http://internal")
  if (!hostname.includes(".")) {
    return { ok: false, error: "Invalid hostname" };
  }

  return { ok: true, url: normalized };
}

export async function POST(req: Request) {
  try {
    // Authenticate
    let userId: string | null = null;
    if (process.env.NODE_ENV === "development" && process.env.DEV_BYPASS === "true") {
      userId = null; // dev mode — no user required
    } else {
      const supabaseAuth = await createClient();
      const {
        data: { user },
      } = await supabaseAuth.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = user.id;
    }

    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate and normalize URL
    const validation = validateStoreUrl(url);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const normalized = validation.url;

    // Extract store name from hostname
    const hostname = new URL(normalized).hostname;
    const storeName =
      hostname.replace(/^www\./, "").split(".")[0].charAt(0).toUpperCase() +
      hostname.replace(/^www\./, "").split(".")[0].slice(1);

    const supabase = createAdminClient();

    // Check for duplicate URL
    const { data: existingStore } = await supabase
      .from("stores")
      .select("id")
      .eq("url", normalized)
      .is("deleted_at", null)
      .single();

    if (existingStore) {
      return NextResponse.json({ error: "Store already exists" }, { status: 409 });
    }

    // Insert store
    const { data: newStore, error: insertErr } = await supabase
      .from("stores")
      .insert({
        url: normalized,
        name: storeName,
        platform: "shopify",
        status: "active",
        user_id: userId,
      })
      .select("id, url, name, platform, status")
      .single();

    if (insertErr || !newStore) {
      console.error("Store insert error:", insertErr);
      return NextResponse.json({ error: "Failed to create store" }, { status: 500 });
    }

    // Auto-create monitoring config
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
