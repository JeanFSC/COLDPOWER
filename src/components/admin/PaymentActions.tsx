"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function readApiError(payload: unknown, fallback: string) {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
    if (typeof error === "object" && error !== null && "message" in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) return message;
    }
  }
  return fallback;
}

export function PaymentActions({
  paymentId,
  status,
  amount,
  currency,
  provider,
  providerReference,
}: {
  paymentId: string;
  status: string;
  amount: string;
  currency: string;
  provider?: string | null;
  providerReference?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"status" | "refund" | null>(null);
  const [reason, setReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"error" | "success">("success");
  const canRefresh = Boolean(provider && providerReference);
  const canRefund = status === "CONFIRMED" || status === "APPROVED";

  async function refreshStatus() {
    setBusy("status");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/pagos/${paymentId}/status`, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readApiError(payload, "No se pudo consultar el proveedor."));
      setMessageKind("success");
      setMessage("Estado consultado. Actualizando la conciliación…");
      router.refresh();
    } catch (error) {
      setMessageKind("error");
      setMessage(error instanceof Error ? error.message : "No se pudo consultar el proveedor.");
    } finally {
      setBusy(null);
    }
  }

  async function requestRefund() {
    if (!reason.trim()) {
      setMessageKind("error");
      setMessage("Indica el motivo del reembolso.");
      return;
    }
    setBusy("refund");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/pagos/${paymentId}/refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `refund-${paymentId}-${refundAmount.trim() || "full"}`,
        },
        body: JSON.stringify({ amount: refundAmount.trim() || undefined, reason: reason.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readApiError(payload, "No se pudo solicitar el reembolso."));
      setMessageKind("success");
      setMessage("Reembolso solicitado. Actualizando el estado del pago…");
      router.refresh();
    } catch (error) {
      setMessageKind("error");
      setMessage(error instanceof Error ? error.message : "No se pudo solicitar el reembolso.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-2 rounded-lg border border-[#e3ebf2] bg-[#fbfcfd] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-extrabold text-[#304b66]">Pago {paymentId}</p>
        <span className="text-[10px] font-semibold text-[#8296a9]">{currency} {amount}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!canRefresh || busy !== null} onClick={() => void refreshStatus()} className="h-9 rounded-md border border-[#dce6ee] bg-white px-3 text-[10px] font-extrabold text-[#304b66] disabled:cursor-not-allowed disabled:opacity-50">
          {busy === "status" ? "Consultando…" : "Consultar proveedor"}
        </button>
        {canRefund ? <span className="text-[10px] font-semibold text-[#8296a9]">Reembolso permitido</span> : null}
      </div>
      {canRefund ? (
        <div className="grid gap-2 sm:grid-cols-[140px_1fr_auto]">
          <input aria-label="Monto del reembolso" value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} placeholder={`Monto total: ${amount}`} inputMode="decimal" disabled={busy !== null} className="h-9 rounded-md border border-[#dce6ee] bg-white px-2 text-xs" />
          <input aria-label="Motivo del reembolso" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo obligatorio" maxLength={500} disabled={busy !== null} className="h-9 rounded-md border border-[#dce6ee] bg-white px-2 text-xs" />
          <button type="button" disabled={!reason.trim() || busy !== null} onClick={() => void requestRefund()} className="h-9 rounded-md bg-[#ed4b4b] px-3 text-[10px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {busy === "refund" ? "Solicitando…" : "Solicitar reembolso"}
          </button>
        </div>
      ) : null}
      {message ? <p role={messageKind === "error" ? "alert" : "status"} aria-live={messageKind === "error" ? "assertive" : "polite"} className={`text-[10px] font-bold ${messageKind === "error" ? "text-[#c84848]" : "text-[#159263]"}`}>{message}</p> : null}
    </div>
  );
}
