import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function authenticate() {
  if (process.env.NODE_ENV === "development" && process.env.DEV_BYPASS === "true") {
    return { id: "dev-bypass" } as { id: string };
  }
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  return user;
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Look up product and verify ownership through its store
    const { data: product, error: lookupErr } = await supabase
      .from("products")
      .select("id, store_id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (lookupErr || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Verify the product's store belongs to the authenticated user
    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select("id, user_id")
      .eq("id", product.store_id)
      .is("deleted_at", null)
      .single();

    if (storeErr || !store) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (user.id !== "dev-bypass" && store.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft-delete the product
    const now = new Date().toISOString();
    const { error: deleteErr } = await supabase
      .from("products")
      .update({ deleted_at: now, updated_at: now })
      .eq("id", id);

    if (deleteErr) {
      console.error("Product delete error:", deleteErr);
      return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Product DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
