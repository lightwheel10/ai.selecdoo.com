import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Exclude: static assets, images, monitoring, cron routes,
    // /api/billing/* (webhooks + Stripe calls that don't use our Supabase
    // session cookie), and /feed/* (public product feeds polled by Google
    // Merchant / Meta / affiliate networks — they don't carry a session
    // cookie and auth is enforced via per-workspace tokens in the URL).
    // 2026-05-14 (paras): added feed/ exclusion.
    "/((?!_next/static|_next/image|favicon.ico|monitoring|api/cron/|api/billing/|feed/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
