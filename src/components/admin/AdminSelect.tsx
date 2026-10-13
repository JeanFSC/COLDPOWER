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
  const trigger = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const initialFocus = useRef(0);
  const listId = useId();
  const currentValue = onValueChange ? value : localValue;
  const selected = options.find((option) => option.value === currentValue) ?? options[0];

  useEffect(() => {
    if (open) optionRefs.current[initialFocus.current]?.focus();
  }, [open]);

  function openOptions() {
    initialFocus.current = Math.max(0, options.findIndex((option) => option.value === currentValue));
    setOpen(true);
  }

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
    trigger.current?.focus();
  }

  return (
    <div ref={root} className={`relative ${className}`}>
      {name ? <input type="hidden" name={name} value={currentValue} /> : null}
      <button
        ref={trigger}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => open ? setOpen(false) : openOptions()}
        onKeyDown={(event) => {
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            openOptions();
            if (event.key === "Home") initialFocus.current = 0;
            if (event.key === "End") initialFocus.current = options.length - 1;
          }
        }}
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
          className="absolute left-0 top-full z-30 mt-1.5 max-h-64 w-full min-w-0 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_14px_32px_rgba(15,23,42,0.15)]"
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              ref={(element) => { optionRefs.current[index] = element; }}
              type="button"
              role="option"
              aria-selected={option.value === currentValue}
              onClick={() => select(option.value)}
              onKeyDown={(event) => {
                let next = index;
                if (event.key === "ArrowDown") next = (index + 1) % options.length;
                else if (event.key === "ArrowUp") next = (index - 1 + options.length) % options.length;
                else if (event.key === "Home") next = 0;
                else if (event.key === "End") next = options.length - 1;
                else if (event.key === "Escape") {
                  event.preventDefault();
                  setOpen(false);
                  trigger.current?.focus();
                  return;
                } else if (event.key === "Tab") {
                  setOpen(false);
                  trigger.current?.focus();
                  return;
                } else return;
                event.preventDefault();
                optionRefs.current[next]?.focus();
              }}
              className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-xs transition hover:bg-slate-50 ${option.value === value ? "font-semibold text-blue-600" : "text-slate-700"}`}
            >
              <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{option.label}</span>
              {option.value === currentValue ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
