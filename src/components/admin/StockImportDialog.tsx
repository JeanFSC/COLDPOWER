"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import type { previewStockImport } from "@/lib/stock-import-service";

type Preview = Awaited<ReturnType<typeof previewStockImport>>;
export function StockImportDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [applied, setApplied] = useState(false);
  async function submit(mode: "preview" | "apply") {
    if (!file || busy || (mode === "apply" && (!preview?.canApply || applied))) return;
    setBusy(true); setMessage("");
    const form = new FormData(); form.set("file", file); form.set("mode", mode);
    if (preview) form.set("fingerprint", preview.fingerprint);
    try {
      const response = await fetch("/api/admin/inventario/import", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "No se pudo procesar el archivo.");
      if (mode === "preview") { setPreview(body.preview); }
      else { setApplied(true); setMessage(`${body.result.replayed ? "Lote ya aplicado; no se duplicó el stock" : "Importación aplicada"}: ${body.result.rows} ${body.result.rows === 1 ? "fila" : "filas"}.`); router.refresh(); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo importar."); if (mode === "preview") setPreview(null); }
    finally { setBusy(false); }
  }
  return <>
    <button type="button" onClick={() => { setFile(null); setPreview(null); setMessage(""); setApplied(false); setOpen(true); }} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-extrabold text-slate-600 hover:border-blue-300">Importar stock</button>
    <AdminDrawer open={open} onClose={() => { if (!busy) setOpen(false); }} title="Importar stock inicial">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">Carga saldos iniciales por SKU exacto y código de local. No reemplaza existencias ni reservas. Para modificar saldos existentes utiliza Ajustar inventario.</p>
        <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Columnas: <strong>sku, local, cantidad</strong>. Cantidades enteras positivas. XLSX, XLS o CSV; máximo 5 MB y 1000 filas. En Excel se procesa únicamente la primera hoja. Todo el lote se aplica junto o se rechaza.</p>
        <label className="grid gap-2 text-sm font-semibold">Archivo de stock<input type="file" accept=".xlsx,.xls,.csv" disabled={busy} onChange={event => { setFile(event.target.files?.[0] ?? null); setPreview(null); setMessage(""); setApplied(false); }} className="w-full rounded-lg border border-slate-200 p-2 text-sm" /></label>
        <button type="button" disabled={!file || busy || applied} onClick={() => submit("preview")} className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-bold text-blue-700 disabled:opacity-50">{busy ? "Procesando…" : "Validar archivo"}</button>
        {preview ? <section aria-label="Vista previa de importación" className="space-y-3">
          <p className="text-sm font-semibold">{preview.rows.length} {preview.rows.length === 1 ? "fila identificada" : "filas identificadas"} · {preview.errors.length} {preview.errors.length === 1 ? "error" : "errores"}</p>
          {preview.errors.length ? <ul className="max-h-48 overflow-auto rounded-lg bg-rose-50 p-4 text-sm text-rose-800" aria-label="Errores del archivo">{preview.errors.map((error,index) => <li key={index}>{error}</li>)}</ul> : null}
          <div className="max-h-72 overflow-auto rounded-lg border border-slate-200"><table className="w-full text-left text-xs"><thead><tr><th className="p-2">SKU</th><th className="p-2">Local</th><th className="p-2">Cantidad inicial</th></tr></thead><tbody>{preview.rows.map(row => <tr key={`${row.productId}:${row.locationCode}`} className="border-t border-slate-100"><td className="p-2 font-mono">{row.sku}</td><td className="p-2">{row.locationCode}</td><td className="p-2">{row.quantity}</td></tr>)}</tbody></table></div>
          <button type="button" disabled={!preview.canApply || busy || applied} onClick={() => submit("apply")} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Confirmar importación de stock</button>
        </section> : null}
        {message ? <p role="status" className={`rounded-lg p-3 text-sm ${applied ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{message}</p> : null}
      </div>
    </AdminDrawer>
  </>;
}
