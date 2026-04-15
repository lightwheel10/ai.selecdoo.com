/**
 * Shared Stripe server-side client (lazy-initialized).
 *
 * Why a Proxy: Next.js's build-time "collect page data" pass imports
 * every API route module to register the route manifest, which
 * transitively imports this file. If we called `new Stripe(secret)`
 * at module-eval time, a build without STRIPE_SECRET_KEY set (i.e.
 * Vercel without the env var yet) would throw here and break the
 * whole deploy. The Proxy defers the Stripe() construction — and
 * the env-var check — until a property is actually accessed at
 * request time, which never happens during build.
 *
 * Callers use `stripe.customers.create(...)` etc. exactly as if it
 * were a normal Stripe instance. No API difference.
 *
 * Design notes:
 *   - apiVersion pinned explicitly (matches SDK default for stripe@22
 *     but explicit prevents silent behavior change on SDK upgrade).
 *   - appInfo shows up in Stripe's internal logs so support requests
 *     can trace back to this integration.
 *
 * Never import this from client components — it uses the secret key.
 */

import Stripe from "stripe";

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to .env.local (test key) or Vercel env vars (live key)."
    );
  }
  _stripe = new Stripe(secret, {
    apiVersion: "2026-03-25.dahlia",
    typescript: true,
    appInfo: {
      name: "MarketforceONE",
      url: "https://ai.selecdoo.com",
    },
  });
  return _stripe;
}

// Proxy target is an empty object cast to Stripe — the cast is
// purely for TypeScript; runtime behavior is defined entirely by
// the trap below, which delegates everything to the real client.
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const client = getStripe();
    return Reflect.get(client, prop, client);
  },
});

/** True when STRIPE_SECRET_KEY is a test-mode key. Function (not a
    const) so evaluating this doesn't throw when the key is absent — it
    just returns false. */
export function isStripeTestMode(): boolean {
  return (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");
}
