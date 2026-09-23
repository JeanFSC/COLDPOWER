"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

async function transition(purchaseId: string, action: string, reason?: string) {
  const response = await fetch(`/api/admin/compras/${encodeURIComponent(purchaseId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, reason }),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string | { message?: string };
  };
  if (!response.ok) {
    const error = typeof payload.error === "string" ? payload.error : payload.error?.message;
    throw new Error(error || "No se pudo actualizar la orden.");
  }
}

export function PurchaseActions({ purchaseId, status, canManage = true }: { purchaseId: string; status: string; canManage?: boolean }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const canCancel = ["DRAFT", "PENDING", "PARTIAL_RECEIVED"].includes(status);

  async function run(action: "issue" | "cancel") {
    if (action === "cancel" && !reason.trim()) {
      setMessage("Escribe un motivo antes de cancelar.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await transition(purchaseId, action, reason);
      setMessage(action === "issue" ? "OC emitida." : "OC cancelada.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar la orden.");
    } finally {
      setBusy(false);
    }
  }

  if (!canManage) return null;
  if (status === "RECEIVED" || status === "CANCELLED")
    return message ? (
      <p role="status" className="text-[11px] font-bold text-slate-500">
        {message}
      </p>
    ) : null;

  return (
    <div className="space-y-2 border-t border-slate-100 pt-3">
      <div className="flex flex-wrap gap-2">
        {status === "DRAFT" ? (
          <button
            type="button"
            onClick={() => void run("issue")}
            disabled={busy}
            className="rounded-full bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-white disabled:opacity-50"
          >
            {busy ? "Actualizando…" : "Emitir OC"}
          </button>
        ) : null}
        {canCancel ? (
          <button
            type="button"
            onClick={() => void run("cancel")}
            disabled={busy || !reason.trim()}
            className="rounded-full border border-rose-200 px-3 py-2 text-[11px] font-extrabold text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar saldo pendiente
          </button>
        ) : null}
      </div>
      {canCancel ? (
        <input
          value={reason}
          onChange={(event) => setReason(event.currentTarget.value)}
          maxLength={500}
          placeholder="Motivo de cancelación"
          aria-label="Motivo de cancelación"
          className="h-9 w-full rounded-lg border border-slate-200 px-3 text-[11px]"
        />
      ) : null}
      {message ? (
        <p role="status" className="text-[11px] font-bold text-slate-500">
          {message}
        </p>
      ) : null}
    </div>
  );
}
