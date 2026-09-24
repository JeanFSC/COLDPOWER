"use client";

import { useState, type FormEvent } from "react";

type Price = { amount: number; currency: string } | null;
type InventoryRow = { locationId: string; location: string; onHand: number; reserved: number; available: number; minimumStock: number | null };

async function post(path: string, body: unknown) {
  const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json() as { error?: string };
  if (!response.ok) throw new Error(result.error || "No se pudo guardar.");
  return result;
}

export function ProductCommercialEditor({ productId, currentPrice, inventory, canEditPricing, canAdjustInventory }: { productId: string; currentPrice: Price; inventory: InventoryRow[]; canEditPricing: boolean; canAdjustInventory: boolean }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>, path: string) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const body = { ...data, productId, amount: data.amount ? String(data.amount) : undefined, quantity: data.quantity ? Number(data.quantity) : undefined };
    try {
      await post(path, body);
      setMessage("Guardado correctamente. Recarga la ficha para ver el saldo actualizado.");
      event.currentTarget.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="mt-6 rounded-md border border-primary/30 bg-primary/5 p-5">
    <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">Gestión comercial</p>
    <h2 className="mt-1 font-display text-2xl font-black text-dark">Editar precio y stock</h2>
    <p className="mt-2 text-sm leading-6 text-gray-text">Completa los datos confirmados cuando los tengas. Cada cambio queda versionado y auditado.</p>
    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      {canEditPricing ? <form onSubmit={(event) => submit(event, "/api/admin/precios")} className="space-y-2 rounded-md border border-border bg-white p-4">
        <h3 className="font-bold text-dark">Nuevo precio</h3>
        <p className="text-xs text-gray-text">Actual: {currentPrice ? `${currentPrice.currency} ${currentPrice.amount.toFixed(2)}` : "Sin precio confirmado"}</p>
        <div className="grid grid-cols-2 gap-2">
          <input required name="amount" inputMode="decimal" placeholder="Importe" className="h-9 rounded-md border border-border bg-white px-2 text-sm" />
          <input required name="currency" defaultValue={currentPrice?.currency ?? "PEN"} maxLength={3} placeholder="Moneda ISO" className="h-9 rounded-md border border-border bg-white px-2 text-sm uppercase" />
        </div>
        <select required name="priceType" defaultValue="RETAIL" className="h-9 w-full rounded-md border border-border bg-white px-2 text-sm"><option value="RETAIL">Minorista</option><option value="WHOLESALE">Mayorista</option><option value="COST">Costo</option><option value="MINIMUM">Mínimo</option></select>
        <input name="reason" placeholder="Motivo del cambio" className="h-9 w-full rounded-md border border-border bg-white px-2 text-sm" />
        <button disabled={busy} className="rounded-md bg-dark px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Guardar precio</button>
      </form> : <PermissionNotice message="No tienes permiso para editar precios." />}
      {canAdjustInventory ? <form onSubmit={(event) => submit(event, "/api/admin/inventario/ajustes")} className="space-y-2 rounded-md border border-border bg-white p-4">
        <h3 className="font-bold text-dark">Ajuste de stock</h3>
        <p className="text-xs text-gray-text">La cantidad es el movimiento que entra o sale del local seleccionado.</p>
        <select required name="locationId" defaultValue="" className="h-9 w-full rounded-md border border-border bg-white px-2 text-sm"><option value="">Selecciona un local</option>{inventory.map((row) => <option key={row.locationId} value={row.locationId}>{row.location} · actual {row.onHand}</option>)}</select>
        <div className="grid grid-cols-2 gap-2">
          <input required min="1" type="number" name="quantity" placeholder="Cantidad entera" className="h-9 rounded-md border border-border bg-white px-2 text-sm" />
          <select required name="type" defaultValue="ADJUSTMENT_IN" className="h-9 w-full rounded-md border border-border bg-white px-2 text-sm"><option value="ADJUSTMENT_IN">Entrada</option><option value="ADJUSTMENT_OUT">Salida</option><option value="PURCHASE_RECEIPT">Recepción</option><option value="RETURN_IN">Devolución entrada</option><option value="RETURN_OUT">Devolución salida</option></select>
        </div>
        <input name="reason" placeholder="Motivo del movimiento" className="h-9 w-full rounded-md border border-border bg-white px-2 text-sm" />
        <button disabled={busy || !inventory.length} className="rounded-md bg-dark px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Guardar movimiento</button>
        {!inventory.length ? <p className="text-xs text-gray-text">Primero crea un local en Administración → Inventario.</p> : null}
      </form> : <PermissionNotice message="No tienes permiso para ajustar inventario." />}
    </div>
    {message ? <p className="mt-4 text-sm font-bold text-gray-text">{message}</p> : null}
  </section>;
}

function PermissionNotice({ message }: { message: string }) {
  return <div className="rounded-md border border-border bg-white p-4 text-sm text-gray-text">{message}</div>;
}
