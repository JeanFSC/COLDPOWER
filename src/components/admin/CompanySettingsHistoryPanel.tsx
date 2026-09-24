"use client";

import { useEffect, useMemo, useState } from "react";
import { History, LoaderCircle, RotateCcw } from "lucide-react";

type HistoryItem = {
  id: string;
  version: number;
  actorId: string | null;
  actorRole: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown>;
  createdAt: string;
};

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "N/D";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function CompanySettingsHistoryPanel({ currentVersion }: { currentVersion: number }) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [confirmVersion, setConfirmVersion] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const response = await fetch("/api/admin/configuracion/historial?pageSize=25", { cache: "no-store" });
      const result = await response.json() as { items?: HistoryItem[]; error?: string; errorObject?: { message?: string } };
      if (!response.ok) throw new Error(result.errorObject?.message || result.error || "No se pudo cargar el historial.");
      const nextItems = result.items ?? [];
      setItems(nextItems);
      setSelectedVersion((current) => current ?? nextItems[0]?.version ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar el historial.");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function restore(version: number) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/configuracion/restaurar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version, expectedVersion: currentVersion }),
      });
      const result = await response.json() as { error?: string; errorObject?: { message?: string } };
      if (!response.ok) throw new Error(result.errorObject?.message || result.error || "No se pudo restaurar la configuración.");
      setConfirmVersion(null);
      await load();
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo restaurar la configuración.");
    } finally {
      setBusy(false);
    }
  }

  const selected = items.find((item) => item.version === selectedVersion) ?? null;
  const diff = useMemo(() => {
    if (!selected) return [];
    const keys = new Set([...Object.keys(selected.before ?? {}), ...Object.keys(selected.after ?? {})]);
    return [...keys].filter((key) => JSON.stringify(selected.before?.[key]) !== JSON.stringify(selected.after?.[key])).sort().map((key) => ({ key, before: selected.before?.[key], after: selected.after?.[key] }));
  }, [selected]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs" aria-labelledby="settings-history-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600"><History className="h-4 w-4" /></span>
          <div><h2 id="settings-history-title" className="text-xs font-bold text-slate-900">Historial y restauración</h2><p className="mt-1 text-[11px] text-slate-500">Cada guardado crea una versión auditable. Restaurar genera una nueva versión.</p></div>
        </div>
        <button type="button" onClick={() => void load()} disabled={busy} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">Actualizar</button>
      </div>
      {error ? <div role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-[11px] font-medium text-rose-700">{error}</div> : null}
      <div className="mt-4 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="space-y-1">
          {items.length ? items.map((item) => (
            <button key={item.id} type="button" onClick={() => setSelectedVersion(item.version)} className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left ${selectedVersion === item.version ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200"}`}>
              <span><span className="block text-[11px] font-bold">Versión {item.version}</span><span className="mt-0.5 block text-[10px]">{new Date(item.createdAt).toLocaleString("es-PE")}</span></span>
              <span className="text-[10px] font-semibold">{item.actorRole ?? "Sistema"}</span>
            </button>
          )) : <p className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-[11px] text-slate-400">No hay versiones guardadas.</p>}
        </div>
        <div className="min-w-0 rounded-lg border border-slate-100 bg-slate-50/70 p-3">
          {selected ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-bold text-slate-800">Versión {selected.version}</p><p className="mt-0.5 text-[10px] text-slate-400">{selected.actorId ?? "Sistema"}</p></div><button type="button" onClick={() => setConfirmVersion(selected.version)} disabled={selected.version === currentVersion || busy} className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"><RotateCcw className="h-3 w-3" />Restaurar</button></div>
              <div className="mt-3 overflow-x-auto rounded-md border border-slate-200 bg-white"><table className="w-full min-w-[480px] text-left text-[10px]"><thead className="border-b border-slate-100 bg-slate-50 text-[9px] uppercase tracking-wide text-slate-400"><tr><th className="px-2.5 py-2">Campo</th><th className="px-2.5 py-2">Antes</th><th className="px-2.5 py-2">Después</th></tr></thead><tbody className="divide-y divide-slate-100">{diff.length ? diff.map((row) => <tr key={row.key}><td className="px-2.5 py-2 font-semibold text-slate-600">{row.key}</td><td className="max-w-[220px] px-2.5 py-2 text-slate-400">{displayValue(row.before)}</td><td className="max-w-[220px] px-2.5 py-2 text-slate-700">{displayValue(row.after)}</td></tr>) : <tr><td colSpan={3} className="px-2.5 py-5 text-center text-slate-400">Sin cambios comparables en esta versión.</td></tr>}</tbody></table></div>
            </>
          ) : <p className="py-6 text-center text-[11px] text-slate-400">Selecciona una versión para revisar sus cambios.</p>}
        </div>
      </div>
      {confirmVersion !== null ? <div role="alertdialog" aria-label="Confirmar restauración" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3"><p className="text-xs font-bold text-amber-900">¿Restaurar la versión {confirmVersion}?</p><p className="mt-1 text-[10px] leading-relaxed text-amber-700">Se creará una nueva versión usando la configuración seleccionada y quedará registrada en auditoría.</p><div className="mt-2 flex gap-2"><button type="button" onClick={() => void restore(confirmVersion)} disabled={busy}>{busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : "Confirmar restauración"}</button><button type="button" onClick={() => setConfirmVersion(null)} disabled={busy} className="rounded-md border border-amber-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-amber-800">Cancelar</button></div></div> : null}
    </section>
  );
}
