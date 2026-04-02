import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth/session";
import { canEditAIContent } from "@/lib/auth/roles";
import { verifyStoreInWorkspace } from "@/lib/auth/workspace";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, role, permissions, isDevBypass, workspaceId } = await getAuthContext();
    if (!user && !isDevBypass) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canEditAIContent({ role, permissions })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    // Supports both combined content editing (legacy) and per-language editing.
    // If content_de or content_en are provided, update those columns and
    // rebuild the combined content column for backward compatibility.
    const { content, content_de, content_en } = body as {
      content?: string;
      content_de?: string;
      content_en?: string;
    };

    const hasLanguageFields = typeof content_de === "string" || typeof content_en === "string";
    if (typeof content !== "string" && !hasLanguageFields) {
      return NextResponse.json(
        { error: "content or content_de/content_en is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify record exists and belongs to workspace
    const { data: existing, error: lookupErr } = await supabase
      .from("ai_content")
      .select("id, store_id")
      .eq("id", id)
      .single();

    if (lookupErr || !existing) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    // Workspace isolation: reject if no workspace context or resource doesn't belong
    if (!workspaceId || !(await verifyStoreInWorkspace(existing.store_id, workspaceId))) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    // Build the update payload. When editing per-language, also rebuild
    // the combined content column so webhook sends remain consistent.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};
    if (hasLanguageFields) {
      // Fetch existing to merge — user may edit only DE or only EN
      const { data: current } = await supabase
        .from("ai_content")
        .select("content_de, content_en")
        .eq("id", id)
        .single();
      const newDe = content_de ?? current?.content_de ?? "";
      const newEn = content_en ?? current?.content_en ?? "";
      if (content_de !== undefined) updateData.content_de = content_de;
      if (content_en !== undefined) updateData.content_en = content_en;
      // Rebuild combined content from the (possibly updated) language fields
      updateData.content = newDe + "\n\n---\n\n" + newEn;
    } else {
      updateData.content = content;
    }

    const { data: updated, error } = await supabase
      .from("ai_content")
      .update(updateData)
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

    return NextResponse.json({
      id: updated.id,
      content: updated.content,
      content_de: updated.content_de ?? null,
      content_en: updated.content_en ?? null,
    });
  } catch (err) {
    console.error("AI content PATCH error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
