import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function authenticate() {
  if (process.env.NODE_ENV === "development" && process.env.DEV_BYPASS === "true") {
    return { id: "dev-bypass" } as { id: string };
  }
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  return user;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    if (!await authenticate()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await params;
    const supabase = createAdminClient();

    // Get job to find store_id
    const { data: job, error: jobErr } = await supabase
      .from("scrape_jobs")
      .select("store_id")
      .eq("id", jobId)
      .single();

    if (jobErr || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Fetch products for this store
    const { data: products, error: prodErr } = await supabase
      .from("products")
      .select("*")
      .eq("store_id", job.store_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (prodErr) {
      return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }

    // Map to frontend Product shape
    const mapped = (products ?? []).map((row) => ({
      id: row.id,
      store_id: row.store_id,
      title: row.cleaned_title || row.title,
      handle: row.handle,
      sku: row.sku,
      brand: row.brand,
      price: Number(row.price),
      original_price: row.original_price != null ? Number(row.original_price) : null,
      compare_at_price: row.original_price != null ? Number(row.original_price) : null,
      discount_percentage: row.discount_percentage != null ? Number(row.discount_percentage) : null,
      currency: row.currency,
      in_stock: row.in_stock,
      stock_status: row.in_stock ? "in_stock" : "out_of_stock",
      product_url: row.product_url,
      image_url: row.image_url,
      description: row.description,
      updated_at: row.updated_at,
      is_published: row.is_published,
      is_featured: row.is_featured,
      is_slider: row.is_slider,
      ai_category: row.ai_category,
      affiliate_link: row.affiliate_link,
    }));

    return NextResponse.json({ products: mapped });
  } catch (err) {
    console.error("Products API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
