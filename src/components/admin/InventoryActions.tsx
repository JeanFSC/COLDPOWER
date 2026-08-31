"use client";

import { useState } from "react";

export function InventoryActions({ reservationId, transferId }: { reservationId?: string; transferId?: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(path: string) { setBusy(true); setMessage(""); try { const response = await fetch(path, { method: "POST" }); const result = await response.json() as { error?: string }; if (!response.ok) throw new Error(result.error || "No se pudo completar."); setMessage("Guardado"); } catch (error) { setMessage(error instanceof Error ? error.message : "Error"); } finally { setBusy(false); } }
  return <div className="flex flex-wrap items-center gap-2">{reservationId ? <><button type="button" disabled={busy} onClick={() => run(`/api/admin/inventario/reservas/${reservationId}/liberar`)} className="rounded-md border border-border bg-white px-2 py-1 text-[11px] font-bold text-dark disabled:opacity-50">Liberar</button><button type="button" disabled={busy} onClick={() => run(`/api/admin/inventario/reservas/${reservationId}/consumir`)} className="rounded-md bg-dark px-2 py-1 text-[11px] font-bold text-white disabled:opacity-50">Consumir</button></> : null}{transferId ? <button type="button" disabled={busy} onClick={() => run(`/api/admin/inventario/transferencias/${transferId}/recibir`)} className="rounded-md bg-primary px-2 py-1 text-[11px] font-bold text-white disabled:opacity-50">Recibir traslado</button> : null}{message ? <span className="text-[10px] text-gray-text">{message}</span> : null}</div>;
}
