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

function formatMoney(currency: string, value: string | number) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return `${currency} ${value}`;
  try {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
  } catch {
    return `${currency} ${numericValue.toFixed(2)}`;
  }
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
  const [enteredAmount, setEnteredAmount] = useState(amount);
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
  const numericAmount = Number(enteredAmount);
  const validAmount = Number.isFinite(numericAmount) && numericAmount > 0 && numericAmount <= Number(amount);

  async function confirmPayment() {
    if (!validAmount || !reason.trim()) return;
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
          amount: numericAmount.toFixed(2),
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
    <div className="mt-3 grid gap-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-amber-800">Confirmar pago manual</p>
      <p className="text-xs font-semibold text-slate-600">
        Saldo pendiente: {formatMoney(currency, amount)}. El monto confirmado puede ser parcial.
      </p>
      <div className="grid gap-2 sm:grid-cols-[130px_145px_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <input
          aria-label="Monto del pago manual"
          type="number"
          inputMode="decimal"
          min="0.01"
          max={amount}
          step="0.01"
          value={enteredAmount}
          onChange={(event) => setEnteredAmount(event.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
        />
        <select
          aria-label="Método de pago manual"
          value={method}
          onChange={(event) => setMethod(event.target.value as ManualPaymentMethod)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
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
          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
        />
        <input
          aria-label="Motivo de confirmación manual"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Motivo obligatorio"
          maxLength={500}
          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
        />
        <button
          type="button"
          disabled={busy || !reason.trim() || !validAmount}
          onClick={() => void confirmPayment()}
          className="h-9 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Confirmando…" : "Confirmar"}
        </button>
      </div>
      {!validAmount ? <p className="text-[11px] font-semibold text-amber-800">Ingresa un monto mayor que cero y no mayor al saldo pendiente.</p> : null}
      {message ? (
        <p
          className={messageKind === "error" ? "text-xs font-bold text-rose-700" : "text-xs font-bold text-emerald-700"}
          role={messageKind === "error" ? "alert" : "status"}
          aria-live={messageKind === "error" ? "assertive" : "polite"}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
