"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const invoiceStatuses = [
  { value: "PENDING", label: "Pendiente" },
  { value: "ISSUED", label: "Emitida" },
  { value: "VOID", label: "Anulada" },
  { value: "ERROR", label: "Error" },
] as const;
type InvoiceStatus = (typeof invoiceStatuses)[number]["value"];

function responseMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (error && typeof error === "object" && "message" in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) return message;
    }
    if (typeof error === "string" && error.trim()) return error;
  }
  return fallback;
}

export function SalesActions({ saleId, status, invoiceStatus }: { saleId: string; status: string; invoiceStatus?: string | null }) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceStatus>(invoiceStatuses.some((item) => item.value === invoiceStatus) ? invoiceStatus as InvoiceStatus : "PENDING");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"invoice" | "cancel" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"error" | "success">("success");

  async function updateInvoice() {
    if (invoice === "ISSUED" && !reference.trim()) {
      setMessage("Para marcar la factura como emitida necesitas la referencia externa.");
      setMessageKind("error");
      return;
    }
    setBusy("invoice");
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/ventas/${encodeURIComponent(saleId)}/facturacion`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoiceStatus: invoice, externalInvoiceReference: reference.trim() }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(responseMessage(payload, "No se pudo actualizar la facturación."));
      setMessage("Facturación actualizada y auditada.");
      setMessageKind("success");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar la facturación.");
      setMessageKind("error");
    } finally {
      setBusy(null);
    }
  }

  async function cancelSale() {
    if (!reason.trim()) {
      setMessage("Indica el motivo de cancelación.");
      setMessageKind("error");
      return;
    }
    setBusy("cancel");
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/ventas/${encodeURIComponent(saleId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: reason.trim() }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(responseMessage(payload, "No se pudo cancelar la venta."));
      setMessage("Venta cancelada y reservas revisadas.");
      setMessageKind("success");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cancelar la venta.");
      setMessageKind("error");
    } finally {
      setBusy(null);
    }
  }

  return <div className="grid gap-3 rounded-lg border border-[#e3ebf2] bg-[#fbfcfd] p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><div><p className="text-[10px] font-extrabold text-[#304b66]">Venta {saleId}</p><p className="mt-1 text-[10px] text-[#8296a9]">Estado comercial: {status}</p></div><label className="grid gap-1 text-[10px] font-bold text-[#526b84]">Facturación<select value={invoice} onChange={(event) => setInvoice(event.target.value as InvoiceStatus)} disabled={busy !== null} className="h-9 rounded-md border border-[#dce6ee] bg-white px-2 text-xs"><option value="PENDING">Pendiente</option><option value="ISSUED">Emitida</option><option value="VOID">Anulada</option><option value="ERROR">Error</option></select></label><button type="button" disabled={busy !== null} onClick={() => void updateInvoice()} className="h-9 rounded-md bg-[#2277ee] px-3 text-[10px] font-extrabold text-white disabled:opacity-50">{busy === "invoice" ? "Guardando…" : "Guardar factura"}</button><label className="grid gap-1 text-[10px] font-bold text-[#526b84] sm:col-span-2">Referencia externa {invoice === "ISSUED" ? "(obligatoria)" : "(opcional)"}<input value={reference} onChange={(event) => setReference(event.target.value)} disabled={busy !== null} placeholder="Referencia del proveedor" className="h-9 rounded-md border border-[#dce6ee] bg-white px-2 text-xs" /></label>{status !== "CANCELLED" ? <div className="grid gap-1 sm:col-span-3 sm:grid-cols-[1fr_auto]"><label className="grid gap-1 text-[10px] font-bold text-[#526b84]">Motivo de cancelación<input value={reason} onChange={(event) => setReason(event.target.value)} disabled={busy !== null} placeholder="Solo si corresponde" className="h-9 rounded-md border border-[#dce6ee] bg-white px-2 text-xs" /></label><button type="button" disabled={busy !== null || !reason.trim()} onClick={() => void cancelSale()} className="h-9 self-end rounded-md border border-[#ed4b4b] px-3 text-[10px] font-extrabold text-[#c84848] disabled:opacity-50">{busy === "cancel" ? "Cancelando…" : "Cancelar venta"}</button></div> : null}{message ? <p role={messageKind === "error" ? "alert" : "status"} aria-live={messageKind === "error" ? "assertive" : "polite"} className={`text-xs font-bold sm:col-span-3 ${messageKind === "error" ? "text-[#c84848]" : "text-[#159263]"}`}>{message}</p> : null}</div>;
}
