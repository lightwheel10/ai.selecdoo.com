import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAppRole, normalizeAppRole } from "@/lib/auth/roles";
import { isBootstrapAdminEmail, resolveAppRole } from "@/lib/auth/roles-server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY_SIZE = 8_192; // 8 KB
const PAGE_SIZE = 200;
const MAX_PAGES = 20;

async function authenticateAdmin() {
  if (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_BYPASS === "true"
  ) {
    return { id: "dev-bypass", email: null as string | null };
  }

  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) return null;
  if (resolveAppRole(user) !== "admin") return null;

  return { id: user.id, email: user.email ?? null };
}

async function listAllAuthUsers() {
  const supabase = createAdminClient();
  const users: User[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });

    if (error) {
      throw new Error(error.message);
    }

    const batch = data.users ?? [];
    users.push(...batch);

    if (batch.length < PAGE_SIZE) break;
  }

  return users;
}

export async function GET() {
  try {
    const actor = await authenticateAdmin();
    if (!actor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await listAllAuthUsers();

    const mapped = users
      .filter((u) => !!u.email)
      .map((u) => {
        const role = resolveAppRole({
          email: u.email,
          app_metadata:
            (u.app_metadata as Record<string, unknown> | undefined) ?? null,
        });
        return {
          id: u.id,
          email: u.email!,
          role,
          created_at: u.created_at ?? null,
          last_sign_in_at: u.last_sign_in_at ?? null,
          is_bootstrap_admin: isBootstrapAdminEmail(u.email),
        };
      })
      .sort((a, b) => a.email.localeCompare(b.email));

    return NextResponse.json({ members: mapped });
  } catch (err) {
    console.error("Team roles GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const actor = await authenticateAdmin();
    if (!actor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
    if (contentLength > MAX_BODY_SIZE) {
      return NextResponse.json({ error: "Request body too large" }, { status: 413 });
    }

    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const roleInput = body.role;

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (!isAppRole(roleInput)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const users = await listAllAuthUsers();
    const target = users.find((u) => (u.email ?? "").toLowerCase() === email);

    if (!target) {
      return NextResponse.json(
        { error: "User not found. Ask the user to log in once first." },
        { status: 404 }
      );
    }

    if (isBootstrapAdminEmail(target.email)) {
      return NextResponse.json(
        { error: "Bootstrap admin role is controlled by environment." },
        { status: 400 }
      );
    }

    const targetRole = normalizeAppRole(target.app_metadata?.role);
    if (target.id === actor.id && roleInput !== "admin") {
      return NextResponse.json(
        { error: "You cannot remove your own admin role." },
        { status: 400 }
      );
    }

    if (targetRole === "admin" && roleInput !== "admin") {
      const adminCount = users.filter(
        (u) =>
          resolveAppRole({
            email: u.email,
            app_metadata:
              (u.app_metadata as Record<string, unknown> | undefined) ?? null,
          }) === "admin"
      ).length;

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "At least one admin must remain." },
          { status: 400 }
        );
      }
    }

    const supabase = createAdminClient();
    const nextMetadata = {
      ...(target.app_metadata ?? {}),
      role: roleInput,
    };
    const { error: updateErr } = await supabase.auth.admin.updateUserById(
      target.id,
      { app_metadata: nextMetadata }
    );

    if (updateErr) {
      console.error("Role update error:", updateErr);
      return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      member: {
        id: target.id,
        email: target.email,
        role: roleInput,
      },
    });
  } catch (err) {
    console.error("Team roles POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

