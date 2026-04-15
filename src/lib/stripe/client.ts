/**
 * Shared Stripe server-side client.
 *
 * Single instance for the whole server; import `stripe` where needed.
 * Never import this from client components — it requires the secret key.
 *
 * Design notes:
 *   - `apiVersion` is pinned explicitly (matches the SDK's current default
 *     as of stripe@22, but explicit avoids silent behavior changes when
 *     the SDK is upgraded to a newer version with a different default).
 *     See `.agents/skills/upgrade-stripe/SKILL.md`.
 *   - `appInfo` shows up in Stripe's internal logs / API dashboard so
 *     support requests can be traced back to this integration.
 *   - Throws at module-evaluation time if the secret key is missing.
 *     Next.js only evaluates this module on actual request paths, so
 *     `next build` isn't affected.
 */

import Stripe from "stripe";

const SECRET = process.env.STRIPE_SECRET_KEY;

if (!SECRET) {
  throw new Error(
    "STRIPE_SECRET_KEY is not set. Add it to .env.local (test key) or Vercel env vars (live key)."
  );
}

export const stripe = new Stripe(SECRET, {
  apiVersion: "2026-03-25.dahlia",
  typescript: true,
  appInfo: {
    name: "MarketforceONE",
    url: "https://ai.selecdoo.com",
  },
});

/** True when STRIPE_SECRET_KEY is a test-mode key. Use this to gate
    behavior that should only happen in dev (e.g. generous logging). */
export const isStripeTestMode = SECRET.startsWith("sk_test_");
