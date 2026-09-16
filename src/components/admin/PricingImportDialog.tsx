"use client";

import { useState } from "react";
import { Check, CircleAlert, FileSpreadsheet, RefreshCw } from "lucide-react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import type { PricingImportPreview } from "@/lib/pricing-import-service";

const field = "h-10 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
const muted = "text-slate-400";

type Props = { open: boolean; canEdit: boolean; onClose: () => void; onSaved: (message: string) => void };

function formatResult(result: PricingImportPreview["rows"][number]["result"]) {
  return result === "new" ? "Nuevo" : result === "change" ? "Cambio" : "Bloqueado";
}

export function PricingImportDialog({ open, canEdit, onClose, onSaved }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<PricingImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function reset() { setFile(null); setReason(""); setPreview(null); setBusy(false); setError(""); }
  function close() { reset(); onClose(); }

  async function send(mode: "dry-run" | "apply") {
    if (!file) { setError("Selecciona un archivo XLSX o CSV."); return; }
    if (mode === "apply" && !preview) { setError("Ejecuta la revisión previa antes de aplicar la lista."); return; }
    if (mode === "apply" && preview?.errors) { setError("Corrige las filas bloqueadas antes de aplicar la lista."); return; }
    setBusy(true); setError("");
    try {
      const data = new FormData();
      data.set("file", file);
      data.set("mode", mode);
      data.set("reason", reason.trim());
      const response = await fetch("/api/admin/precios/import", { method: "POST", body: data });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message ?? "No se pudo procesar la lista.");
      if (mode === "dry-run") setPreview(payload.preview as PricingImportPreview);
      else { onSaved(`${payload.result?.newPrices ?? 0} precios nuevos y ${payload.result?.changes ?? 0} cambios aplicados.`); close(); }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No se pudo procesar la lista."); } finally { setBusy(false); }
  }

  return <AdminDrawer open={open} onClose={close} title="Importar lista de precios">
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><div className="flex gap-3"><FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" /><div><p className="text-[11px] font-black text-slate-900">Carga controlada</p><p className={`mt-1 text-[10px] font-semibold leading-5 ${muted}`}>Usa una fila por SKU. Las celdas vacías no modifican precios; cero y SKU desconocido se bloquean.</p></div></div></div>
      <label><span className={`mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>Archivo XLSX o CSV</span><input type="file" accept=".xlsx,.xls,.csv" disabled={!canEdit || busy} onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPreview(null); setError(""); }} className={`${field} w-full file:mr-3 file:border-0 file:bg-transparent file:text-[10px] file:font-extrabold file:text-blue-600`} /></label>
      <label><span className={`mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>Motivo por defecto</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} disabled={!canEdit || busy} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[11px] font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="Se usa cuando una fila no incluye Motivo…" /></label>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={!canEdit || busy || !file} onClick={() => void send("dry-run")} className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-3.5 text-[10px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45"><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} aria-hidden="true" />{busy ? "Revisando…" : "Revisar lista"}</button><button type="button" disabled={!canEdit || busy || !preview || Boolean(preview?.errors)} onClick={() => void send("apply")} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-3.5 text-[10px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45"><Check className="h-4 w-4" aria-hidden="true" />Aplicar lista</button></div>
      {preview ? <div className="space-y-4"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><span className={`text-[9px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>Filas leídas</span><strong className="mt-1 block text-[18px] font-black text-slate-900">{preview.rowsRead}</strong></div><div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><span className={`text-[9px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>SKU encontrados</span><strong className="mt-1 block text-[18px] font-black text-emerald-600">{preview.skuFound}</strong></div><div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><span className={`text-[9px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>Cambios</span><strong className="mt-1 block text-[18px] font-black text-blue-600">{preview.newPrices + preview.changes}</strong></div><div className="rounded-xl border border-rose-200 bg-rose-50 p-3"><span className={`text-[9px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>Bloqueados</span><strong className="mt-1 block text-[18px] font-black text-rose-600">{preview.errors}</strong></div></div><div className="overflow-x-auto rounded-xl border border-slate-100"><table className="w-full min-w-[620px] text-left text-[10px]"><thead className="bg-slate-50 text-[9px] font-extrabold uppercase tracking-[0.08em] text-slate-400"><tr><th className="px-3 py-2.5">SKU</th><th className="px-3 py-2.5">Tipo</th><th className="px-3 py-2.5">Actual</th><th className="px-3 py-2.5">Nuevo</th><th className="px-3 py-2.5">Resultado</th><th className="px-3 py-2.5">Motivo</th></tr></thead><tbody>{preview.rows.slice(0, 100).map((row) => <tr key={`${row.rowNumber}-${row.priceType ?? "none"}`} className="border-t border-slate-100"><td className="px-3 py-2 font-mono font-bold text-slate-700">{row.sku || "—"}</td><td className="px-3 py-2 font-bold text-slate-700">{row.priceType ?? "—"}</td><td className="px-3 py-2 text-slate-400">{row.currentAmount ? `${row.currentAmount} ${row.currency ?? ""}` : "—"}</td><td className="px-3 py-2 font-black text-slate-900">{row.newAmount ? `${row.newAmount} ${row.currency ?? ""}` : "—"}</td><td className="px-3 py-2"><span className={`rounded-md border px-2 py-1 text-[9px] font-extrabold ${row.result === "blocked" ? "border-rose-200 bg-rose-50 text-rose-600" : row.result === "new" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-blue-50 text-blue-600"}`}>{formatResult(row.result)}</span></td><td className="max-w-[220px] px-3 py-2 font-semibold text-slate-400">{row.message}</td></tr>)}</tbody></table></div>{preview.rows.length > 100 ? <p className={`text-[10px] font-semibold ${muted}`}>Mostrando 100 filas de {preview.rows.length}; la aplicación usa el conjunto completo validado.</p> : null}</div> : null}
      {error ? <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] font-bold text-rose-600"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{error}</p> : null}
    </div>
  </AdminDrawer>;
}
