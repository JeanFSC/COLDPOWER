"use client";

import { useState } from "react";
import { manualPaymentMethods, type ManualPaymentMethod } from "@/lib/sales-validation";

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

export function ManualPaymentControl({
  orderId,
  amount,
  currency,
  onConfirmed,
}: {
  orderId: string;
  amount: string;
  currency: string;
  onConfirmed?: () => void | Promise<void>;
}) {
  const [method, setMethod] = useState<ManualPaymentMethod>("TRANSFER");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"error" | "success">("success");
  const [idempotencyKey] = useState(
    () =>
      "manual-" +
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2)),
  );

  async function confirmPayment() {
    setBusy(true);
    setMessage("");
    setMessageKind("success");
    try {
      const response = await fetch("/api/admin/pagos/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({
          orderId,
          method,
          amount,
          currency,
          reference: reference || null,
          reason,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readApiError(payload, "No se pudo confirmar el pago."));
      setMessage("Pago confirmado");
      await onConfirmed?.();
    } catch (error) {
      setMessageKind("error");
      setMessage(error instanceof Error ? error.message : "No se pudo confirmar el pago.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 grid gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
      <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-dark">
        Confirmar pago manual
      </p>
      <p className="text-xs font-semibold text-muted-foreground">
        Monto pendiente: {currency} {amount}
      </p>
      <div className="grid gap-2 sm:grid-cols-4">
        <select
          aria-label="Método de pago manual"
          value={method}
          onChange={(event) => setMethod(event.target.value as ManualPaymentMethod)}
          className="h-9 rounded-md border border-border bg-white px-2 text-xs font-bold text-dark"
        >
          {manualPaymentMethods.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <input
          aria-label="Referencia del pago"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          placeholder="Referencia (opcional)"
          maxLength={180}
          className="h-9 rounded-md border border-border bg-white px-2 text-xs text-dark"
        />
        <input
          aria-label="Motivo de confirmación manual"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Motivo obligatorio"
          maxLength={500}
          className="h-9 rounded-md border border-border bg-white px-2 text-xs text-dark"
        />
        <button
          type="button"
          disabled={busy || !reason.trim()}
          onClick={() => void confirmPayment()}
          className="h-9 rounded-md bg-primary px-3 text-xs font-extrabold text-white disabled:opacity-50"
        >
          {busy ? "Confirmando…" : "Confirmar"}
        </button>
      </div>
      {message ? (
        <p
          className="text-xs font-bold text-dark"
          role={messageKind === "error" ? "alert" : "status"}
          aria-live={messageKind === "error" ? "assertive" : "polite"}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
