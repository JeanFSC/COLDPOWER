"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { validatePurchaseRequestConversionItems } from "@/lib/purchases-validation";

export function PurchaseRequestActions({
  requestId,
  status,
  locationId,
  items = [],
  suppliers = [],
  canApprove = false,
  canManage = false,
}: {
  requestId: string;
  status: string;
  locationId?: string | null;
  items?: Array<{ productId: string; quantityRequested: number }>;
  suppliers?: Array<{ id: string; name: string; currency: string; status: string }>;
  canApprove?: boolean;
  canManage?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [unitCosts, setUnitCosts] = useState<Record<string, string>>({});
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
    if (!supplier || !locationId || !items.length) {
      setMessage("Selecciona proveedor e ingresa un costo unitario válido.");
      return;
    }
    let conversionItems: Array<{ productId: string; quantity: number; unitCost: string }>;
    try {
      conversionItems = validatePurchaseRequestConversionItems(items, unitCosts);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ingresa un costo válido para cada línea.");
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
            items: conversionItems,
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

  if (status === "DRAFT" && canManage) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void transition("SUBMITTED")}
          className="min-h-8 rounded-full bg-blue-600 px-3 py-2 text-[11px] font-extrabold text-white disabled:opacity-50"
        >
          Enviar a aprobación
        </button>
        {message ? (
          <span role="alert" className="text-[11px] font-semibold text-rose-600">
            {message}
          </span>
        ) : null}
      </div>
    );
  }

  if (status === "SUBMITTED" && canApprove) {
    return (
      <div className="space-y-2">
        <input
          value={reason}
          onChange={(event) => setReason(event.currentTarget.value)}
          placeholder="Motivo si rechazas (obligatorio para rechazar)"
          className="h-9 w-full rounded-lg border border-slate-200 px-3 text-[11px]"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void transition("APPROVED")}
            className="min-h-8 rounded-full bg-emerald-600 px-3 py-2 text-[11px] font-extrabold text-white disabled:opacity-50"
          >
            Aprobar
          </button>
          <button
            type="button"
            disabled={busy || !reason.trim()}
            onClick={() => void transition("REJECTED")}
            className="min-h-8 rounded-full border border-rose-200 px-3 py-2 text-[11px] font-extrabold text-rose-600 disabled:opacity-50"
          >
            Rechazar
          </button>
          {message ? (
            <span role="alert" className="text-[11px] font-semibold text-rose-600">
              {message}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  if (status === "APPROVED" && canManage) {
    return (
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-emerald-700">Aprobada · lista para convertir</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={supplierId}
            onChange={(event) => setSupplierId(event.currentTarget.value)}
            className="h-9 rounded-lg border border-slate-200 px-2 text-[11px]"
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
          <div className="grid gap-2 sm:col-span-2">
            {items.map((item) => (
              <label key={item.productId} className="grid gap-1 text-[11px] font-semibold text-slate-600">
                <span>{item.productId} · {item.quantityRequested} unidades</span>
                <input
                  value={unitCosts[item.productId] ?? ""}
                  onChange={(event) => setUnitCosts((current) => ({ ...current, [item.productId]: event.currentTarget.value }))}
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Costo unitario"
                  aria-label={`Costo unitario para ${item.productId}`}
                  className="h-9 rounded-lg border border-slate-200 px-3 text-[11px]"
                />
              </label>
            ))}
          </div>
          <input
            value={expectedDeliveryAt}
            onChange={(event) => setExpectedDeliveryAt(event.currentTarget.value)}
            type="datetime-local"
            aria-label="Entrega esperada de la orden"
            className="h-9 rounded-lg border border-slate-200 px-3 text-[11px] sm:col-span-2"
          />
        </div>
        <button
          type="button"
          disabled={busy || !supplierId || !items.length || items.some((item) => !unitCosts[item.productId]?.trim())}
          onClick={() => void convert()}
          className="min-h-8 rounded-full bg-emerald-600 px-3 py-2 text-[11px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Convertir en OC
        </button>
        {message ? (
          <span role="status" className="block text-[11px] font-semibold text-slate-500">
            {message}
          </span>
        ) : null}
      </div>
    );
  }

  return <span className="text-[11px] font-semibold text-slate-400">Sin acciones disponibles</span>;
}
