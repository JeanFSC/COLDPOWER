"use client";

import { useState } from "react";

const nextStatuses: Record<string, string[]> = {
  DRAFT: ["REQUESTED"],
  REQUESTED: ["APPROVED", "CANCELLED"],
  APPROVED: ["PREPARED", "CANCELLED"],
  PREPARED: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["RECEIVED"],
};

export function TransferStatusControl({
  transferId,
  status,
}: {
  transferId: string;
  status: string;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const options = nextStatuses[status] ?? [];
  async function move(nextStatus: string) {
    setBusy(true);
    setMessage("");
    try {
      const endpoint =
        nextStatus === "RECEIVED"
          ? `/api/admin/inventario/transferencias/${transferId}/recibir`
          : `/api/admin/inventario/transferencias/${transferId}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: nextStatus === "RECEIVED" ? undefined : JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No se pudo actualizar el traslado.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar el traslado.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((next) => (
        <button
          key={next}
          type="button"
          disabled={busy}
          onClick={() => void move(next)}
          className="rounded-md bg-primary px-2 py-1 text-[11px] font-bold text-white disabled:opacity-50"
        >
          {next}
        </button>
      ))}
      {status === "IN_TRANSIT" ? (
        <span className="text-[11px] text-gray-text">Recepción registra salida y entrada</span>
      ) : null}
      {message ? <span className="text-[10px] text-danger">{message}</span> : null}
    </div>
  );
}
