import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth/session";
import { canEditAIContent } from "@/lib/auth/roles";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, role, permissions, isDevBypass } = await getAuthContext();
    if (!user && !isDevBypass) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canEditAIContent({ role, permissions })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { content } = body as { content?: string };

    if (typeof content !== "string") {
      return NextResponse.json(
        { error: "content is required and must be a string" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: updated, error } = await supabase
      .from("ai_content")
      .update({ content })
      .eq("id", id)
      .select("*")
      .single();

    if (error || !updated) {
      if (error?.code === "PGRST116") {
        return NextResponse.json({ error: "Content not found" }, { status: 404 });
      }
      console.error("AI content update error:", error);
      return NextResponse.json(
        { error: "Failed to update content" },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: updated.id, content: updated.content });
  } catch (err) {
    console.error("AI content PATCH error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
