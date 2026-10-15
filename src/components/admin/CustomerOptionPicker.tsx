"use client";

import { Check, ChevronDown, LoaderCircle, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type CustomerOption = { id: string; name: string; reference: string | null };

export function CustomerOptionPicker({
  ariaLabel,
  disabled = false,
  excludeId,
  onChange,
  placeholder = "Buscar por nombre, documento o teléfono",
  value,
}: {
  ariaLabel: string;
  disabled?: boolean;
  excludeId?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CustomerOption | null>(null);
  const [items, setItems] = useState<CustomerOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const displayedCustomer = selected?.id === value ? selected : null;

  useEffect(() => {
    if (!open || query.trim().length < 2) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setNotice(null);
      try {
        const params = new URLSearchParams({ q: query.trim() });
        if (excludeId) params.set("exclude", excludeId);
        const response = await fetch(`/api/admin/clientes/opciones?${params.toString()}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json().catch(() => null) as { items?: unknown; error?: { message?: string } } | null;
        if (!response.ok) throw new Error(data?.error?.message || "No se pudieron buscar clientes.");
        const nextItems = Array.isArray(data?.items) ? data.items as CustomerOption[] : [];
        setItems(nextItems);
        setActiveIndex(0);
      } catch (error) {
        if (controller.signal.aborted) return;
        setItems([]);
        setNotice(error instanceof Error ? error.message : "No se pudieron buscar clientes.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [excludeId, open, query]);

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  function choose(customer: CustomerOption) {
    setSelected(customer);
    setQuery("");
    setItems([]);
    setNotice(null);
    setOpen(false);
    onChange(customer.id);
  }

  return (
    <div ref={root} className="relative min-w-0">
      <div className="flex h-10 items-center gap-2 rounded-lg border border-[#d5e0e9] bg-white px-3 focus-within:border-[#2277ee] focus-within:ring-2 focus-within:ring-[#2277ee]/10">
        <Search className="h-4 w-4 shrink-0 text-[#70869a]" aria-hidden="true" />
        <input
          role="combobox"
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && items[activeIndex] ? `${listId}-option-${activeIndex}` : undefined}
          value={open ? query : displayedCustomer?.name ?? ""}
          disabled={disabled}
          placeholder={displayedCustomer ? `${displayedCustomer.name}${displayedCustomer.reference ? ` · ${displayedCustomer.reference}` : ""}` : placeholder}
          onFocus={() => {
            if (displayedCustomer) setQuery(displayedCustomer.name);
            setOpen(true);
          }}
          onChange={(event) => {
            const next = event.currentTarget.value;
            if (value) {
              setSelected(null);
              onChange("");
            }
            setQuery(next);
            setItems([]);
            setLoading(next.trim().length >= 2);
            setNotice(null);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") { event.preventDefault(); setOpen(false); return; }
            if (!open || !items.length) return;
            if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => (index + 1) % items.length); }
            else if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => (index - 1 + items.length) % items.length); }
            else if (event.key === "Enter") { event.preventDefault(); choose(items[activeIndex]); }
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-[12px] font-semibold text-[#173654] outline-none placeholder:text-[#8296a9] disabled:cursor-not-allowed"
        />
        {loading ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-[#2563eb]" aria-hidden="true" /> : null}
        {value && !disabled ? <button type="button" onClick={() => { setSelected(null); setQuery(""); setItems([]); setOpen(false); onChange(""); }} className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#526b84] hover:bg-slate-100" aria-label={`Limpiar ${ariaLabel}`}><X className="h-3.5 w-3.5" aria-hidden="true" /></button> : <ChevronDown className={`h-4 w-4 shrink-0 text-[#8296a9] transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />}
      </div>
        {displayedCustomer && !open ? <p className="mt-1 truncate text-[10px] font-semibold text-[#526b84]">{displayedCustomer.reference || "Cliente seleccionado"}</p> : null}
      {open ? (
        <div id={listId} role="listbox" aria-label={`Resultados de ${ariaLabel}`} className="absolute left-0 right-0 top-full z-40 mt-1 max-h-60 overflow-y-auto rounded-lg border border-[#dce6ee] bg-white p-1.5 shadow-[0_12px_28px_rgba(16,42,67,0.16)]">
          {query.trim().length < 2 ? <p className="px-3 py-2 text-[11px] font-semibold text-[#526b84]">Escribe al menos 2 caracteres para buscar.</p> : null}
          {query.trim().length >= 2 && loading && !items.length ? <p className="px-3 py-2 text-[11px] font-semibold text-[#526b84]">Buscando clientes…</p> : null}
          {notice ? <p role="alert" className="px-3 py-2 text-[11px] font-semibold text-[#b42318]">{notice}</p> : null}
          {query.trim().length >= 2 && !loading && !notice && !items.length ? <p className="px-3 py-2 text-[11px] font-semibold text-[#526b84]">No se encontraron clientes activos o prospectos.</p> : null}
          {items.map((customer, index) => (
            <button key={customer.id} id={`${listId}-option-${index}`} type="button" role="option" aria-selected={index === activeIndex} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(customer)} className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-[12px] ${index === activeIndex ? "bg-[#f1f6fc]" : "hover:bg-[#f7fafc]"}`}>
              <span className="min-w-0"><span className="block truncate font-bold text-[#173654]">{customer.name}</span>{customer.reference ? <span className="mt-0.5 block truncate font-mono text-[10px] font-semibold text-[#526b84]">{customer.reference}</span> : null}</span>
              {customer.id === value ? <Check className="h-4 w-4 shrink-0 text-[#2563eb]" aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
