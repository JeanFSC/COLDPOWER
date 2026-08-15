"use client";

import { useState, type FormEvent } from "react";

type Product = { id: string; sku: string; name: string };
type Price = {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  priceType: string;
  amount: string;
  currency: string;
  active: boolean;
  status: string;
  validFrom?: Date | string;
  validUntil?: Date | string | null;
};
type Rule = { id: string; name: string; maxPercentage: string; approvalAbovePercentage: string; status: string };
type HistoryEntry = {
  id: string;
  sku: string;
  productName: string;
  priceType: string;
  previousAmount: string | null;
  newAmount: string | null;
  currency: string;
  reason: string | null;
  actorName: string | null;
  createdAt: Date | string;
};

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(path, init);
  let result: unknown = null;
  try { result = await response.json(); } catch { /* non-JSON response */ }
  if (!response.ok) {
    const error = result && typeof result === "object" ? (result as { error?: unknown }).error : undefined;
    const message = error && typeof error === "object" && "message" in error ? String(error.message) : typeof error === "string" ? error : "No se pudo guardar.";
    throw new Error(message);
  }
  return result;
}

function jsonRequest(method: string, body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export function PricingOperations({ products, prices, rules, history, canEditPrices = false, canManageCost = false, canManageDiscounts = false }: { products: Product[]; prices: Price[]; rules: Rule[]; history: HistoryEntry[]; canEditPrices?: boolean; canManageCost?: boolean; canManageDiscounts?: boolean }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>, path: string) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await request(path, jsonRequest("POST", {
        ...data,
        amount: data.amount ? String(data.amount) : undefined,
        maxPercentage: data.maxPercentage ? String(data.maxPercentage) : undefined,
        approvalAbovePercentage: data.approvalAbovePercentage ? String(data.approvalAbovePercentage) : undefined,
        idempotencyKey: path.includes("precios") ? crypto.randomUUID() : undefined,
      }));
      setMessage("Guardado en Neon. Recarga para ver el estado persistido.");
      event.currentTarget.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function editPrice(price: Price) {
    const amount = window.prompt(`Nuevo importe para ${price.sku}`, price.amount);
    if (amount === null) return;
    const reason = window.prompt("Motivo del cambio");
    if (reason === null) return;
    setBusy(true);
    setMessage("");
    try {
      await request(`/api/admin/precios/${price.id}`, jsonRequest("PATCH", { amount, currency: price.currency, priceType: price.priceType, status: price.status, validFrom: price.validFrom, validUntil: price.validUntil, reason, idempotencyKey: crypto.randomUUID() }));
      setMessage("Precio actualizado. Recarga para ver el nuevo valor.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar el precio.");
    } finally {
      setBusy(false);
    }
  }

  async function archivePrice(price: Price) {
    const reason = window.prompt(`Motivo para archivar ${price.sku}`);
    if (reason === null) return;
    setBusy(true);
    setMessage("");
    try {
      await request(`/api/admin/precios/${price.id}?reason=${encodeURIComponent(reason)}&idempotencyKey=${encodeURIComponent(crypto.randomUUID())}`, { method: "DELETE" });
      setMessage("Precio archivado. Recarga para confirmar el estado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo archivar el precio.");
    } finally {
      setBusy(false);
    }
  }

  async function editRule(rule: Rule) {
    const name = window.prompt("Nombre de la regla", rule.name);
    if (name === null) return;
    const maxPercentage = window.prompt("Porcentaje máximo", rule.maxPercentage);
    if (maxPercentage === null) return;
    const approvalAbovePercentage = window.prompt("Porcentaje que requiere aprobación", rule.approvalAbovePercentage);
    if (approvalAbovePercentage === null) return;
    const reason = window.prompt("Motivo del cambio");
    if (reason === null) return;
    setBusy(true);
    setMessage("");
    try {
      await request("/api/admin/descuentos", jsonRequest("PATCH", { id: rule.id, name, maxPercentage, approvalAbovePercentage, status: rule.status, reason }));
      setMessage("Regla actualizada. Recarga para ver el nuevo límite.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar la regla.");
    } finally {
      setBusy(false);
    }
  }

  async function changeRuleStatus(rule: Rule) {
    const status = rule.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const reason = window.prompt(`Motivo para cambiar ${rule.name} a ${status}`);
    if (reason === null) return;
    setBusy(true);
    setMessage("");
    try {
      await request("/api/admin/descuentos", jsonRequest("PATCH", { id: rule.id, status, reason }));
      setMessage("Estado de regla actualizado. Recarga para ver el cambio.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar la regla.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-md border border-border bg-white p-5">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">Precios gobernados</p>
        <h2 className="mt-1 font-display text-2xl font-black text-dark">Cargar valores confirmados</h2>
        <p className="mt-2 text-sm leading-6 text-gray-text">Cada cambio conserva historial, usuario, vigencia, moneda y auditoría.</p>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {canEditPrices ? <form onSubmit={(event) => submit(event, "/api/admin/precios")} className="space-y-2 rounded-md border border-border bg-background p-4">
          <h3 className="font-bold text-dark">Nuevo precio</h3>
          <select required name="productId" defaultValue="" className="h-9 w-full rounded-md border border-border bg-white px-2 text-sm"><option value="">Producto</option>{products.map((product) => <option key={product.id} value={product.id}>{product.sku} · {product.name}</option>)}</select>
          <div className="grid grid-cols-2 gap-2"><input required name="amount" inputMode="decimal" placeholder="Importe" className="h-9 rounded-md border border-border bg-white px-2 text-sm" /><input required name="currency" defaultValue="PEN" maxLength={3} placeholder="Moneda ISO" className="h-9 rounded-md border border-border bg-white px-2 text-sm uppercase" /></div>
          <select required name="priceType" defaultValue="RETAIL" className="h-9 w-full rounded-md border border-border bg-white px-2 text-sm"><option value="RETAIL">Minorista</option><option value="WHOLESALE">Mayorista</option>{canManageCost ? <option value="COST">Costo</option> : null}<option value="MINIMUM">Mínimo</option><option value="SPECIAL">Especial</option></select>
          <input name="validFrom" type="datetime-local" className="h-9 w-full rounded-md border border-border bg-white px-2 text-sm" /><input name="validUntil" type="datetime-local" className="h-9 w-full rounded-md border border-border bg-white px-2 text-sm" /><input required name="reason" placeholder="Motivo" className="h-9 w-full rounded-md border border-border bg-white px-2 text-sm" />
          <button disabled={busy || !products.length} className="rounded-md bg-dark px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Guardar precio</button>
        </form> : <div className="rounded-md border border-border bg-background p-4 text-sm text-gray-text">Tu rol puede consultar precios, pero no crearlos ni modificarlos.</div>}
        {canManageDiscounts ? (
          <form onSubmit={(event) => submit(event, "/api/admin/descuentos")} className="space-y-2 rounded-md border border-border bg-background p-4">
            <h3 className="font-bold text-dark">Regla de descuento</h3>
            <input required name="name" placeholder="Nombre de regla" className="h-9 w-full rounded-md border border-border bg-white px-2 text-sm" />
            <div className="grid grid-cols-2 gap-2"><input required name="maxPercentage" inputMode="decimal" placeholder="Máximo %" className="h-9 rounded-md border border-border bg-white px-2 text-sm" /><input required name="approvalAbovePercentage" inputMode="decimal" placeholder="Aprobación desde %" className="h-9 rounded-md border border-border bg-white px-2 text-sm" /></div>
            <input name="validFrom" type="datetime-local" className="h-9 w-full rounded-md border border-border bg-white px-2 text-sm" /><input name="validUntil" type="datetime-local" className="h-9 w-full rounded-md border border-border bg-white px-2 text-sm" /><input required name="reason" placeholder="Motivo" className="h-9 w-full rounded-md border border-border bg-white px-2 text-sm" />
            <button disabled={busy} className="rounded-md bg-dark px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Guardar regla</button>
          </form>
        ) : <div className="rounded-md border border-border bg-background p-4 text-sm text-gray-text">Tu rol puede consultar reglas, pero no crearlas ni activarlas.</div>}
      </div>
      {message ? <p className="mt-4 text-sm font-bold text-gray-text" role="status">{message}</p> : null}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="font-bold text-dark">Precios cargados: {prices.length}</h3>
          {prices.length ? <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="border-b border-border text-gray-text"><tr><th className="px-2 py-2">SKU</th><th className="px-2 py-2">Tipo</th><th className="px-2 py-2">Importe</th><th className="px-2 py-2">Estado</th>{canEditPrices ? <th className="px-2 py-2">Acciones</th> : null}</tr></thead><tbody>{prices.map((price) => <tr key={price.id} className="border-b border-border"><td className="px-2 py-2 font-mono">{price.sku}</td><td className="px-2 py-2">{price.priceType}</td><td className="px-2 py-2 font-bold">{price.currency} {price.amount}</td><td className="px-2 py-2">{price.active ? "Activo" : "Archivado"}</td>{canEditPrices ? <td className="flex gap-2 px-2 py-2"><button type="button" disabled={busy} onClick={() => editPrice(price)} className="font-bold text-primary disabled:opacity-50">Editar</button>{price.active ? <button type="button" disabled={busy} onClick={() => archivePrice(price)} className="font-bold text-red-600 disabled:opacity-50">Archivar</button> : null}</td> : null}</tr>)}</tbody></table></div> : <p className="mt-2 text-sm text-gray-text">Aún no existen precios confirmados; los productos sin precio siguen visibles arriba.</p>}
        </div>
        <div>
          <h3 className="font-bold text-dark">Reglas cargadas: {rules.length}</h3>
          {rules.length ? <div className="mt-3 grid gap-2">{rules.map((rule) => <div key={rule.id} className="rounded-md border border-border p-3 text-sm"><span className="font-bold">{rule.name}</span><span className="ml-2 text-gray-text">máx. {rule.maxPercentage}% · aprobación {rule.approvalAbovePercentage}% · {rule.status}</span>{canManageDiscounts ? <><button type="button" disabled={busy} onClick={() => editRule(rule)} className="ml-3 font-bold text-primary disabled:opacity-50">Editar</button><button type="button" disabled={busy} onClick={() => changeRuleStatus(rule)} className="ml-3 font-bold text-primary disabled:opacity-50">Cambiar estado</button></> : null}</div>)}</div> : <p className="mt-2 text-sm text-gray-text">Aún no existen reglas confirmadas.</p>}
        </div>
      </div>
      <div className="mt-6">
        <h3 className="font-bold text-dark">Historial de cambios: {history.length}</h3>
        {history.length ? <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="border-b border-border text-gray-text"><tr><th className="px-2 py-2">Fecha</th><th className="px-2 py-2">SKU</th><th className="px-2 py-2">Tipo</th><th className="px-2 py-2">Antes / después</th><th className="px-2 py-2">Motivo</th><th className="px-2 py-2">Actor</th></tr></thead><tbody>{history.map((entry) => <tr key={entry.id} className="border-b border-border"><td className="px-2 py-2">{new Date(entry.createdAt).toLocaleString("es-PE")}</td><td className="px-2 py-2 font-mono">{entry.sku}</td><td className="px-2 py-2">{entry.priceType}</td><td className="px-2 py-2">{entry.previousAmount ?? "—"} → {entry.newAmount ?? "—"} {entry.currency}</td><td className="px-2 py-2">{entry.reason ?? "—"}</td><td className="px-2 py-2">{entry.actorName ?? "Sistema"}</td></tr>)}</tbody></table></div> : <p className="mt-2 text-sm text-gray-text">Aún no hay cambios de precios auditados.</p>}
      </div>
    </section>
  );
}
