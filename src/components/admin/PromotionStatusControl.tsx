"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { promotionStatuses, type PromotionStatus } from "@/lib/operations-validation";

const statusLabels: Record<PromotionStatus, string> = { DRAFT: "Borrador", ACTIVE: "Activa", INACTIVE: "Inactiva", EXPIRED: "Vencida" };

async function readError(response: Response) {
  const payload = await response.json().catch(() => null) as { error?: { message?: string } | string } | null;
  return typeof payload?.error === "string" ? payload.error : payload?.error?.message ?? "No se pudo completar la operacion.";
}

export function PromotionStatusControl({
  id,
  status,
  approvalStatus,
  canApprove = false,
}: {
  id: string;
  status: PromotionStatus;
  approvalStatus?: string | null;
  canApprove?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function change(nextStatus: PromotionStatus) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/promociones/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) throw new Error(await readError(response));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cambiar el estado.");
    } finally {
      setBusy(false);
    }
  }

  async function decide(decision: "APPROVED" | "REJECTED") {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/promociones/${encodeURIComponent(id)}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!response.ok) throw new Error(await readError(response));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo registrar la decision.");
    } finally {
      setBusy(false);
    }
  }

  async function preview() {
    const raw = window.prompt("Precio base para previsualizar", "100");
    if (raw === null) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/promociones/${encodeURIComponent(id)}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUnitPrice: raw }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const payload = await response.json() as { data?: { price?: { finalUnitPrice?: string } }; price?: { finalUnitPrice?: string } };
      setMessage(`Precio promocional: ${payload.data?.price?.finalUnitPrice ?? payload.price?.finalUnitPrice ?? "sin resultado"}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo previsualizar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label={`Estado de promocion ${id}`} value={status} disabled={busy} onChange={(event) => void change(event.target.value as PromotionStatus)} className="rounded-md border border-border bg-white px-2 py-1 text-xs font-bold text-dark">
          {promotionStatuses.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}
        </select>
        <a href={`/admin/promociones?edit=${encodeURIComponent(id)}`} className="text-[11px] font-bold text-primary underline">Editar</a>
      </div>
      <div className="flex flex-wrap gap-1">
        <button type="button" disabled={busy} onClick={() => void preview()} className="rounded-md border border-border px-2 py-1 text-[11px] font-bold text-dark">Previsualizar</button>
        {canApprove && approvalStatus === "PENDING" ? <>
          <button type="button" disabled={busy} onClick={() => void decide("APPROVED")} className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white">Aprobar</button>
          <button type="button" disabled={busy} onClick={() => void decide("REJECTED")} className="rounded-md border border-rose-200 px-2 py-1 text-[11px] font-bold text-rose-700">Rechazar</button>
        </> : null}
      </div>
      {message ? <span role="alert" className="text-[11px] font-semibold text-rose-700">{message}</span> : null}
    </div>
  );
}
