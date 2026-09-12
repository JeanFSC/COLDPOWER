"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Download,
  Filter,
  LoaderCircle,
  PackageCheck,
  Search,
  Truck,
} from "lucide-react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import type { OrderListItem, OrdersPageResponse } from "@/lib/orders-contract";

type Detail = {
  order: Record<string, unknown>;
  customer?: Record<string, unknown>;
  location?: Record<string, unknown> | null;
  items: Array<Record<string, unknown>>;
  incidents: Array<Record<string, unknown>>;
  history: Array<Record<string, unknown>>;
  reconciliation?: {
    expectedAmount: string;
    grossReceivedAmount: string;
    refundedAmount: string;
    netReceivedAmount: string;
    difference: string;
    status: string;
  };
};
const label: Record<string, string> = {
  NEW: "Nuevo",
  RECEIVED: "Recibido",
  PAYMENT_PENDING: "Pendiente de pago",
  PAID: "Pagado",
  PREPARING: "En preparación",
  READY: "Listo",
  READY_FOR_PICKUP: "Listo para recojo",
  IN_TRANSIT: "En tránsito",
  SHIPPED: "Despachado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
  PENDING: "Pendiente",
  MATCH: "Conciliado",
  UNDERPAID: "Faltante",
  OVERPAID: "Sobrepago",
  NORMAL: "Normal",
  REQUIRES_ATTENTION: "Requiere atención",
  OVERDUE: "Vencido",
  INCIDENT: "Incidencia",
};
const incidentTypeLabel: Record<string, string> = {
  PHYSICAL_SHORTAGE: "Faltante físico",
  DAMAGED_PRODUCT: "Producto dañado",
  STOCK_MISMATCH: "Stock inconsistente",
  WRONG_PRODUCT: "Producto incorrecto",
  OTHER: "Otro",
};
function text(value: string | null | undefined) {
  return value ? (label[value] ?? value) : "N/D";
}
function money(currency: string, value: string | number) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency }).format(Number(value));
}
function tone(value: string) {
  return value === "DELIVERED" ||
    value === "MATCH" ||
    value === "READY" ||
    value === "READY_FOR_PICKUP"
    ? "bg-[#e4f7ef] text-[#13885c]"
    : value === "INCIDENT" || value === "OVERDUE" || value === "UNDERPAID"
      ? "bg-[#fff0e8] text-[#d7641e]"
      : value === "CANCELLED"
        ? "bg-[#feecec] text-[#d94848]"
        : "bg-[#e8f1ff] text-[#2277ee]";
}
async function read(response: Response) {
  return response.json().catch(() => ({})) as Promise<Record<string, unknown>>;
}
function apiMessage(payload: Record<string, unknown>, fallback: string) {
  const error = payload.error;
  return typeof error === "string"
    ? error
    : typeof error === "object" && error && "message" in error && typeof error.message === "string"
      ? error.message
      : fallback;
}

export function OrdersControlCenter({
  page,
  queryString,
  canManage,
  canPaymentsView,
}: {
  page: OrdersPageResponse;
  queryString: string;
  canManage: boolean;
  canPaymentsView: boolean;
}) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const { prepare, dispatch, pickup, incidents } = page.queues;
  const metrics = [
    ["Pedidos activos", page.metrics.active, "Todos salvo entregados/cancelados"],
    ["En preparación", page.metrics.preparing, "Picking en curso"],
    ["Listos", page.metrics.ready, "Despacho o recojo"],
    ["En tránsito", page.metrics.inTransit, "Entrega pendiente"],
    ["Pendientes", page.metrics.pending, "Pago, nuevos o recibidos"],
  ] as const;
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[27px] font-black tracking-tight text-[#102a43]">
            Gestión de pedidos
          </h1>
          <p className="mt-1 text-[11px] font-semibold text-[#71869c]">
            Controla la preparación, despacho y entrega de los pedidos.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/api/admin/pedidos/export?${queryString}`}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dce6ee] bg-white px-3.5 text-[10px] font-extrabold text-[#304b66]"
          >
            <Download className="h-4 w-4" />
            Exportar
          </Link>
          <button
            onClick={() => setDetailId(prepare[0]?.id ?? page.items[0]?.id ?? null)}
            disabled={!prepare.length && !page.items.length}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2277ee] px-3.5 text-[10px] font-extrabold text-white disabled:opacity-50"
          >
            <ClipboardCheck className="h-4 w-4" />
            Preparar pedido
          </button>
        </div>
      </header>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map(([title, value, note], index) => (
          <article
            key={title}
            className="min-h-[118px] rounded-xl border border-[#e2eaf1] bg-white p-3.5 shadow-[0_1px_3px_rgba(16,42,67,0.035)]"
          >
            <div className="flex gap-2.5">
              <span
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${index === 4 ? "bg-[#fff0e8] text-[#d7641e]" : index === 3 ? "bg-[#e4f7ef] text-[#13885c]" : "bg-[#e8f1ff] text-[#2277ee]"}`}
              >
                {index === 4 ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : index === 3 ? (
                  <Truck className="h-4 w-4" />
                ) : (
                  <PackageCheck className="h-4 w-4" />
                )}
              </span>
              <div>
                <p className="text-[10px] font-semibold text-[#7d91a5]">{title}</p>
                <p className="mt-1 font-display text-[20px] font-black text-[#102a43]">{value}</p>
                <p className="mt-1 text-[9px] font-bold text-[#71869c]">{note}</p>
              </div>
            </div>
            <div className="mt-5 border-t border-[#edf2f6]" />
          </article>
        ))}
      </section>
      <form
        action="/admin/pedidos"
        className="flex flex-wrap gap-2 rounded-xl border border-[#e2eaf1] bg-white p-2.5 shadow-[0_1px_3px_rgba(16,42,67,0.035)]"
      >
        <label className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-[#dce6ee] px-3">
          <Search className="h-4 w-4 text-[#71869c]" />
          <input
            name="query"
            defaultValue={new URLSearchParams(queryString).get("query") ?? ""}
            placeholder="Buscar pedido, cliente, SKU o producto..."
            className="w-full bg-transparent text-[11px] font-semibold outline-none placeholder:text-[#9aabba]"
          />
        </label>
        <Select name="status" label="Estado" values={page.facets.statuses} query={queryString} />
        <Select
          name="deliveryMethod"
          label="Entrega"
          values={page.facets.deliveryMethods}
          query={queryString}
        />
        <Select
          name="currency"
          label="Moneda"
          values={page.facets.currencies}
          query={queryString}
        />
        {canPaymentsView ? (
          <Select
            name="reconciliation"
            label="Pago"
            values={["PENDING", "MATCH", "UNDERPAID", "OVERPAID"]}
            query={queryString}
          />
        ) : null}
        <details className="relative">
          <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-[#dce6ee] px-3 text-[10px] font-extrabold text-[#304b66]">
            <Filter className="h-3.5 w-3.5" />
            Más filtros
          </summary>
          <div className="absolute right-0 z-30 mt-2 grid w-[min(92vw,620px)] gap-3 rounded-xl border border-[#dce6ee] bg-white p-4 shadow-2xl sm:grid-cols-2">
            <FilterText name="customer" label="Cliente" query={queryString} placeholder="Nombre del cliente" />
            <FilterText name="seller" label="Vendedor" query={queryString} placeholder="Nombre del vendedor" />
            <Select
              name="locationId"
              label="Local"
              values={page.facets.locations.map((location) => location.id)}
              labels={Object.fromEntries(page.facets.locations.map((location) => [location.id, location.name]))}
              query={queryString}
            />
            <Select name="withIncident" label="Incidencia" values={["true"]} labels={{ true: "Con incidencia abierta" }} query={queryString} />
            <FilterDate name="createdFrom" label="Creado desde" query={queryString} />
            <FilterDate name="createdTo" label="Creado hasta" query={queryString} />
            <button className="h-10 rounded-lg bg-[#2277ee] px-3 text-[10px] font-extrabold text-white sm:col-span-2">
              Aplicar filtros
            </button>
          </div>
        </details>
        <button className="h-10 rounded-lg border border-[#dce6ee] px-3 text-[10px] font-extrabold text-[#304b66]">
          Aplicar
        </button>
      </form>
      <section className="overflow-hidden rounded-xl border border-[#e2eaf1] bg-white shadow-[0_1px_3px_rgba(16,42,67,0.035)]">
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="bg-[#fbfcfd] text-[8px] font-extrabold uppercase tracking-wide text-[#7890a7]">
              <tr>
                {[
                  "Pedido",
                  "Cliente",
                  "Productos",
                  "Total",
                  "Estado logístico",
                  "Atención",
                  "Entrega",
                  ...(canPaymentsView ? ["Pago"] : []),
                  "Local",
                  "",
                ].map((header) => (
                  <th key={header} className="px-3 py-3">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {page.items.map((item) => (
                <OrderRow
                  key={item.id}
                  item={item}
                  onOpen={setDetailId}
                  canPaymentsView={canPaymentsView}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-2 p-3 lg:hidden">
          {page.items.map((item) => (
            <button
              key={item.id}
              onClick={() => setDetailId(item.id)}
              className="rounded-lg border border-[#e4edf4] p-3 text-left"
            >
              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold text-[#2277ee]">{item.code}</p>
                  <p className="mt-1 text-[10px] text-[#526b84]">{item.customerName}</p>
                </div>
                <strong className="text-xs text-[#173654]">
                  {money(item.currency, item.total)}
                </strong>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge value={item.status} />
                {canPaymentsView ? <Badge value={item.paymentReconciliation} /> : null}
              </div>
            </button>
          ))}
        </div>
        {page.items.length === 0 ? (
          <div className="border-t border-[#edf2f6] p-10 text-center">
            <p className="text-sm font-extrabold text-[#304b66]">
              {page.totalItems ? "No hay pedidos en esta página." : "No hay pedidos con estos filtros."}
            </p>
          </div>
        ) : null}
        <Pager page={page.page} total={page.totalPages} query={queryString} />
      </section>
      <section>
        <h2 className="text-[15px] font-extrabold text-[#102a43]">Centro de operaciones</h2>
        <p className="mt-1 text-[10px] font-semibold text-[#8296a9]">
          Prioriza picking, despacho, recojo e incidencias sin cambiar estados libremente.
        </p>
        <div className="mt-3 grid gap-3 lg:grid-cols-4">
          <Queue title="Listos para preparar" rows={prepare} onOpen={setDetailId} />
          <Queue title="Listos para despacho" rows={dispatch} onOpen={setDetailId} />
          <Queue title="Listos para recojo" rows={pickup} onOpen={setDetailId} />
          <Queue title="Incidencias" rows={incidents} onOpen={setDetailId} />
        </div>
      </section>
      <OrderDrawer
        key={detailId ?? "closed"}
        orderId={detailId}
        canManage={canManage}
        canPaymentsView={canPaymentsView}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}

function OrderRow({
  item,
  onOpen,
  canPaymentsView,
}: {
  item: OrderListItem;
  onOpen: (id: string) => void;
  canPaymentsView: boolean;
}) {
  return (
    <tr className="border-t border-[#edf2f6] text-[10px] font-semibold text-[#526b84] hover:bg-[#fbfdff]">
      <td className="px-3 py-3">
        <button onClick={() => onOpen(item.id)} className="text-left font-extrabold text-[#2277ee]">
          {item.code}
          <span className="mt-0.5 block text-[9px] text-[#8296a9]">
            {item.quoteTrackingCode ?? "Venta directa"}
          </span>
        </button>
      </td>
      <td className="px-3 py-3">{item.customerName}</td>
      <td className="px-3 py-3">
        <strong className="text-[#304b66]">
          {item.pickedQuantity}/{item.totalQuantity}
        </strong>
        <span className="ml-1 text-[9px] text-[#8296a9]">preparados</span>
      </td>
      <td className="px-3 py-3 font-extrabold text-[#173654]">
        {money(item.currency, item.total)}
      </td>
      <td className="px-3 py-3">
        <Badge value={item.status} />
      </td>
      <td className="px-3 py-3">
        <Badge value={item.attention} />
      </td>
      <td className="px-3 py-3">{text(item.deliveryMethod)}</td>
      {canPaymentsView ? (
        <td className="px-3 py-3">
          <Badge value={item.paymentReconciliation} />
        </td>
      ) : null}
      <td className="px-3 py-3">{item.locationName ?? "N/D"}</td>
      <td className="px-3 py-3">
        <button
          onClick={() => onOpen(item.id)}
          className="rounded p-1 text-[#526b84] hover:bg-[#edf4fa]"
          aria-label={`Ver ${item.code}`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}
function Badge({ value }: { value: string }) {
  return (
    <span className={`inline-flex rounded-md px-2 py-1 text-[8px] font-extrabold ${tone(value)}`}>
      {text(value)}
    </span>
  );
}
function Select({
  name,
  label,
  values,
  labels = {},
  query,
}: {
  name: string;
  label: string;
  values: string[];
  labels?: Record<string, string>;
  query: string;
}) {
  return (
    <select
      name={name}
      aria-label={label}
      defaultValue={new URLSearchParams(query).get(name) ?? ""}
      className="h-10 rounded-lg border border-[#dce6ee] bg-white px-3 text-[10px] font-extrabold text-[#304b66]"
    >
        <option value="">{label}</option>
        {values.map((value) => (
          <option key={value} value={value}>
            {labels[value] ?? text(value)}
          </option>
        ))}
    </select>
  );
}
function FilterText({
  name,
  label,
  placeholder,
  query,
}: {
  name: string;
  label: string;
  placeholder: string;
  query: string;
}) {
  return (
    <label className="grid gap-1 text-[9px] font-extrabold text-[#526b84]">
      {label}
      <input
        name={name}
        defaultValue={new URLSearchParams(query).get(name) ?? ""}
        placeholder={placeholder}
        className="h-10 rounded-lg border border-[#dce6ee] bg-white px-3 text-[10px] font-semibold text-[#304b66] outline-none focus:border-[#2277ee]"
      />
    </label>
  );
}
function FilterDate({ name, label, query }: { name: string; label: string; query: string }) {
  return (
    <label className="grid gap-1 text-[9px] font-extrabold text-[#526b84]">
      {label}
      <input
        type="date"
        name={name}
        defaultValue={new URLSearchParams(query).get(name) ?? ""}
        className="h-10 rounded-lg border border-[#dce6ee] bg-white px-3 text-[10px] font-semibold text-[#304b66]"
      />
    </label>
  );
}
function Pager({ page, total, query }: { page: number; total: number; query: string }) {
  const href = (value: number) => {
    const params = new URLSearchParams(query);
    params.set("page", String(value));
    return `/admin/pedidos?${params}`;
  };
  return (
    <div className="flex items-center justify-between border-t border-[#edf2f6] px-4 py-3 text-[10px]">
      <span className="text-[#8296a9]">
        Página {page} de {total}
      </span>
      <div className="flex gap-1">
        <Link href={href(Math.max(1, page - 1))} className="rounded px-2 py-1 hover:bg-[#edf4fa]">
          Anterior
        </Link>
        <Link
          href={href(Math.min(total, page + 1))}
          className="rounded px-2 py-1 hover:bg-[#edf4fa]"
        >
          Siguiente
        </Link>
      </div>
    </div>
  );
}
function Queue({
  title,
  rows,
  onOpen,
}: {
  title: string;
  rows: OrderListItem[];
  onOpen: (id: string) => void;
}) {
  return (
    <section className="rounded-xl border border-[#e2eaf1] bg-white p-3.5 shadow-[0_1px_3px_rgba(16,42,67,0.035)]">
      <h3 className="text-[12px] font-extrabold text-[#173654]">{title}</h3>
      <div className="mt-3 grid gap-2">
        {rows.length ? (
          rows.map((row) => (
            <button
              key={row.id}
              onClick={() => onOpen(row.id)}
              className="flex items-center justify-between gap-2 rounded-lg border border-[#edf2f6] p-2.5 text-left hover:bg-[#f8fbfe]"
            >
              <div className="min-w-0">
                <p className="truncate text-[10px] font-extrabold text-[#2277ee]">{row.code}</p>
                <p className="mt-1 truncate text-[9px] text-[#71869c]">{row.customerName}</p>
              </div>
              <Badge value={row.openIncidentCount ? "INCIDENT" : row.status} />
            </button>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-[#dce6ee] p-3 text-[10px] text-[#8296a9]">
            Sin pedidos en esta cola.
          </p>
        )}
      </div>
    </section>
  );
}

function OrderDrawer({
  orderId,
  canManage,
  canPaymentsView,
  onClose,
}: {
  orderId: string | null;
  canManage: boolean;
  canPaymentsView: boolean;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [tab, setTab] = useState("Resumen");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [receivedBy, setReceivedBy] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [incident, setIncident] = useState({
    type: "PHYSICAL_SHORTAGE",
    note: "",
    blocker: false,
    itemId: "",
  });
  const [resolutionNote, setResolutionNote] = useState("");
  const [incidentBusyId, setIncidentBusyId] = useState<string | null>(null);
  const loadDetail = useCallback(async () => {
    if (!orderId) return;
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/admin/pedidos/${encodeURIComponent(orderId)}`, {
        cache: "no-store",
      });
      const data = await read(response);
      if (!response.ok || !data.order) {
        throw new Error(apiMessage(data, "No se pudo cargar el pedido."));
      }
      setDetail(data as unknown as Detail);
      setDetailError(null);
    } catch (error) {
      setDetail(null);
      setDetailError(error instanceof Error ? error.message : "No se pudo cargar el pedido.");
      throw error;
    } finally {
      setDetailLoading(false);
    }
  }, [orderId]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDetail().catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDetail]);
  const order = detail?.order;
  const currency = String(order?.currency ?? "PEN");
  const actions = useMemo(
    () =>
      detail
        ? nextActions(
            String(detail.order.status),
            String(detail.order.deliveryMethod),
            detail.items.every((item) => Number(item.pickedQuantity) >= Number(item.quantity)),
          ).filter(
            (action) =>
              action.status !== "CANCELLED" ||
              !detail.reconciliation ||
              Number(detail.reconciliation.netReceivedAmount) <= 0,
          )
        : [],
    [detail],
  );
  async function refresh() {
    await loadDetail();
  }
  async function transition(status: string) {
    if (!orderId || !detail) return;
    const reason = status === "CANCELLED" ? cancelReason : "";
    if (status === "CANCELLED" && !cancelReason.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/pedidos/${encodeURIComponent(orderId)}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": `order-status-${orderId}-${detail.order.version}-${status}-${crypto.randomUUID()}`.slice(0, 180),
        },
        body: JSON.stringify({ status, expectedVersion: detail.order.version, reason, receivedBy }),
      });
      const data = await read(response);
      if (!response.ok) throw new Error(apiMessage(data, "No se pudo actualizar el pedido."));
      if (status === "CANCELLED") setCancelReason("");
      if (status === "DELIVERED") setReceivedBy("");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo actualizar el pedido.");
    } finally {
      setBusy(false);
    }
  }
  async function pick(item: Record<string, unknown>, pickedQuantity: number) {
    if (!orderId || !detail) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/pedidos/${encodeURIComponent(orderId)}/picking`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orderItemId: item.id,
          pickedQuantity,
          expectedVersion: detail.order.version,
        }),
      });
      const data = await read(response);
      if (!response.ok) throw new Error(apiMessage(data, "No se pudo actualizar el picking."));
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo actualizar el picking.");
    } finally {
      setBusy(false);
    }
  }
  async function createIncident() {
    if (!orderId || !incident.note.trim()) return;
    setBusy(true);
    try {
      const response = await fetch(
        `/api/admin/pedidos/${encodeURIComponent(orderId)}/incidencias`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            type: incident.type,
            note: incident.note,
            blocker: incident.blocker,
            orderItemId: incident.itemId || undefined,
          }),
        },
      );
      const data = await read(response);
      if (!response.ok) throw new Error(apiMessage(data, "No se pudo registrar la incidencia."));
      setIncident({ type: "PHYSICAL_SHORTAGE", note: "", blocker: false, itemId: "" });
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo registrar la incidencia.");
    } finally {
      setBusy(false);
    }
  }
  async function resolveIncident(incidentId: string) {
    if (!orderId) return;
    setIncidentBusyId(incidentId);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/admin/pedidos/${encodeURIComponent(orderId)}/incidencias`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            incidentId,
            note: resolutionNote.trim() || undefined,
          }),
        },
      );
      const data = await read(response);
      if (!response.ok) throw new Error(apiMessage(data, "No se pudo resolver la incidencia."));
      setResolutionNote("");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo resolver la incidencia.");
    } finally {
      setIncidentBusyId(null);
    }
  }
  return (
    <AdminDrawer open={Boolean(orderId)} onClose={onClose} title="Pedido y fulfillment" size="wide">
      {detailError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p role="alert">{detailError}</p>
          <button
            type="button"
            onClick={() => void loadDetail().catch(() => undefined)}
            disabled={detailLoading}
            className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 text-[10px] font-extrabold text-red-800 disabled:opacity-50"
          >
            {detailLoading ? "Reintentando…" : "Reintentar"}
          </button>
        </div>
      ) : detailLoading || !detail ? (
        <div className="flex gap-2 text-sm text-[#71869c]">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Cargando pedido…
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-4">
            {[
              ["Pedido", order?.code],
              ["Cliente", detail.customer?.name],
              ["Total", money(currency, String(order?.total ?? 0))],
                ...(canPaymentsView && detail.reconciliation
                  ? [["Cobro", text(detail.reconciliation.status)] as [string, unknown]]
                  : []),
            ].map(([name, value]) => (
              <div key={String(name)} className="rounded-lg border border-[#edf2f6] p-3">
                <p className="text-[9px] font-extrabold uppercase text-[#71869c]">{String(name)}</p>
                <p className="mt-1 truncate text-xs font-extrabold text-[#173654]">
                  {String(value)}
                </p>
              </div>
            ))}
          </div>
          <div
            className="flex flex-wrap gap-1 border-b border-[#edf2f6] pb-2"
            role="tablist"
            aria-label="Secciones del pedido"
          >
            {(canPaymentsView
              ? ["Resumen", "Productos", "Preparación", "Entrega", "Pago", "Historial"]
              : ["Resumen", "Productos", "Preparación", "Entrega", "Historial"]
            ).map(
              (value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTab(value)}
                  aria-selected={tab === value}
                  role="tab"
                  className={`rounded-md px-2.5 py-1.5 text-[10px] font-extrabold ${tab === value ? "bg-[#e8f1ff] text-[#2277ee]" : "text-[#71869c]"}`}
                >
                  {value}
                </button>
              ),
            )}
          </div>
          {tab === "Productos" || tab === "Preparación" ? (
            <div className="space-y-2">
              {detail.items.map((item) => (
                <div key={String(item.id)} className="rounded-lg border border-[#edf2f6] p-3">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-extrabold text-[#304b66]">
                        {String(item.skuSnapshot)} · {String(item.productNameSnapshot)}
                      </p>
                      <p className="mt-1 text-[9px] text-[#8296a9]">
                        Solicitado {String(item.quantity)} · Preparado {String(item.pickedQuantity)}{" "}
                        · Reserva {item.reservationId ? "activa" : "N/D"}
                      </p>
                    </div>
                    {tab === "Preparación" && canManage && String(order?.status) === "PREPARING" ? (
                      <button
                        disabled={busy || Number(item.pickedQuantity) >= Number(item.quantity)}
                        onClick={() =>
                          void pick(
                            item,
                            Math.min(Number(item.quantity), Number(item.pickedQuantity) + 1),
                          )
                        }
                        className="rounded-lg border border-[#2277ee] px-2 text-[9px] font-extrabold text-[#2277ee]"
                      >
                        +1 preparado
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-[#edf2f6]">
                    <span
                      className="block h-full rounded-full bg-[#159263]"
                      style={{
                        width: `${Math.min(100, (Number(item.pickedQuantity) / Math.max(1, Number(item.quantity))) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : tab === "Pago" && canPaymentsView && detail.reconciliation ? (
            <div className="grid gap-2 sm:grid-cols-5">
              {[
                ["Esperado", detail.reconciliation.expectedAmount],
                ["Recibido", detail.reconciliation.grossReceivedAmount],
                ["Reembolsado", detail.reconciliation.refundedAmount],
                ["Neto", detail.reconciliation.netReceivedAmount],
                ["Diferencia", detail.reconciliation.difference],
              ].map(([name, value]) => (
                <div key={String(name)} className="rounded-lg border border-[#edf2f6] p-3">
                  <p className="text-[9px] text-[#71869c]">{name}</p>
                  <p className="mt-1 text-xs font-extrabold text-[#173654]">
                    {money(currency, String(value))}
                  </p>
                </div>
              ))}
              <Link href="/admin/pagos" className="text-[10px] font-extrabold text-[#2277ee]">
                Gestionar pago →
              </Link>
            </div>
          ) : tab === "Historial" ? (
            <div className="grid gap-2">
              {detail.history.map((row) => (
                <div
                  key={String(row.id)}
                  className="rounded-lg border border-[#edf2f6] p-3 text-[10px] text-[#526b84]"
                >
                  {text(String(row.status))} ·{" "}
                  {new Date(String(row.createdAt)).toLocaleString("es-PE")}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg bg-[#f7fbff] p-3 text-[10px] text-[#526b84]">
                {text(String(order?.deliveryMethod))} · {text(String(order?.status))} · Local{" "}
                {String(detail.location?.name ?? "N/D")}
              </div>
              {tab === "Entrega" ? (
                <p className="text-[10px] text-[#526b84]">
                  El avance depende del método de entrega y se habilita solo cuando el picking está
                  completo.
                </p>
              ) : null}
              {canManage && actions.some((action) => action.status === "DELIVERED") ? (
                <label className="block text-[10px] font-semibold text-[#526b84]">
                  Receptor (opcional)
                  <input
                    value={receivedBy}
                    onChange={(event) => setReceivedBy(event.target.value)}
                    maxLength={160}
                    placeholder="Nombre de quien recibe el pedido"
                    className="mt-1 h-9 w-full rounded border border-[#dce6ee] px-2 text-[10px] text-[#173654]"
                  />
                </label>
              ) : null}
              {canManage && actions.some((action) => action.status === "CANCELLED") ? (
                <label className="block text-[10px] font-semibold text-[#8a4b20]">
                  Motivo de cancelación
                  <input
                    value={cancelReason}
                    onChange={(event) => setCancelReason(event.target.value)}
                    maxLength={500}
                    placeholder="Obligatorio para cancelar y liberar reservas"
                    className="mt-1 h-9 w-full rounded border border-[#e8d5c6] px-2 text-[10px] text-[#173654]"
                  />
                </label>
              ) : null}
              {canManage &&
              canPaymentsView &&
              detail.reconciliation &&
              Number(detail.reconciliation.netReceivedAmount) > 0 &&
              ["NEW", "RECEIVED", "PAYMENT_PENDING", "PREPARING"].includes(
                String(order?.status),
              ) ? (
                <p className="rounded-lg border border-[#f4d3bd] bg-[#fffaf6] p-2 text-[10px] text-[#8a4b20]">
                  Este pedido tiene cobros confirmados. Antes de cancelarlo, gestiona el reembolso
                  desde Pagos.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {canManage
                  ? actions.map((action) => (
                      <button
                        key={action.status}
                        disabled={busy || (action.status === "CANCELLED" && !cancelReason.trim())}
                        onClick={() => void transition(action.status)}
                        className="rounded-lg bg-[#2277ee] px-3 py-2 text-[10px] font-extrabold text-white disabled:opacity-50"
                      >
                        {action.label}
                      </button>
                    ))
                  : null}
                {canPaymentsView ? (
                  <Link
                    href="/admin/pagos"
                    className="rounded-lg border border-[#dce6ee] px-3 py-2 text-[10px] font-extrabold text-[#2277ee]"
                  >
                    Gestionar pago
                  </Link>
                ) : null}
              </div>
              {tab === "Resumen" ? (
                <section className="rounded-xl border border-[#e2eaf1] bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-extrabold text-[#173654]">Incidencias</p>
                      <p className="mt-1 text-[9px] text-[#8296a9]">
                        Solo los bloqueadores impiden marcar el pedido como listo.
                      </p>
                    </div>
                    <span className="rounded-full bg-[#fff0e8] px-2 py-1 text-[9px] font-extrabold text-[#d7641e]">
                      {detail.incidents.filter((row) => String(row.status) === "OPEN").length} abiertas
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {detail.incidents.length ? (
                      detail.incidents.map((row) => {
                        const item = detail.items.find((candidate) => candidate.id === row.orderItemId);
                        const open = String(row.status) === "OPEN";
                        return (
                          <div
                            key={String(row.id)}
                            className={`rounded-lg border p-2.5 ${open ? "border-[#f4d3bd] bg-[#fffaf6]" : "border-[#dceee5] bg-[#f8fffb]"}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-[10px] font-extrabold text-[#304b66]">
                                  {incidentTypeLabel[String(row.type)] ?? String(row.type)}
                                  {row.blocker ? " · Bloqueadora" : ""}
                                </p>
                                <p className="mt-1 text-[10px] text-[#526b84]">{String(row.note)}</p>
                                <p className="mt-1 text-[9px] text-[#8296a9]">
                                  {item ? String(item.productNameSnapshot) : "Pedido completo"} · {open ? "Abierta" : "Resuelta"}
                                </p>
                              </div>
                              {open ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#159263]" aria-hidden="true" />
                              ) : (
                                <span className="shrink-0 text-[9px] font-extrabold text-[#159263]">Resuelta</span>
                              )}
                            </div>
                            {open && canManage ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                <input
                                  value={resolutionNote}
                                  onChange={(event) => setResolutionNote(event.target.value)}
                                  maxLength={800}
                                  placeholder="Nota de resolución (opcional)"
                                  className="h-8 min-w-0 flex-1 rounded border border-[#dce6ee] bg-white px-2 text-[10px] text-[#173654]"
                                />
                                <button
                                  disabled={incidentBusyId !== null}
                                  onClick={() => void resolveIncident(String(row.id))}
                                  className="rounded-lg bg-[#159263] px-3 py-2 text-[10px] font-extrabold text-white disabled:opacity-50"
                                >
                                  Resolver
                                </button>
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                    ) : (
                      <p className="rounded-lg border border-dashed border-[#dce6ee] p-3 text-[10px] text-[#8296a9]">
                        No hay incidencias registradas.
                      </p>
                    )}
                  </div>
                </section>
              ) : null}
              {canManage ? (
                <div className="rounded-xl border border-[#f4d3bd] bg-[#fffaf6] p-3">
                  <p className="text-[11px] font-extrabold text-[#8a4b20]">Registrar incidencia</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <select
                      value={incident.type}
                      onChange={(event) => setIncident({ ...incident, type: event.target.value })}
                      className="h-9 rounded border border-[#e8d5c6] px-2 text-[10px]"
                    >
                      <option value="PHYSICAL_SHORTAGE">Faltante físico</option>
                      <option value="DAMAGED_PRODUCT">Producto dañado</option>
                      <option value="STOCK_MISMATCH">Stock inconsistente</option>
                      <option value="WRONG_PRODUCT">Producto incorrecto</option>
                      <option value="OTHER">Otro</option>
                    </select>
                    <select
                      value={incident.itemId}
                      onChange={(event) => setIncident({ ...incident, itemId: event.target.value })}
                      className="h-9 rounded border border-[#e8d5c6] px-2 text-[10px]"
                    >
                      <option value="">Pedido completo</option>
                      {detail.items.map((item) => (
                        <option key={String(item.id)} value={String(item.id)}>
                          {String(item.productNameSnapshot)}
                        </option>
                      ))}
                    </select>
                    <input
                      value={incident.note}
                      onChange={(event) => setIncident({ ...incident, note: event.target.value })}
                      placeholder="Describe la incidencia"
                      maxLength={1000}
                      className="h-9 rounded border border-[#e8d5c6] px-2 text-[10px] sm:col-span-2"
                    />
                  </div>
                  <label className="mt-2 flex items-center gap-2 text-[10px] font-semibold text-[#8a4b20]">
                    <input
                      type="checkbox"
                      checked={incident.blocker}
                      onChange={(event) => setIncident({ ...incident, blocker: event.target.checked })}
                    />
                    Bloquea el avance hasta resolverla
                  </label>
                  <button
                    disabled={busy || !incident.note.trim()}
                    onClick={() => void createIncident()}
                    className="mt-2 rounded-lg border border-[#d7641e] px-3 py-2 text-[10px] font-extrabold text-[#d7641e] disabled:opacity-50"
                  >
                    Guardar incidencia
                  </button>
                </div>
              ) : null}
            </div>
          )}
          {notice ? (
            <p role="alert" className="text-[10px] font-bold text-[#c84848]">
              {notice}
            </p>
          ) : null}
        </div>
      )}
    </AdminDrawer>
  );
}
function nextActions(status: string, delivery: string, picked: boolean) {
  let primary: Array<{ status: string; label: string }> = [];
  if (["PAID", "RECEIVED"].includes(status))
    primary = [{ status: "PREPARING", label: "Iniciar preparación" }];
  else if (status === "PREPARING" && picked)
    primary = [
      {
        status: delivery === "PICKUP" ? "READY_FOR_PICKUP" : "READY",
        label: delivery === "PICKUP" ? "Listo para recojo" : "Marcar listo",
      },
    ];
  else if (status === "READY")
    primary = [
      {
        status: delivery === "SHIPPING" ? "SHIPPED" : "IN_TRANSIT",
        label: delivery === "SHIPPING" ? "Despachar envío" : "Iniciar entrega",
      },
    ];
  else if (["READY_FOR_PICKUP", "IN_TRANSIT", "SHIPPED"].includes(status))
    primary = [{ status: "DELIVERED", label: "Confirmar entrega" }];

  const canCancel = ["NEW", "RECEIVED", "PAYMENT_PENDING", "PREPARING"].includes(status);
  return [...primary, ...(canCancel ? [{ status: "CANCELLED", label: "Cancelar pedido" }] : [])];
}
