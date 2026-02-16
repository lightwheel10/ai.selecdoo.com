import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    // Authenticate
    const supabaseAuth = await createClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user && process.env.NEXT_PUBLIC_DEV_BYPASS !== "true") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Normalize URL
    let normalized = url.trim();
    if (!normalized.startsWith("http")) {
      normalized = `https://${normalized}`;
    }
    normalized = normalized.replace(/\/+$/, "");

    // Extract store name from hostname
    let storeName: string;
    try {
      const hostname = new URL(normalized).hostname;
      storeName = hostname.replace(/^www\./, "").split(".")[0];
      // Capitalize first letter
      storeName = storeName.charAt(0).toUpperCase() + storeName.slice(1);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

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
    const userId = user?.id ?? null;
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
