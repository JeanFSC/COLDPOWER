"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export type AdminSelectOption = { value: string; label: string };

export function AdminSelect({
  ariaLabel,
  className = "",
  disabled = false,
  name,
  onValueChange,
  options,
  value,
}: {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  name?: string;
  onValueChange?: (value: string) => void;
  options: AdminSelectOption[];
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const currentValue = onValueChange ? value : localValue;
  const selected = options.find((option) => option.value === currentValue) ?? options[0];

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function select(nextValue: string) {
    setOpen(false);
    setLocalValue(nextValue);
    onValueChange?.(nextValue);
  }

  return (
    <div ref={root} className={`relative ${className}`}>
      {name ? <input type="hidden" name={name} value={currentValue} /> : null}
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-55"
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 top-full z-30 mt-1.5 max-h-64 min-w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_14px_32px_rgba(15,23,42,0.15)]"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === currentValue}
              onClick={() => select(option.value)}
              className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-xs transition hover:bg-slate-50 ${option.value === value ? "font-semibold text-blue-600" : "text-slate-700"}`}
            >
              <span className="truncate">{option.label}</span>
              {option.value === currentValue ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
