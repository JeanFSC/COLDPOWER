"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PurchaseRequestActions({
  requestId,
  status,
  locationId,
  items = [],
  suppliers = [],
}: {
  requestId: string;
  status: string;
  locationId?: string | null;
  items?: Array<{ productId: string; quantityRequested: number }>;
  suppliers?: Array<{ id: string; name: string; currency: string; status: string }>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [expectedDeliveryAt, setExpectedDeliveryAt] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function transition(nextStatus: "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED") {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/admin/compras/solicitudes/${encodeURIComponent(requestId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus, reason: reason.trim() || undefined }),
        },
      );
      const result = (await response.json().catch(() => ({}))) as { error?: unknown };
      if (!response.ok) {
        throw new Error(typeof result.error === "string" ? result.error : "No se pudo actualizar.");
      }
      setReason("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar.");
    } finally {
      setBusy(false);
    }
  }

  async function convert() {
    const supplier = suppliers.find((item) => item.id === supplierId);
    const amount = Number(unitCost);
    if (!supplier || !locationId || !items.length || !Number.isFinite(amount) || amount <= 0) {
      setMessage("Selecciona proveedor e ingresa un costo unitario válido.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/admin/compras/solicitudes/${encodeURIComponent(requestId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplierId,
            locationId,
            currency: supplier.currency,
            expectedDeliveryAt: expectedDeliveryAt || null,
            items: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantityRequested,
              unitCost: amount.toFixed(2),
            })),
          }),
        },
      );
      const result = (await response.json().catch(() => ({}))) as { error?: unknown };
      if (!response.ok)
        throw new Error(typeof result.error === "string" ? result.error : "No se pudo convertir.");
      setMessage("Solicitud convertida en OC pendiente.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo convertir.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "DRAFT") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void transition("SUBMITTED")}
          className="rounded-full bg-[#2277ee] px-3 py-2 text-[10px] font-extrabold text-white disabled:opacity-50"
        >
          Enviar a aprobación
        </button>
        {message ? (
          <span role="alert" className="text-[10px] font-semibold text-[#d94848]">
            {message}
          </span>
        ) : null}
      </div>
    );
  }

  if (status === "SUBMITTED") {
    return (
      <div className="space-y-2">
        <input
          value={reason}
          onChange={(event) => setReason(event.currentTarget.value)}
          placeholder="Motivo si rechazas (obligatorio para rechazar)"
          className="h-9 w-full rounded-lg border border-[#dce6ee] px-3 text-[11px]"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void transition("APPROVED")}
            className="rounded-full bg-[#159263] px-3 py-2 text-[10px] font-extrabold text-white disabled:opacity-50"
          >
            Aprobar
          </button>
          <button
            type="button"
            disabled={busy || !reason.trim()}
            onClick={() => void transition("REJECTED")}
            className="rounded-full border border-[#f1c5c5] px-3 py-2 text-[10px] font-extrabold text-[#c43333] disabled:opacity-50"
          >
            Rechazar
          </button>
          {message ? (
            <span role="alert" className="text-[10px] font-semibold text-[#d94848]">
              {message}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  if (status === "APPROVED") {
    return (
      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-[#15784e]">Aprobada · lista para convertir</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={supplierId}
            onChange={(event) => setSupplierId(event.currentTarget.value)}
            className="h-9 rounded-lg border border-[#dce6ee] px-2 text-[10px]"
            aria-label="Proveedor para convertir solicitud"
          >
            <option value="">Proveedor activo</option>
            {suppliers
              .filter((supplier) => supplier.status === "ACTIVE")
              .map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name} · {supplier.currency}
                </option>
              ))}
          </select>
          <input
            value={unitCost}
            onChange={(event) => setUnitCost(event.currentTarget.value)}
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Costo unitario"
            aria-label="Costo unitario para convertir solicitud"
            className="h-9 rounded-lg border border-[#dce6ee] px-3 text-[10px]"
          />
          <input
            value={expectedDeliveryAt}
            onChange={(event) => setExpectedDeliveryAt(event.currentTarget.value)}
            type="datetime-local"
            aria-label="Entrega esperada de la orden"
            className="h-9 rounded-lg border border-[#dce6ee] px-3 text-[10px] sm:col-span-2"
          />
        </div>
        <button
          type="button"
          disabled={busy || !supplierId || !unitCost || !items.length}
          onClick={() => void convert()}
          className="rounded-full bg-[#159263] px-3 py-2 text-[10px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Convertir en OC
        </button>
        {message ? (
          <span role="status" className="block text-[10px] font-semibold text-[#526b84]">
            {message}
          </span>
        ) : null}
      </div>
    );
  }

  return <span className="text-[10px] font-semibold text-[#8195aa]">Sin acciones disponibles</span>;
}
