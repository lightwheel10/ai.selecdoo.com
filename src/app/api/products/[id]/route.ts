import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canDeleteProduct } from "@/lib/auth/roles";
import { getAuthContext } from "@/lib/auth/session";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, role, permissions, isDevBypass } = await getAuthContext();
    if (!user && !isDevBypass) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canDeleteProduct({ role, permissions })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: product, error: lookupErr } = await supabase
      .from("products")
      .select("id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (lookupErr || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

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
