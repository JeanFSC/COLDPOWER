"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy, Filter, ListFilter } from "lucide-react";
import type { AuditSavedFilter } from "@/lib/audit-contract";

// Custom dropdown replacing a native <select> for the toolbar filters — a native
// select's closed control can be restyled, but its open option list is always
// OS-rendered and looks inconsistent with the rest of the app. Selecting an option
// navigates immediately (no separate "Aplicar" click needed for these two).
export function FilterDropdown({
  label, options, value, paramName, currentQuery,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  value?: string;
  paramName: string;
  currentQuery: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((option) => option.value === (value ?? "")) ?? options[0];

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function select(optionValue: string) {
    setOpen(false);
    const params = new URLSearchParams(currentQuery);
    if (optionValue) params.set(paramName, optionValue);
    else params.delete(paramName);
    params.delete("page");
    params.delete("eventId");
    params.delete("tab");
    router.push(`/admin/auditoria${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
      >
        <span className="text-[11px] text-slate-400">{label}</span>
        <span className="font-medium text-slate-700">{current?.label ?? "Todos"}</span>
        <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-20 mt-1.5 max-h-72 w-56 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-[0_12px_28px_rgba(16,42,67,0.14)]">
          {options.map((option) => (
            <button
              key={option.value || "all"}
              type="button"
              onClick={() => select(option.value)}
              className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-slate-50 ${
                option.value === current?.value ? "font-semibold text-blue-600" : "text-slate-700"
              }`}
            >
              <span className="truncate">{option.label}</span>
              {option.value === current?.value ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CopyButton({ value, className = "text-slate-400 hover:text-slate-600" }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard permission denied — nothing useful to recover here beyond staying silent.
        }
      }}
      aria-label="Copiar"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function SaveFilterButton({ currentQuery, className }: { currentQuery: string; className: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function save() {
    const name = window.prompt("Nombre para este filtro:");
    if (!name || !name.trim()) return;
    setBusy(true);
    try {
      const filters = Object.fromEntries(new URLSearchParams(currentQuery).entries());
      const response = await fetch("/api/admin/auditoria/filtros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), filters }),
      });
      if (response.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={save} disabled={busy} className={className}>
      <Filter className="h-3.5 w-3.5" />
      <span>{busy ? "Guardando…" : "Guardar filtro"}</span>
    </button>
  );
}

export function SavedFiltersMenu({ savedFilters, className }: { savedFilters: AuditSavedFilter[]; className: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function removeFilter(filter: AuditSavedFilter) {
    if (!window.confirm(`Eliminar el filtro guardado "${filter.name}"?`)) return;
    setBusyId(filter.id);
    try {
      const response = await fetch("/api/admin/auditoria/filtros", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: filter.id }),
      });
      if (response.ok) router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((current) => !current)} className={className}>
        <ListFilter className="h-3.5 w-3.5 text-slate-500" />
        <span>Más filtros</span>
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-20 mt-1.5 w-64 rounded-lg border border-slate-200 bg-white p-1.5 shadow-[0_12px_28px_rgba(16,42,67,0.14)]">
          <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Filtros guardados</p>
          {savedFilters.length ? (
            savedFilters.map((filter) => (
              <div key={filter.id} className="flex items-center gap-1 rounded-md hover:bg-slate-50">
                <a
                  href={`/admin/auditoria?${new URLSearchParams(filter.filters as Record<string, string>).toString()}`}
                  className="min-w-0 flex-1 truncate px-2 py-1.5 text-xs font-medium text-slate-700"
                >
                  {filter.name}
                </a>
                <button type="button" onClick={() => void removeFilter(filter)} disabled={busyId === filter.id} className="mr-1 rounded px-1.5 py-1 text-[10px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50" aria-label={`Eliminar filtro ${filter.name}`}>
                  Eliminar
                </button>
              </div>
            ))
          ) : (
            <p className="px-2 py-2 text-[11px] text-slate-400">Aún no guardaste ningún filtro.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
