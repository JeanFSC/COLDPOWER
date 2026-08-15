"use client";
import { useState } from "react";
import { orderStatuses, type OrderStatus } from "@/lib/sales-validation";

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

export function OrderStatusControl({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const [value, setValue] = useState(status); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  async function change(nextStatus: OrderStatus) { setValue(nextStatus); setSaving(true); setError(""); try { const response = await fetch(`/api/admin/pedidos/${orderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(readApiError(payload, "No se pudo actualizar el pedido.")); } catch (changeError) { setValue(status); setError(changeError instanceof Error ? changeError.message : "No se pudo actualizar el pedido."); } finally { setSaving(false); } }
  return <div><select value={value} disabled={saving} onChange={(event) => void change(event.target.value as OrderStatus)} className="h-10 rounded-pill border border-border bg-white px-3 text-xs font-extrabold text-dark">{orderStatuses.map((item) => <option key={item} value={item}>{item}</option>)}</select>{error ? <p className="mt-1 max-w-48 text-[11px] font-bold text-danger" role="alert" aria-live="assertive">{error}</p> : null}</div>;
}
