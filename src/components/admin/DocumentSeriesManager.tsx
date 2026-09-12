"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

const DOCUMENT_TYPES = [
  { value: "QUOTE", label: "Cotización" },
  { value: "ORDER", label: "Pedido" },
  { value: "SALE", label: "Venta" },
  { value: "TRANSFER", label: "Transferencia" },
  { value: "PURCHASE_REQUEST", label: "Solicitud de compra" },
  { value: "PURCHASE_RECEIPT", label: "Recepción de compra" },
  { value: "OTHER", label: "Otro" },
] as const;

export type DocumentSeriesItem = { id: string; code: string; label: string; documentType: string; prefix: string; nextNumber: number; padding: number; active: boolean };

const inputClass = "h-9 rounded-md border border-[#dce6ee] bg-white px-2.5 text-[11px] font-semibold text-[#304b66] outline-none focus:border-[#2277ee]";
const documentTypeLabel = (value: string) => DOCUMENT_TYPES.find((type) => type.value === value)?.label ?? value;

export function DocumentSeriesManager({ series }: { series: DocumentSeriesItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [documentType, setDocumentType] = useState<string>(DOCUMENT_TYPES[0].value);
  const [prefix, setPrefix] = useState("");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/configuracion/series", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, label, documentType, prefix }) });
      const result = await response.json() as { error?: string; errorObject?: { message?: string } };
      if (!response.ok) throw new Error(result.errorObject?.message || result.error || "No se pudo crear la serie.");
      setCode(""); setLabel(""); setPrefix(""); setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la serie.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(id: string, active: boolean) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/configuracion/series/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !active }) });
      const result = await response.json() as { error?: string; errorObject?: { message?: string } };
      if (!response.ok) throw new Error(result.errorObject?.message || result.error || "No se pudo actualizar la serie.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la serie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold leading-5 text-[#71869c]">Numeración interna para cotizaciones, pedidos, ventas y otros documentos del flujo operativo.</p>
        <button type="button" onClick={() => setOpen((current) => !current)} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#dce6ee] bg-white px-3 text-[11px] font-extrabold text-[#304b66] transition hover:border-[#2277ee] hover:text-[#2277ee]">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Nueva serie
        </button>
      </div>
      {open ? (
        <form onSubmit={create} className="grid gap-2.5 rounded-lg border border-[#dceafa] bg-[#f5f9ff] p-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-1 text-[10px] font-extrabold text-[#304b66]">Código<input className={inputClass} value={code} onChange={(e) => setCode(e.target.value)} placeholder="COT" maxLength={20} required /></label>
          <label className="grid gap-1 text-[10px] font-extrabold text-[#304b66]">Etiqueta<input className={inputClass} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Cotizaciones" maxLength={80} required /></label>
          <label className="grid gap-1 text-[10px] font-extrabold text-[#304b66]">Tipo de documento
            <select className={inputClass} value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
              {DOCUMENT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-[10px] font-extrabold text-[#304b66]">Prefijo<input className={inputClass} value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="COT-" maxLength={20} required /></label>
          <div className="flex items-center gap-2 lg:col-span-4">
            <button type="submit" disabled={busy} className="inline-flex h-9 items-center rounded-lg bg-[#2277ee] px-3.5 text-[11px] font-extrabold text-white disabled:opacity-50">{busy ? "Creando…" : "Crear serie"}</button>
            {error ? <span role="alert" className="text-[10px] font-semibold text-[#b42318]">{error}</span> : null}
          </div>
        </form>
      ) : null}
      {series.length ? (
        <div className="overflow-x-auto rounded-lg border border-[#e2eaf1]">
          <table className="w-full min-w-[560px] border-collapse text-left text-[11px]">
            <thead>
              <tr className="border-b border-[#e2eaf1] bg-[#f7fafc] text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#8296a9]">
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2">Etiqueta</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Prefijo</th>
                <th className="px-3 py-2">Siguiente número</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {series.map((row) => (
                <tr key={row.id} className="border-b border-[#eef2f6] last:border-0">
                  <td className="px-3 py-2 font-mono text-[10px] font-bold text-[#304b66]">{row.code}</td>
                  <td className="px-3 py-2 font-semibold text-[#304b66]">{row.label}</td>
                  <td className="px-3 py-2 text-[#71869c]">{documentTypeLabel(row.documentType)}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-[#71869c]">{row.prefix}{String(row.nextNumber).padStart(row.padding, "0")}</td>
                  <td className="px-3 py-2 text-[#71869c]">{row.nextNumber}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-extrabold ${row.active ? "bg-[#e4f7ef] text-[#159263]" : "bg-[#f1f4f7] text-[#8296a9]"}`}>{row.active ? "Activa" : "Inactiva"}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" disabled={busy} onClick={() => toggle(row.id, row.active)} className="rounded-md border border-[#dce6ee] px-2 py-1 text-[10px] font-bold text-[#304b66] hover:border-[#2277ee] hover:text-[#2277ee] disabled:opacity-50">{row.active ? "Desactivar" : "Activar"}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-[#dce6ee] p-4 text-center text-[11px] font-semibold text-[#8296a9]">Sin series registradas. Crea la primera para numerar tus documentos.</p>
      )}
    </div>
  );
}
