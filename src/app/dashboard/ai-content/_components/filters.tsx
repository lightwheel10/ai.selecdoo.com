"use client";

import { useState } from "react";
import { ChevronDown, X, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

// ─── Searchable Combobox (single-select) ───

export function SearchableFilter({
  label,
  resetLabel,
  searchPlaceholder,
  emptyText,
  options,
  value,
  onChange,
}: {
  label: string;
  resetLabel: string;
  searchPlaceholder: string;
  emptyText: string;
  options: string[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          suppressHydrationWarning
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors"
          style={{
            fontFamily: "var(--font-mono)",
            backgroundColor: value ? "rgba(202,255,4,0.06)" : "transparent",
            borderColor: value ? "rgba(202,255,4,0.3)" : "var(--border)",
            color: value ? "#CAFF04" : "var(--muted-foreground)",
          }}
        >
          {value || label}
          <ChevronDown className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="p-0 border-2 w-[220px]"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--card)",
          borderRadius: 0,
        }}
      >
        <Command style={{ backgroundColor: "transparent", borderRadius: 0 }}>
          <CommandInput
            placeholder={searchPlaceholder}
            className="text-[11px]"
            style={{ fontFamily: "var(--font-mono)", borderRadius: 0 }}
          />
          <CommandList className="scrollbar-none" style={{ maxHeight: 240 }}>
            <CommandEmpty>
              <span
                className="text-[10px] font-bold uppercase tracking-[0.15em]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                }}
              >
                {emptyText}
              </span>
            </CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className="text-[10px] font-bold uppercase tracking-[0.15em]"
                  style={{ fontFamily: "var(--font-mono)", borderRadius: 0 }}
                >
                  <X className="w-3 h-3 mr-1.5 opacity-50" />
                  {resetLabel}
                </CommandItem>
              )}
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => {
                    onChange(option === value ? null : option);
                    setOpen(false);
                  }}
                  className="text-[10px] font-bold uppercase tracking-[0.15em]"
                  style={{ fontFamily: "var(--font-mono)", borderRadius: 0 }}
                >
                  {value === option ? (
                    <Check className="w-3 h-3 mr-1.5 text-[#CAFF04]" />
                  ) : (
                    <span className="w-3 mr-1.5" />
                  )}
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Multi-Select Searchable Combobox ───

export function MultiSearchableFilter({
  label,
  resetLabel,
  searchPlaceholder,
  emptyText,
  selectedText,
  options,
  value,
  onChange,
}: {
  label: string;
  resetLabel: string;
  searchPlaceholder: string;
  emptyText: string;
  selectedText: (count: number) => string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasSelection = value.length > 0;

  const displayLabel =
    value.length === 0
      ? label
      : value.length === 1
      ? value[0]
      : selectedText(value.length);

  function toggleOption(option: string) {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
    } else {
      onChange([...value, option]);
    }
    // Don't close — stay open for multi-select
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          suppressHydrationWarning
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors"
          style={{
            fontFamily: "var(--font-mono)",
            backgroundColor: hasSelection
              ? "rgba(202,255,4,0.06)"
              : "transparent",
            borderColor: hasSelection
              ? "rgba(202,255,4,0.3)"
              : "var(--border)",
            color: hasSelection ? "#CAFF04" : "var(--muted-foreground)",
          }}
        >
          {displayLabel}
          {hasSelection && (
            <span
              className="text-[9px] font-bold px-1 py-0.5 ml-0.5"
              style={{
                backgroundColor: "rgba(202,255,4,0.15)",
                color: "#CAFF04",
              }}
            >
              {value.length}
            </span>
          )}
          <ChevronDown className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="p-0 border-2 w-[220px]"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--card)",
          borderRadius: 0,
        }}
      >
        <Command style={{ backgroundColor: "transparent", borderRadius: 0 }}>
          <CommandInput
            placeholder={searchPlaceholder}
            className="text-[11px]"
            style={{ fontFamily: "var(--font-mono)", borderRadius: 0 }}
          />
          <CommandList className="scrollbar-none" style={{ maxHeight: 240 }}>
            <CommandEmpty>
              <span
                className="text-[10px] font-bold uppercase tracking-[0.15em]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                }}
              >
                {emptyText}
              </span>
            </CommandEmpty>
            <CommandGroup>
              {hasSelection && (
                <CommandItem
                  onSelect={() => {
                    onChange([]);
                    setOpen(false);
                  }}
                  className="text-[10px] font-bold uppercase tracking-[0.15em]"
                  style={{ fontFamily: "var(--font-mono)", borderRadius: 0 }}
                >
                  <X className="w-3 h-3 mr-1.5 opacity-50" />
                  {resetLabel}
                </CommandItem>
              )}
              {options.map((option) => {
                const isSelected = value.includes(option);
                return (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => toggleOption(option)}
                    className="text-[10px] font-bold uppercase tracking-[0.15em]"
                    style={{ fontFamily: "var(--font-mono)", borderRadius: 0 }}
                  >
                    <div
                      className="w-3 h-3 mr-1.5 border flex-shrink-0 flex items-center justify-center"
                      style={{
                        backgroundColor: isSelected
                          ? "#CAFF04"
                          : "transparent",
                        borderColor: isSelected
                          ? "#CAFF04"
                          : "var(--border)",
                      }}
                    >
                      {isSelected && (
                        <svg
                          width="8"
                          height="8"
                          viewBox="0 0 10 10"
                          fill="none"
                          stroke="#0A0A0A"
                          strokeWidth="2"
                          strokeLinecap="square"
                        >
                          <path d="M2 5l2.5 2.5L8 3" />
                        </svg>
                      )}
                    </div>
                    {option}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Simple Dropdown ───

export function SimpleFilter({
  label,
  resetLabel,
  options,
  value,
  onChange,
}: {
  label: string;
  resetLabel: string;
  options: { label: string; value: string; count?: number }[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeLabel = options.find((o) => o.value === value)?.label;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          suppressHydrationWarning
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors"
          style={{
            fontFamily: "var(--font-mono)",
            backgroundColor: value ? "rgba(202,255,4,0.06)" : "transparent",
            borderColor: value ? "rgba(202,255,4,0.3)" : "var(--border)",
            color: value ? "#CAFF04" : "var(--muted-foreground)",
          }}
        >
          {activeLabel || label}
          <ChevronDown className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="p-1 border-2 w-[180px]"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--card)",
          borderRadius: 0,
        }}
      >
        {value && (
          <button
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-white/[0.04]"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            <X className="w-3 h-3 opacity-50" />
            {resetLabel}
          </button>
        )}
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => {
              onChange(option.value === value ? null : option.value);
              setOpen(false);
            }}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-white/[0.04]"
            style={{ fontFamily: "var(--font-mono)", borderRadius: 0 }}
          >
            {value === option.value ? (
              <Check className="w-3 h-3 text-[#CAFF04]" />
            ) : (
              <span className="w-3" />
            )}
            <span className="flex-1 text-left">{option.label}</span>
            {option.count !== undefined && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 ml-1"
                style={{
                  fontFamily: "var(--font-mono)",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  color: "var(--muted-foreground)",
                }}
              >
                {option.count}
              </span>
            )}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ─── Multi-Select Simple Dropdown ───

export function MultiSimpleFilter({
  label,
  resetLabel,
  selectedText,
  options,
  value,
  onChange,
}: {
  label: string;
  resetLabel: string;
  selectedText: (count: number) => string;
  options: { label: string; value: string; count?: number }[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasSelection = value.length > 0;

  const displayLabel =
    value.length === 0
      ? label
      : value.length === 1
      ? options.find((o) => o.value === value[0])?.label || value[0]
      : selectedText(value.length);

  function toggleOption(val: string) {
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          suppressHydrationWarning
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors"
          style={{
            fontFamily: "var(--font-mono)",
            backgroundColor: hasSelection
              ? "rgba(202,255,4,0.06)"
              : "transparent",
            borderColor: hasSelection
              ? "rgba(202,255,4,0.3)"
              : "var(--border)",
            color: hasSelection ? "#CAFF04" : "var(--muted-foreground)",
          }}
        >
          {displayLabel}
          {hasSelection && value.length > 1 && (
            <span
              className="text-[9px] font-bold px-1 py-0.5 ml-0.5"
              style={{
                backgroundColor: "rgba(202,255,4,0.15)",
                color: "#CAFF04",
              }}
            >
              {value.length}
            </span>
          )}
          <ChevronDown className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="p-1 border-2 w-[200px]"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--card)",
          borderRadius: 0,
        }}
      >
        {hasSelection && (
          <button
            onClick={() => {
              onChange([]);
              setOpen(false);
            }}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-white/[0.04]"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            <X className="w-3 h-3 opacity-50" />
            {resetLabel}
          </button>
        )}
        {options.map((option) => {
          const isSelected = value.includes(option.value);
          return (
            <button
              key={option.value}
              onClick={() => toggleOption(option.value)}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors hover:bg-white/[0.04]"
              style={{ fontFamily: "var(--font-mono)", borderRadius: 0 }}
            >
              <div
                className="w-3 h-3 border flex-shrink-0 flex items-center justify-center"
                style={{
                  backgroundColor: isSelected ? "#CAFF04" : "transparent",
                  borderColor: isSelected ? "#CAFF04" : "var(--border)",
                }}
              >
                {isSelected && (
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 10 10"
                    fill="none"
                    stroke="#0A0A0A"
                    strokeWidth="2"
                    strokeLinecap="square"
                  >
                    <path d="M2 5l2.5 2.5L8 3" />
                  </svg>
                )}
              </div>
              <span className="flex-1 text-left">{option.label}</span>
              {option.count !== undefined && (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 ml-1"
                  style={{
                    fontFamily: "var(--font-mono)",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  {option.count}
                </span>
              )}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

// ─── Toggle Button Group ───

export function ToggleGroup({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string; icon: React.ReactNode }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] border-2 transition-colors -ml-[2px] first:ml-0"
          style={{
            fontFamily: "var(--font-mono)",
            backgroundColor:
              value === opt.value ? "rgba(202,255,4,0.06)" : "transparent",
            borderColor:
              value === opt.value ? "rgba(202,255,4,0.3)" : "var(--border)",
            color:
              value === opt.value ? "#CAFF04" : "var(--muted-foreground)",
            zIndex: value === opt.value ? 1 : 0,
          }}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}
