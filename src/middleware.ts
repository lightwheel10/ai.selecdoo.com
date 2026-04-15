import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Exclude: static assets, images, monitoring, cron routes, and
    // /api/billing/* (webhooks + Stripe calls that don't use our
    // Supabase session cookie).
    "/((?!_next/static|_next/image|favicon.ico|monitoring|api/cron/|api/billing/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
