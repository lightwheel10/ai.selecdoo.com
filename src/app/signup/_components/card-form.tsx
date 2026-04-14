"use client";

import { CreditCard, Lock } from "lucide-react";

export interface CardData {
  number: string;
  expiry: string;
  cvc: string;
  name: string;
}

export const EMPTY_CARD: CardData = {
  number: "",
  expiry: "",
  cvc: "",
  name: "",
};

/**
 * True when all fields look minimally valid. This is a mock — no
 * Luhn check, no real validation. When Stripe is wired in, replace
 * this whole component with Stripe Elements and delete this helper.
 */
export function isCardComplete(c: CardData): boolean {
  const digits = c.number.replace(/\s/g, "");
  return (
    digits.length >= 13 &&
    digits.length <= 19 &&
    /^\d{2}\/\d{2}$/.test(c.expiry) &&
    c.cvc.length >= 3 &&
    c.name.trim().length > 1
  );
}

function formatCardNumber(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length < 3) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

interface Props {
  value: CardData;
  onChange: (v: CardData) => void;
}

/**
 * Mock credit-card form. Pure UI — does NOT tokenize or submit to
 * any payment provider. The `card required for trial` constraint is
 * only enforced client-side (no valid card → button disabled); the
 * server never receives card data and does not store it.
 *
 * When Stripe is wired in, swap this for Stripe Elements
 * (@stripe/react-stripe-js) and route the payment method id into
 * the /api/workspaces payload.
 */
export function CardForm({ value, onChange }: Props) {
  function set<K extends keyof CardData>(k: K, v: CardData[K]) {
    onChange({ ...value, [k]: v });
  }

  const inputStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    backgroundColor: "var(--input)",
    border: "2px solid var(--border)",
    color: "var(--foreground)",
  };
  const onInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = "4px solid var(--primary)";
    e.currentTarget.style.padding = "8px 10px";
  };
  const onInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = "2px solid var(--border)";
    e.currentTarget.style.padding = "10px 12px";
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Card number */}
      <div>
        <label
          className="block text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--foreground)",
            opacity: 0.5,
          }}
        >
          Card Number
        </label>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="cc-number"
            value={value.number}
            onChange={(e) => set("number", formatCardNumber(e.target.value))}
            placeholder="1234 5678 9012 3456"
            className="w-full pl-3 pr-9 py-2.5 text-xs outline-none transition-all duration-100"
            style={inputStyle}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
          />
          <CreditCard
            className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ opacity: 0.5 }}
          />
        </div>
      </div>

      {/* Expiry + CVC row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            className="block text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--foreground)",
              opacity: 0.5,
            }}
          >
            Expiry
          </label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="cc-exp"
            value={value.expiry}
            onChange={(e) => set("expiry", formatExpiry(e.target.value))}
            placeholder="MM/YY"
            className="w-full px-3 py-2.5 text-xs outline-none transition-all duration-100"
            style={inputStyle}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
          />
        </div>
        <div>
          <label
            className="block text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--foreground)",
              opacity: 0.5,
            }}
          >
            CVC
          </label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="cc-csc"
            value={value.cvc}
            onChange={(e) =>
              set("cvc", e.target.value.replace(/\D/g, "").slice(0, 4))
            }
            placeholder="123"
            className="w-full px-3 py-2.5 text-xs outline-none transition-all duration-100"
            style={inputStyle}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
          />
        </div>
      </div>

      {/* Cardholder name */}
      <div>
        <label
          className="block text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--foreground)",
            opacity: 0.5,
          }}
        >
          Cardholder Name
        </label>
        <input
          type="text"
          autoComplete="cc-name"
          value={value.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Name on card"
          className="w-full px-3 py-2.5 text-xs outline-none transition-all duration-100"
          style={inputStyle}
          onFocus={onInputFocus}
          onBlur={onInputBlur}
        />
      </div>

      {/* Security note — mock disclaimer */}
      <div
        className="flex items-center gap-2 px-3 py-2 mt-1"
        style={{
          backgroundColor: "var(--status-neutral-bg)",
          border: "1px solid var(--status-neutral-border)",
        }}
      >
        <Lock
          className="w-3 h-3 flex-shrink-0"
          style={{ color: "var(--muted-foreground)" }}
        />
        <p
          className="text-[10px]"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
          }}
        >
          Payment processing will activate when billing goes live.
        </p>
      </div>
    </div>
  );
}
