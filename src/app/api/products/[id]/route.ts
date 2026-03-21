import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccessAdmin, canDeleteProduct } from "@/lib/auth/roles";
import { getAuthContext } from "@/lib/auth/session";
import { verifyStoreInWorkspace } from "@/lib/auth/workspace";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Allowlist of product fields editable from the admin modal.
// Maps request body key → DB column name.
// Added 2026-03-18 — product edit modal was only saving to local state.
const PRODUCT_FIELD_MAP: Record<string, string> = {
  is_published: "is_published",
  is_featured: "is_featured",
  is_slider: "is_slider",
  ai_category: "ai_category",
  in_stock: "in_stock",
  description_de: "description_de",
  description_en: "description_en",
  image_url: "image_url",
  affiliate_link: "affiliate_link",
  ai_shipping_data: "ai_shipping_data", // JSONB — product-level shipping overrides
};

const MAX_BODY_SIZE = 16_384; // 16 KB

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
    if (contentLength > MAX_BODY_SIZE) {
      return NextResponse.json({ error: "Request body too large" }, { status: 413 });
    }

    const { id } = await params;
    const { user, role, permissions, isDevBypass, workspaceId } = await getAuthContext();

    if (!user && !isDevBypass) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canAccessAdmin({ role, permissions })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    const body = await req.json();

    const requestedFields = Object.keys(PRODUCT_FIELD_MAP).filter((f) => f in body);
    if (requestedFields.length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const dbUpdate: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    for (const [field, dbColumn] of Object.entries(PRODUCT_FIELD_MAP)) {
      if (field in body) {
        let value = body[field];

        // Coerce booleans
        if (["is_published", "is_featured", "is_slider", "in_stock"].includes(field)) {
          value = Boolean(value);
        }

        // Empty strings → null for text fields
        if (typeof value === "string" && value.trim() === "") {
          value = null;
        }

        dbUpdate[dbColumn] = value;
      }
    }

    const supabase = createAdminClient();

    const { data: existing, error: lookupErr } = await supabase
      .from("products")
      .select("id, store_id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (lookupErr || !existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Workspace isolation: reject if no workspace context or resource doesn't belong
    if (!workspaceId || !(await verifyStoreInWorkspace(existing.store_id, workspaceId))) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const { error: updateErr } = await supabase
      .from("products")
      .update(dbUpdate)
      .eq("id", id);

    if (updateErr) {
      console.error("Product update error:", updateErr);
      return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Product PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, role, permissions, isDevBypass, workspaceId } = await getAuthContext();
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
      .select("id, store_id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (lookupErr || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Workspace isolation: reject if no workspace context or resource doesn't belong
    if (!workspaceId || !(await verifyStoreInWorkspace(product.store_id, workspaceId))) {
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
