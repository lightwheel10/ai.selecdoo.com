"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import * as Flags from "country-flag-icons/react/3x2";
import { COUNTRIES, COUNTRY_BY_CODE } from "@/lib/countries";

type FlagComp = React.ComponentType<React.SVGProps<SVGSVGElement>>;
const FlagMap = Flags as unknown as Record<string, FlagComp | undefined>;

interface Props {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
}

/**
 * Searchable country dropdown with flag SVGs.
 *
 * Inline absolute-positioned dropdown (not a Radix Popover) — matches
 * the existing pattern used elsewhere in the app and dodges the
 * Popover-in-Dialog scroll-lock issue noted in design memory.
 */
export function CountryPicker({
  value,
  onChange,
  placeholder = "Select country",
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Focus search input when panel opens
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [search]);

  const selected = value ? COUNTRY_BY_CODE[value] : null;
  const SelectedFlag: FlagComp | undefined = selected
    ? FlagMap[selected.code]
    : undefined;

  function handleSelect(code: string) {
    onChange(code);
    setOpen(false);
    setSearch("");
  }

  return (
    <div className="relative" ref={wrapperRef}>
      {/* Trigger — brutalist input: 2px border, monospaced, 0 radius.
          Focus-equivalent (open) uses 4px primary border to match other inputs. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 text-xs outline-none transition-all duration-100"
        style={{
          fontFamily: "var(--font-mono)",
          backgroundColor: "var(--input)",
          border: open ? "4px solid var(--primary)" : "2px solid var(--border)",
          color: "var(--foreground)",
          padding: open ? "8px 10px" : "10px 12px",
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected && SelectedFlag ? (
          <>
            <SelectedFlag style={{ width: 20, height: 14, flexShrink: 0 }} />
            <span className="flex-1 text-left truncate">{selected.name}</span>
            <span style={{ opacity: 0.5 }}>{selected.code}</span>
          </>
        ) : (
          <span className="flex-1 text-left" style={{ opacity: 0.5 }}>
            {placeholder}
          </span>
        )}
        <ChevronDown
          className="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-100"
          style={{
            opacity: 0.5,
            transform: open ? "rotate(180deg)" : "rotate(0)",
          }}
        />
      </button>

      {/* Dropdown panel — inline absolute, hard shadow card */}
      {open && (
        <div
          className="absolute left-0 right-0 z-50 mt-1"
          style={{
            top: "100%",
            backgroundColor: "var(--card)",
            border: "2px solid var(--border-strong)",
            boxShadow: "var(--hard-shadow)",
          }}
          role="listbox"
        >
          {/* Search row */}
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <Search
              className="w-3.5 h-3.5 flex-shrink-0"
              style={{ opacity: 0.5 }}
            />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search countries"
              className="w-full text-xs outline-none bg-transparent"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--foreground)",
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{ opacity: 0.5 }}
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Scrollable country list */}
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div
                className="py-6 text-center text-[10px] font-bold uppercase tracking-[0.15em]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                }}
              >
                No match
              </div>
            ) : (
              filtered.map((c) => {
                const F = FlagMap[c.code];
                const isSelected = c.code === value;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleSelect(c.code)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors duration-100 hover:opacity-100"
                    style={{
                      fontFamily: "var(--font-body)",
                      backgroundColor: isSelected
                        ? "var(--primary-muted)"
                        : "transparent",
                      color: isSelected
                        ? "var(--primary-text)"
                        : "var(--foreground)",
                      opacity: isSelected ? 1 : 0.85,
                    }}
                    role="option"
                    aria-selected={isSelected}
                  >
                    {F ? (
                      <F style={{ width: 20, height: 14, flexShrink: 0 }} />
                    ) : (
                      <span
                        className="w-5 h-3.5 flex-shrink-0"
                        style={{ backgroundColor: "var(--border)" }}
                      />
                    )}
                    <span className="flex-1 truncate">{c.name}</span>
                    <span
                      className="text-[9px] font-bold tracking-wider"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {c.code}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
