import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/auth/roles";
import { getProducts, getProductsLight } from "@/lib/queries";

export async function GET(req: NextRequest) {
  try {
    const { role, permissions, user, isDevBypass } = await getAuthContext();
    if (!user && !isDevBypass) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canAccessAdmin({ role, permissions })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const columns = req.nextUrl.searchParams.get("columns");
    const products = columns === "light"
      ? await getProductsLight()
      : await getProducts();

    return NextResponse.json({ products });
  } catch (err) {
    console.error("Admin products API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
