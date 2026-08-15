"use client";

import { useState } from "react";

export function CatalogPublicationControl({ productId, currentStatus }: { productId: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function update() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/catalogo/${productId}/publication`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const result = await response.json() as { success?: boolean; error?: string };
      if (!response.ok) throw new Error(result.error || "No se pudo actualizar.");
      setMessage("Guardado");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Error"); }
    finally { setBusy(false); }
  }
  return <div className="flex min-w-40 items-center gap-2"><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 rounded-md border border-border bg-white px-2 text-xs font-semibold text-dark"><option value="draft">Borrador</option><option value="review">Revisión</option><option value="published">Publicado</option><option value="hidden">Oculto</option></select><button type="button" disabled={busy || status === currentStatus} onClick={update} className="rounded-md bg-primary px-2 py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? "..." : "Guardar"}</button>{message ? <span className="text-[10px] text-gray-text">{message}</span> : null}</div>;
}
