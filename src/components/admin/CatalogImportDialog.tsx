"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Check, FileSpreadsheet, Upload, X } from "lucide-react";
import type { CatalogImportPreview } from "@/lib/catalog-import-service";

type CatalogImportDialogProps = { canImport?: boolean; onCompleted: () => void };

export function CatalogImportDialog({ canImport = true, onCompleted }: CatalogImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CatalogImportPreview | null>(null);
  const [step, setStep] = useState<"file" | "preview" | "done">("file");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function reset() {
    setFile(null); setPreview(null); setStep("file"); setBusy(false); setMessage("");
    if (inputRef.current) inputRef.current.value = "";
  }
  function close() { setOpen(false); reset(); }
  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile); setPreview(null); setStep("file"); setMessage("");
  }
  async function send(mode: "dry-run" | "commit") {
    if (!file) { setMessage("Selecciona un archivo antes de continuar."); return; }
    setBusy(true); setMessage("");
    try {
      const body = new FormData(); body.set("file", file); body.set("mode", mode);
      const response = await fetch("/api/admin/catalogo/import", { method: "POST", body });
      const result = await response.json() as { preview?: CatalogImportPreview; result?: { created: number; skipped: number }; error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message || "No se pudo procesar la importación.");
      if (mode === "dry-run" && result.preview) { setPreview(result.preview); setStep("preview"); }
      if (mode === "commit" && result.result) { setMessage(`Importación confirmada: ${result.result.created} productos creados; ${result.result.skipped} SKU existentes omitidos.`); setStep("done"); onCompleted(); }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo procesar la importación.");
    } finally { setBusy(false); }
  }

  return <>
    {canImport ? <button type="button" onClick={() => { reset(); setOpen(true); }} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#dce6ee] bg-white px-3.5 text-[10px] font-extrabold text-[#304b66] transition hover:border-[#2277ee] hover:text-[#2277ee]"><Upload className="h-3.5 w-3.5" />Importar</button> : null}
    {open ? <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#102a43]/35 px-4 py-8 sm:py-12" role="presentation">
      <section className="w-full max-w-3xl rounded-2xl border border-[#dce6ee] bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="catalog-import-title">
        <div className="flex items-start justify-between gap-4 border-b border-[#edf2f6] px-5 py-4 sm:px-6"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#2277ee]">Gobierno del catálogo</p><h2 id="catalog-import-title" className="mt-1 text-[18px] font-black text-[#102a43]">Importar referencias</h2><p className="mt-1 text-[11px] font-semibold text-[#8195aa]">Valida primero. La confirmación crea productos en revisión y no sobrescribe SKU existentes.</p></div><button type="button" onClick={close} className="rounded-full p-2 text-[#71869c] hover:bg-[#f3f7fa]" aria-label="Cerrar importación"><X className="h-4 w-4" /></button></div>
        <div className="flex items-center gap-2 px-5 pt-4 text-[9px] font-extrabold text-[#8296a9] sm:px-6"><span className="inline-flex items-center gap-1.5 text-[#2277ee]"><b className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e8f1ff]">1</b>Archivo</span><span className="h-px flex-1 bg-[#dce6ee]" /><span className={`inline-flex items-center gap-1.5 ${step !== "file" ? "text-[#2277ee]" : ""}`}><b className={`flex h-5 w-5 items-center justify-center rounded-full ${step !== "file" ? "bg-[#e8f1ff]" : "bg-[#f3f6f8]"}`}>2</b>Previsualización</span><span className="h-px flex-1 bg-[#dce6ee]" /><span className={`inline-flex items-center gap-1.5 ${step === "done" ? "text-[#159263]" : ""}`}><b className={`flex h-5 w-5 items-center justify-center rounded-full ${step === "done" ? "bg-[#e5f7ee]" : "bg-[#f3f6f8]"}`}>3</b>Confirmación</span></div>
        <div className="p-5 sm:p-6">
          {step === "file" ? <div className="grid gap-4"><label htmlFor="catalog-import-file" className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#a9c8e8] bg-[#f8fbff] px-5 text-center transition hover:border-[#2277ee] hover:bg-[#f3f8ff]"><FileSpreadsheet className="h-9 w-9 text-[#2277ee]" /><span className="mt-3 text-[12px] font-extrabold text-[#304b66]">Selecciona XLSX, XLS o CSV</span><span className="mt-1 text-[10px] font-semibold text-[#8296a9]">Máximo 15 MB · el archivo se valida antes de persistir</span><input ref={inputRef} id="catalog-import-file" type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={selectFile} /></label>{file ? <div className="flex items-center gap-3 rounded-xl border border-[#dce6ee] px-3 py-3"><FileSpreadsheet className="h-5 w-5 text-[#159263]" /><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-extrabold text-[#304b66]">{file.name}</p><p className="mt-1 text-[9px] font-semibold text-[#8296a9]">{(file.size / 1024 / 1024).toFixed(2)} MB</p></div><Check className="h-4 w-4 text-[#159263]" aria-label="Archivo seleccionado" /></div> : null}{message ? <p className="rounded-lg border border-[#ffd0d0] bg-[#fff4f4] px-3 py-2 text-[10px] font-bold text-[#c94343]" role="alert">{message}</p> : null}<div className="flex justify-end"><button type="button" onClick={() => void send("dry-run")} disabled={!file || busy} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#102a43] px-4 text-[11px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45">{busy ? "Validando…" : "Validar y previsualizar"}</button></div></div> : null}
          {step === "preview" && preview ? <div className="grid gap-4"><div className="grid gap-2 sm:grid-cols-4"><PreviewStat label="Filas" value={preview.totalRows} /><PreviewStat label="Nuevas" value={preview.newRows} tone="green" /><PreviewStat label="Existentes" value={preview.existingRows} tone="blue" /><PreviewStat label="Bloqueadas" value={preview.errorRows + preview.warningRows} tone="red" /></div>{preview.unmappedColumns.length ? <p className="rounded-lg border border-[#f6d59c] bg-[#fff8ed] px-3 py-2 text-[10px] font-bold leading-5 text-[#9c5b00]">Hay columnas no mapeadas ({preview.unmappedColumns.join(", ")}). Corrige el archivo antes de confirmar para preservar toda la información de origen.</p> : null}<div className="overflow-x-auto rounded-xl border border-[#e2eaf1]"><table className="w-full min-w-[650px] text-left text-[10px]"><thead className="bg-[#fbfcfd] text-[8px] font-extrabold uppercase tracking-[0.06em] text-[#7d91a5]"><tr><th className="px-3 py-2.5">Fila</th><th className="px-3 py-2.5">SKU</th><th className="px-3 py-2.5">Producto</th><th className="px-3 py-2.5">Taxonomía</th><th className="px-3 py-2.5">Resultado</th></tr></thead><tbody>{preview.rows.slice(0, 12).map((row) => <tr key={row.rowNumber} className="border-t border-[#edf2f6]"><td className="px-3 py-2 font-mono text-[#8296a9]">{row.rowNumber}</td><td className="px-3 py-2 font-mono font-bold text-[#304b66]">{row.sku || "—"}</td><td className="max-w-[220px] truncate px-3 py-2 font-semibold text-[#526b84]">{row.name || "—"}</td><td className="px-3 py-2 text-[#526b84]">{row.category || "—"} / {row.family || "—"}</td><td className="px-3 py-2"><span className={`rounded-md border px-2 py-1 text-[9px] font-extrabold ${row.result === "new" ? "border-[#b8e6d1] bg-[#e8f8ef] text-[#13895a]" : row.result === "existing" ? "border-[#cddff0] bg-[#f3f8ff] text-[#2277ee]" : "border-[#ffd0d0] bg-[#fff0f0] text-[#d94848]"}`}>{row.result === "new" ? "Nueva" : row.result === "existing" ? "Existente" : row.message}</span></td></tr>)}</tbody></table></div>{preview.rows.length > 12 ? <p className="text-[9px] font-semibold text-[#8296a9]">Mostrando las primeras 12 filas de {preview.totalRows} para la revisión.</p> : null}{message ? <p className="rounded-lg border border-[#ffd0d0] bg-[#fff4f4] px-3 py-2 text-[10px] font-bold text-[#c94343]" role="alert">{message}</p> : null}<div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => { setStep("file"); setMessage(""); }} className="h-10 rounded-lg border border-[#dce6ee] px-4 text-[11px] font-extrabold text-[#526b84]">Cambiar archivo</button><button type="button" onClick={() => void send("commit")} disabled={busy || preview.newRows === 0 || preview.errorRows > 0 || preview.warningRows > 0} className="h-10 rounded-lg bg-[#159263] px-4 text-[11px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45">{busy ? "Importando…" : `Confirmar ${preview.newRows} nuevas`}</button></div></div> : null}
          {step === "done" ? <div className="grid justify-items-center gap-3 py-10 text-center"><span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#e5f7ee] text-[#159263]"><Check className="h-6 w-6" /></span><h3 className="text-[16px] font-black text-[#102a43]">Importación registrada</h3><p className="max-w-md text-[11px] font-semibold leading-5 text-[#8296a9]">{message || "Los productos quedaron en revisión editorial. Revisa su ficha antes de publicar."}</p><button type="button" onClick={close} className="mt-2 h-10 rounded-lg bg-[#102a43] px-5 text-[11px] font-extrabold text-white">Cerrar</button></div> : null}
        </div>
      </section>
    </div> : null}
  </>;
}

function PreviewStat({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "green" | "blue" | "red" }) { return <div className="rounded-xl border border-[#e2eaf1] bg-[#fbfcfd] px-3 py-3"><p className="text-[9px] font-bold text-[#8296a9]">{label}</p><p className={`mt-1 text-[20px] font-black ${tone === "green" ? "text-[#159263]" : tone === "blue" ? "text-[#2277ee]" : tone === "red" ? "text-[#d94848]" : "text-[#102a43]"}`}>{value.toLocaleString("es-PE")}</p></div>; }
