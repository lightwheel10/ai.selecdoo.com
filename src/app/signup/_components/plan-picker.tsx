"use client";

import { Check } from "lucide-react";

export type PlanId = "standard" | "pro";

interface Plan {
  id: PlanId;
  name: string;
  price: string;
  priceSuffix: string;
  description: string;
  features: string[];
  popular?: boolean;
}

/**
 * Copy + pricing values mirror the landing page's pricing cards
 * (messages/en.json → Landing.pricing*). Keep in sync.
 */
export const PLANS: Plan[] = [
  {
    id: "standard",
    name: "Pro",
    price: "€79",
    priceSuffix: "/month",
    description:
      "For solo affiliates getting started with deal content automation.",
    features: [
      "5 shops",
      "50 products per shop",
      "250 total products",
      "2 checks per month",
      "€5 AI generations",
    ],
  },
  {
    id: "pro",
    name: "Business Class",
    price: "€159",
    priceSuffix: "/month",
    description:
      "For power users and teams scaling across multiple stores.",
    features: [
      "10 shops",
      "100 products per shop",
      "1,000 total products",
      "5 checks per month",
      "€10 AI generations",
    ],
    popular: true,
  },
];

interface Props {
  value: PlanId;
  onChange: (p: PlanId) => void;
}

/**
 * Two plan cards in a 2-column grid. Each card stacks name → price →
 * description → features vertically so the cards can share a row at
 * narrow widths (~290px each).
 *
 * Selection = primary border + gold shadow offset, matching landing
 * page's "Most Popular" card styling.
 */
export function PlanPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {PLANS.map((p) => {
        const selected = value === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className="relative flex flex-col text-left p-4 transition-all duration-100 hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            style={{
              backgroundColor: "var(--card)",
              border: selected
                ? "2px solid var(--primary)"
                : "2px solid var(--border-strong)",
              boxShadow: selected
                ? "4px 4px 0px var(--primary)"
                : "var(--hard-shadow)",
            }}
            aria-pressed={selected}
          >
            {p.popular && (
              <span
                className="absolute -top-2.5 right-3 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.15em]"
                style={{
                  fontFamily: "var(--font-mono)",
                  backgroundColor: "var(--primary)",
                  color: "var(--primary-foreground)",
                  border: "2px solid var(--border-strong)",
                }}
              >
                Most Popular
              </span>
            )}

            {/* Plan name — small kicker */}
            <p
              className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--muted-foreground)",
              }}
            >
              {p.name}
            </p>

            {/* Price — display font, large */}
            <div className="flex items-baseline gap-1 mb-3">
              <span
                className="text-2xl font-black"
                style={{
                  fontFamily: "var(--font-display)",
                  letterSpacing: "-0.02em",
                }}
              >
                {p.price}
              </span>
              <span
                className="text-[10px] font-bold"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                }}
              >
                {p.priceSuffix}
              </span>
            </div>

            {/* Description */}
            <p
              className="text-[11px] leading-relaxed mb-3"
              style={{
                fontFamily: "var(--font-body)",
                color: "var(--muted-foreground)",
              }}
            >
              {p.description}
            </p>

            {/* Features — mt-auto pushes list to the bottom so
                two cards with differing description lengths still
                align at the footer. */}
            <ul className="flex flex-col gap-1.5 mt-auto">
              {p.features.map((f, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 text-[11px]"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  <Check
                    className="w-3 h-3 shrink-0"
                    strokeWidth={3}
                    style={{ color: "var(--primary-text)" }}
                  />
                  {f}
                </li>
              ))}
            </ul>
          </button>
        );
      })}
    </div>
  );
}
