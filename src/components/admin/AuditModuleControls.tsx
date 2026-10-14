"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Copy, Filter, ListFilter } from "lucide-react";
import type { AuditSavedFilter } from "@/lib/audit-contract";
import { apiErrorMessage } from "@/lib/api-error-message";

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
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const running = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const formId = useId();
  useEffect(() => { if (open) input.current?.focus(); }, [open]);

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (running.current) return;
    if (!name.trim() || name.trim().length > 80) {
      setFailed(true);
      setMessage("Escribe un nombre de entre 1 y 80 caracteres.");
      return;
    }
    running.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const filters = Object.fromEntries(new URLSearchParams(currentQuery).entries());
      const response = await fetch("/api/admin/auditoria/filtros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), filters }),
      });
      const result = await response.json().catch(() => null) as { error?: unknown } | null;
      if (!response.ok) {
        setFailed(true);
        setMessage(apiErrorMessage(result?.error, "No se pudo guardar el filtro."));
        return;
      }
      setFailed(false);
      setMessage("Filtro guardado. Puedes aplicarlo desde Más filtros.");
      setName("");
      close();
      router.refresh();
    } catch {
      setFailed(true);
      setMessage("No se pudo confirmar el guardado. Revisa Más filtros antes de volver a intentarlo.");
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button ref={trigger} type="button" onClick={() => { setMessage(null); setOpen(current => !current); }} disabled={busy} aria-expanded={open} aria-controls={formId} className={className}>
        <Filter className="h-3.5 w-3.5" />
        <span>{busy ? "Guardando…" : "Guardar filtro"}</span>
      </button>
      {open ? <form id={formId} aria-label="Guardar filtro de auditoría" onSubmit={save} onKeyDown={event => { if (event.key === "Escape" && !busy) { event.preventDefault(); close(); } }} className="absolute right-0 top-full z-30 mt-2 w-80 max-w-[calc(100vw-3rem)] rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
        <label className="block text-xs font-semibold text-slate-700">Nombre del filtro
          <input ref={input} required maxLength={80} value={name} disabled={busy} onChange={event => setName(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
        </label>
        <p className="mt-2 text-[11px] text-slate-500">Guarda los criterios aplicados para usarlos de nuevo.</p>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={close} className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600">Cancelar</button>
          <button type="submit" disabled={busy} aria-busy={busy} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{busy ? "Guardando…" : "Guardar"}</button>
        </div>
      </form> : null}
      {message ? <p role={failed ? "alert" : "status"} className={`mt-2 max-w-80 text-xs ${failed ? "text-rose-700" : "text-emerald-700"}`}>{message}</p> : null}
    </div>
  );
}

export function SavedFiltersMenu({ savedFilters, className, unavailable = false }: { savedFilters: AuditSavedFilter[]; className: string; unavailable?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AuditSavedFilter | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleting = useRef(false);
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
    if (deleting.current) return;
    deleting.current = true;
    setDeleteError(null);
    setBusyId(filter.id);
    try {
      const response = await fetch("/api/admin/auditoria/filtros", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: filter.id }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setDeleteError(apiErrorMessage(payload?.error, "No se pudo eliminar el filtro."));
        return;
      }
      setPendingDelete(null);
      router.refresh();
    } catch {
      setDeleteError("No se pudo confirmar la eliminación. Actualiza los filtros antes de volver a intentarlo.");
    } finally {
      deleting.current = false;
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
          {unavailable ? <p role="alert" className="px-2 py-2 text-xs text-amber-800">No se pudieron cargar los filtros guardados. Actualiza la página para volver a intentarlo.</p> : savedFilters.length ? (
            savedFilters.map((filter) => (
              <div key={filter.id} className="flex items-center gap-1 rounded-md hover:bg-slate-50">
                <a
                  href={`/admin/auditoria?${new URLSearchParams(filter.filters as Record<string, string>).toString()}`}
                  className="min-w-0 flex-1 truncate px-2 py-1.5 text-xs font-medium text-slate-700"
                >
                  {filter.name}
                </a>
                <button type="button" onClick={() => { setPendingDelete(filter); setDeleteError(null); }} disabled={busyId !== null} className="mr-1 rounded px-1.5 py-1 text-[10px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50" aria-label={`Eliminar filtro ${filter.name}`}>
                  Eliminar
                </button>
              </div>
            ))
          ) : (
            <p className="px-2 py-2 text-[11px] text-slate-400">Aún no guardaste ningún filtro.</p>
          )}
          {pendingDelete ? <section aria-label="Confirmar eliminación del filtro" onKeyDown={event => { if (event.key === "Escape" && !deleting.current) { event.preventDefault(); event.stopPropagation(); setPendingDelete(null); setDeleteError(null); } }} className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
            <p className="break-words text-xs text-slate-700">¿Eliminar el filtro «{pendingDelete.name}»? Los registros de auditoría se conservan.</p>
            {deleteError ? <p role="alert" className="mt-2 text-xs text-rose-700">{deleteError}</p> : null}
            <div className="mt-3 flex justify-end gap-2">
              <button autoFocus type="button" disabled={busyId !== null} onClick={() => { setPendingDelete(null); setDeleteError(null); }} className="rounded border border-slate-300 px-2 py-1 text-xs">Cancelar</button>
              <button type="button" disabled={busyId !== null} onClick={() => void removeFilter(pendingDelete)} className="rounded bg-rose-700 px-2 py-1 text-xs text-white disabled:opacity-50">{busyId ? "Eliminando…" : "Confirmar eliminación"}</button>
            </div>
          </section> : null}
        </div>
      ) : null}
    </div>
  );
}
