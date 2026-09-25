"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Filter,
  LoaderCircle,
  Package,
  PackageCheck,
  Search,
  Truck,
} from "lucide-react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { AdminSelect } from "@/components/admin/AdminSelect";
import type { OrderListItem, OrdersPageResponse } from "@/lib/orders-contract";
import { unconfiguredTaxBreakdown } from "@/lib/tax";

type Detail = {
  order: Record<string, unknown>;
  customer?: Record<string, unknown>;
  location?: Record<string, unknown> | null;
  items: Array<Record<string, unknown>>;
  reservations: Array<Record<string, unknown>>;
  shipments: Array<Record<string, unknown>>;
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
  PAID: "Por preparar",
  PREPARING: "En preparación",
  READY: "Listo",
  READY_FOR_PICKUP: "Listo para recojo",
  IN_TRANSIT: "En tránsito",
  SHIPPED: "Despachado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
  NO_PAYMENT: "Sin cobro",
  ACTIVE: "Activa",
  RELEASED: "Liberada",
  CONSUMED: "Consumida",
  EXPIRED: "Vencida",
  PENDING: "Pendiente",
  MATCH: "Conciliado",
  UNDERPAID: "Faltante",
  OVERPAID: "Sobrepago",
  NORMAL: "Normal",
  REQUIRES_ATTENTION: "Requiere atención",
  OVERDUE: "Vencido",
  INCIDENT: "Incidencia",
  LABEL_CREATED: "Etiqueta creada",
  PICKED_UP: "Recogido por transportista",
  AT_AGENCY: "En agencia",
  OUT_FOR_DELIVERY: "En reparto",
  EXCEPTION: "Incidencia de envío",
  PICKUP: "Recojo en local",
  DELIVERY: "Entrega a domicilio",
  SHIPPING: "Envío por agencia",
};
const incidentTypeLabel: Record<string, string> = {
  PHYSICAL_SHORTAGE: "Faltante físico",
  DAMAGED_PRODUCT: "Producto dañado",
  STOCK_MISMATCH: "Stock inconsistente",
  WRONG_PRODUCT: "Producto incorrecto",
  OTHER: "Otro",
};
const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const primaryButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-xs shadow-blue-500/25 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";
const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
const STAGES = ["Pendiente", "Preparación", "Listo", "Entregado"] as const;

function text(value: string | null | undefined) {
  return value ? (label[value] ?? value) : "N/D";
}
function limaDateTime(value: unknown) {
  if (!value) return "N/D";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "N/D";
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
function historyTransition(row: Record<string, unknown>) {
  const from = row.fromStatus ?? row.from;
  const to = row.toStatus ?? row.to ?? row.status;
  if (from != null || to != null) {
    return `${from == null ? "Inicio" : text(String(from))} → ${to == null ? "Registro" : text(String(to))}`;
  }
  return "Registro";
}
function money(currency: string, value: string | number | null | undefined) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency }).format(Number(value));
}
function tone(value: string) {
  if (value === "DELIVERED" || value === "MATCH" || value === "READY" || value === "READY_FOR_PICKUP")
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (value === "INCIDENT" || value === "OVERDUE" || value === "UNDERPAID")
    return "bg-amber-50 text-amber-700 border-amber-100";
  if (value === "CANCELLED") return "bg-rose-50 text-rose-700 border-rose-100";
  return "bg-blue-50 text-blue-700 border-blue-100";
}
function stageIndex(status: string) {
  if (status === "DELIVERED") return 3;
  if (["READY", "READY_FOR_PICKUP", "IN_TRANSIT", "SHIPPED"].includes(status)) return 2;
  if (status === "PREPARING") return 1;
  return 0;
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
  canViewAmounts,
}: {
  page: OrdersPageResponse;
  queryString: string;
  canManage: boolean;
  canPaymentsView: boolean;
  canViewAmounts: boolean;
}) {
  const [detailId, setDetailId] = useState<string | null>(() => {
    const params = new URLSearchParams(queryString);
    const directId = params.get("orderId");
    if (directId) return directId;
    const saleId = params.get("saleId");
    const quoteId = params.get("quoteId");
    const customerId = params.get("customerId");
    const ownerItem = page.items.find(
      (item) =>
        (saleId !== null && item.saleId === saleId) ||
        (quoteId !== null && item.quoteId === quoteId) ||
        (customerId !== null && item.customerId === customerId),
    );
    return ownerItem?.id ?? null;
  });
  useEffect(() => {
    const paymentId = new URLSearchParams(queryString).get("paymentId");
    if (!paymentId || detailId) return;
    let cancelled = false;
    void fetch(`/api/admin/pagos/${encodeURIComponent(paymentId)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json()) as { order?: { id?: unknown } };
        const resolvedOrderId = data.order?.id;
        if (!cancelled && typeof resolvedOrderId === "string") setDetailId(resolvedOrderId);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [queryString, detailId]);
  const { prepare, dispatch, pickup, incidents } = page.queues;
  const kpis: Array<{
    key: string;
    label: string;
    value: number;
    note: string;
    iconBg: string;
    iconInk: string;
    icon: typeof PackageCheck;
  }> = [
    { key: "total", label: "Pedidos totales", value: page.metrics.total, note: "Todos los pedidos registrados", icon: PackageCheck, iconBg: "bg-blue-50", iconInk: "text-blue-600" },
    { key: "preparing", label: "En preparación", value: page.metrics.preparing, note: "Picking en curso", icon: Clock, iconBg: "bg-amber-50", iconInk: "text-amber-600" },
    { key: "ready", label: "Listos", value: page.metrics.ready, note: "Despacho o recojo", icon: CheckCircle2, iconBg: "bg-emerald-50", iconInk: "text-emerald-600" },
    { key: "delivered", label: "Entregados", value: page.metrics.delivered, note: "Completados", icon: Truck, iconBg: "bg-purple-50", iconInk: "text-purple-600" },
    { key: "pending", label: "Pendientes", value: page.metrics.pending, note: "Pago, nuevos o recibidos", icon: AlertTriangle, iconBg: "bg-rose-50", iconInk: "text-rose-600" },
  ];
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 shadow-xs">
            <PackageCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-900">Gestión de pedidos</h1>
            <p className="text-xs font-normal text-slate-500">Controla la preparación, despacho y entrega de los pedidos.</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href={`/api/admin/pedidos/export?${queryString}`} className={secondaryButtonClass}>
            <Download className="h-3.5 w-3.5 text-slate-500" />
            Exportar
          </Link>
          <button
            onClick={() => setDetailId(prepare[0]?.id ?? null)}
            disabled={!prepare.length}
            className={primaryButtonClass}
          >
            <PackageCheck className="h-3.5 w-3.5" />
            Preparar pedido
          </button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${item.iconBg} ${item.iconInk}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <span className="block truncate text-[11px] font-medium text-slate-500">{item.label}</span>
                  <span className="block truncate text-lg font-bold leading-snug text-slate-900">{item.value}</span>
                </div>
              </div>
              <p className="mt-3 truncate text-[10.5px] font-semibold text-slate-400">{item.note}</p>
            </div>
          );
        })}
      </section>

      <form
        action="/admin/pedidos"
        className="flex flex-wrap items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs"
      >
        <label className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            name="query"
            defaultValue={new URLSearchParams(queryString).get("query") ?? ""}
            placeholder="Buscar pedido, cliente, SKU o producto..."
            className="w-full bg-transparent text-xs font-medium text-slate-700 outline-none placeholder:text-slate-400"
          />
        </label>
        <Select name="status" label="Estado" values={page.facets.statuses} query={queryString} />
        <Select name="deliveryMethod" label="Entrega" values={page.facets.deliveryMethods} query={queryString} />
        <Select name="currency" label="Moneda" values={page.facets.currencies} query={queryString} />
        {canPaymentsView ? (
          <Select name="reconciliation" label="Pago" values={["PENDING", "MATCH", "UNDERPAID", "OVERPAID"]} query={queryString} />
        ) : null}
        <details className="relative">
          <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            Más filtros
          </summary>
          <div className="absolute right-0 z-30 mt-2 grid w-[min(92vw,620px)] gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl sm:grid-cols-2">
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
            <button className={`${primaryButtonClass} sm:col-span-2`}>Aplicar filtros</button>
          </div>
        </details>
        <button className={secondaryButtonClass}>Aplicar</button>
      </form>

      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1040px] text-left text-xs">
            <thead className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                {[
                  "Pedido",
                  "Cliente",
                  "Productos",
                  ...(canViewAmounts ? ["Total"] : []),
                  "Estado logístico",
                  "Atención",
                  "Entrega",
                  ...(canPaymentsView ? ["Pago"] : []),
                  "Local",
                  "Acciones",
                ].map((header) => (
                  <th key={header} className="px-3 py-3 font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {page.items.map((item) => (
                <OrderRow key={item.id} item={item} onOpen={setDetailId} canPaymentsView={canPaymentsView} canViewAmounts={canViewAmounts} />
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-2 p-3 lg:hidden">
          {page.items.map((item) => (
            <button
              key={item.id}
              onClick={() => setDetailId(item.id)}
              className="rounded-lg border border-slate-200 p-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50/60"
            >
              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-blue-600">{item.code}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{item.customerName}</p>
                </div>
                {canViewAmounts ? <strong className="text-xs text-slate-900">{money(item.currency, item.total)}</strong> : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge value={item.status} />
                {canPaymentsView ? <Badge value={item.paymentReconciliation ?? "NO_PAYMENT"} /> : null}
              </div>
            </button>
          ))}
        </div>
        {page.items.length === 0 ? (
          <div className="border-t border-slate-100 p-10 text-center">
            <p className="text-sm font-bold text-slate-700">
              {page.totalItems ? "No hay pedidos en esta página." : "No hay pedidos con estos filtros."}
            </p>
          </div>
        ) : null}
        <Pager page={page.page} total={page.totalPages} query={queryString} totalItems={page.totalItems} pageSize={page.pageSize} />
      </section>

      <section>
        <h2 className="text-sm font-bold tracking-tight text-slate-900">Centro de operaciones</h2>
        <p className="mt-1 text-xs text-slate-500">Prioriza picking, despacho, recojo e incidencias sin cambiar estados libremente.</p>
        <div className="mt-3 grid gap-4 lg:grid-cols-4">
          <Queue title="Por preparar" rows={prepare} onOpen={setDetailId} icon={Package} />
          <Queue title="Listos para despacho" rows={dispatch} onOpen={setDetailId} icon={Truck} />
          <Queue title="Listos para recojo" rows={pickup} onOpen={setDetailId} icon={PackageCheck} />
          <Queue title="Incidencias" rows={incidents} onOpen={setDetailId} icon={AlertTriangle} />
        </div>
      </section>

      <OrderDrawer
        key={detailId ?? "closed"}
        orderId={detailId}
        canManage={canManage}
        canPaymentsView={canPaymentsView}
        canViewAmounts={canViewAmounts}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}

function tabButtonClass(active: boolean) {
  if (active) return "rounded-md px-2.5 py-1.5 text-xs font-semibold bg-blue-50 text-blue-600";
  return "rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700";
}
function LogisticsStepper({ status }: { status: string }) {
  if (status === "CANCELLED") {
    return <span className="mt-1 block text-[10.5px] font-semibold text-slate-400">Sin seguimiento</span>;
  }
  const index = stageIndex(status);
  const dotTone = status === "DELIVERED" ? "bg-emerald-500" : "bg-blue-500";
  return (
    <div className="mt-1.5 flex items-center gap-1" aria-hidden="true">
      {STAGES.map((stage, i) => (
        <span key={stage} className={`h-1.5 w-4 rounded-full ${i <= index ? dotTone : "bg-slate-200"}`} />
      ))}
    </div>
  );
}

function OrderRow({
  item,
  onOpen,
  canPaymentsView,
  canViewAmounts,
}: {
  item: OrderListItem;
  onOpen: (id: string) => void;
  canPaymentsView: boolean;
  canViewAmounts: boolean;
}) {
  return (
    <tr className="transition-colors hover:bg-slate-50/60">
      <td className="px-3 py-3">
        <button onClick={() => onOpen(item.id)} className="text-left font-semibold text-blue-600 hover:underline">
          {item.code}
          <span className="mt-0.5 block text-[10.5px] font-normal text-slate-400">
            {item.quoteTrackingCode ?? (item.channel === "WEB" ? "Compra web" : item.channel ? `Venta ${item.channel}` : "Venta directa")}
          </span>
        </button>
      </td>
      <td className="px-3 py-3 font-medium text-slate-900">
        <Link href={`/admin/clientes?customerId=${encodeURIComponent(item.customerId)}`} className="hover:text-blue-600 hover:underline">
          {item.customerName}
        </Link>
      </td>
      <td className="px-3 py-3">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-[10.5px] font-semibold text-slate-600">
          <Package className="h-3 w-3" aria-hidden="true" />
          {item.pickedQuantity}/{item.totalQuantity}
        </span>
      </td>
      {canViewAmounts ? <td className="px-3 py-3 font-semibold text-slate-900">{money(item.currency, item.total)}</td> : null}
      <td className="px-3 py-3">
        <Badge value={item.status} />
        <LogisticsStepper status={item.status} />
      </td>
      <td className="px-3 py-3">
        <Badge value={item.attention} />
      </td>
      <td className="px-3 py-3 text-slate-500">{text(item.deliveryMethod)}</td>
      {canPaymentsView ? (
        <td className="px-3 py-3">
          <Badge value={item.paymentReconciliation ?? "NO_PAYMENT"} />
        </td>
      ) : null}
      <td className="px-3 py-3 text-slate-500">{item.locationName ?? "N/D"}</td>
      <td className="px-3 py-3 text-center">
        <button
          onClick={() => onOpen(item.id)}
          className="inline-flex rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label={`Ver ${item.code}`}
        >
          <Eye className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}
function Badge({ value }: { value: string }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10.5px] font-medium ${tone(value)}`}>
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
  const current = new URLSearchParams(query).get(name) ?? "";
  return (
    <AdminSelect
      name={name}
      ariaLabel={label}
      className="w-auto min-w-[10rem]"
      value={current}
      options={[{ value: "", label }, ...values.map((value) => ({ value, label: labels[value] ?? text(value) }))]}
    />
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
    <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
      {label}
      <input
        name={name}
        defaultValue={new URLSearchParams(query).get(name) ?? ""}
        placeholder={placeholder}
        className={`${inputClass} normal-case`}
      />
    </label>
  );
}
function FilterDate({ name, label, query }: { name: string; label: string; query: string }) {
  return (
    <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
      {label}
      <input
        type="date"
        name={name}
        defaultValue={new URLSearchParams(query).get(name) ?? ""}
        className={`${inputClass} normal-case`}
      />
    </label>
  );
}
function pagerLinkClass(active: boolean) {
  if (active) return "flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-semibold text-white";
  return "flex h-7 w-7 items-center justify-center rounded-lg text-xs text-slate-600 hover:text-slate-900";
}
function pageNumbers(current: number, total: number) {
  const width = Math.min(5, total);
  const start = Math.max(1, Math.min(current - 2, total - width + 1));
  return Array.from({ length: width }, (_, index) => start + index);
}
function Pager({
  page,
  total,
  query,
  totalItems,
  pageSize,
}: {
  page: number;
  total: number;
  query: string;
  totalItems: number;
  pageSize: number;
}) {
  const href = (value: number) => {
    const params = new URLSearchParams(query);
    params.set("page", String(value));
    return `/admin/pedidos?${params}`;
  };
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(totalItems, page * pageSize);
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 sm:flex-row">
      <span className="text-xs text-slate-500">Mostrando {from} a {to} de {totalItems} pedidos</span>
      {total > 1 ? (
        <nav aria-label="Paginación de pedidos" className="flex items-center gap-1">
          {pageNumbers(page, total).map((value) => (
            <Link
              key={value}
              href={href(value)}
              aria-current={value === page ? "page" : undefined}
              className={pagerLinkClass(value === page)}
            >
              {value}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
function Queue({
  title,
  rows,
  onOpen,
  icon: Icon,
}: {
  title: string;
  rows: OrderListItem[];
  onOpen: (id: string) => void;
  icon: typeof Package;
}) {
  return (
    <section className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
        <h3 className="text-xs font-bold text-slate-900">{title}</h3>
      </div>
      <div className="mt-3 grid gap-2">
        {rows.length ? (
          rows.map((row) => (
            <button
              key={row.id}
              onClick={() => onOpen(row.id)}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-left transition-colors hover:border-slate-200"
            >
              <span className="min-w-0">
                <strong className="block truncate text-[11.5px] font-semibold text-slate-800">{row.code}</strong>
                <small className="mt-0.5 block truncate text-[10px] text-slate-400">{row.customerName}</small>
              </span>
              <Badge value={row.openIncidentCount ? "INCIDENT" : row.status} />
            </button>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-[10.5px] text-slate-400">
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
  canViewAmounts,
  onClose,
}: {
  orderId: string | null;
  canManage: boolean;
  canPaymentsView: boolean;
  canViewAmounts: boolean;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [tab, setTab] = useState("Resumen");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [trackingNotice, setTrackingNotice] = useState<string | null>(null);
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
  const tax = unconfiguredTaxBreakdown();
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
    setTrackingNotice(null);
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
  async function advanceTracking() {
    if (!orderId) return;
    setBusy(true);
    setNotice(null);
    setTrackingNotice(null);
    try {
      const response = await fetch(`/api/admin/pedidos/${encodeURIComponent(orderId)}/envio/avanzar`, { method: "POST" });
      const data = await read(response);
      if (!response.ok) throw new Error(apiMessage(data, "No se pudo avanzar el seguimiento."));
      const event = (data as { event?: { description?: string } }).event;
      setTrackingNotice(event?.description ? `Seguimiento: ${event.description}` : "Seguimiento actualizado.");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo avanzar el seguimiento.");
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
        <div className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">
          <p role="alert">{detailError}</p>
          <button
            type="button"
            onClick={() => void loadDetail().catch(() => undefined)}
            disabled={detailLoading}
            className="mt-3 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-50"
          >
            {detailLoading ? "Reintentando…" : "Reintentar"}
          </button>
        </div>
      ) : detailLoading || !detail ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Cargando pedido…
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-4">
            {[
              ["Pedido", order?.code],
              ["Cliente", detail.customer?.name],
              ...(canViewAmounts ? [["Total", money(currency, String(order?.total ?? 0))] as [string, unknown]] : []),
              ...(canViewAmounts ? [["Op. gravada", tax.taxableOperation ? money(currency, tax.taxableOperation) : "Por configurar"] as [string, unknown], ["IGV 18%", tax.igv ? money(currency, tax.igv) : "Por configurar"] as [string, unknown]] : []),
              ...(canPaymentsView && detail.reconciliation
                ? [["Cobro", text(detail.reconciliation.status)] as [string, unknown]]
                : []),
            ].map(([name, value]) => (
              <div key={String(name)} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{String(name)}</p>
                <p className="mt-1 truncate text-xs font-bold text-slate-900">{String(value)}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 border-b border-slate-100 pb-2" role="tablist" aria-label="Secciones del pedido">
            {(canPaymentsView
              ? ["Resumen", "Productos", "Preparación", "Entrega", "Pago", "Historial"]
              : ["Resumen", "Productos", "Preparación", "Entrega", "Historial"]
            ).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                aria-selected={tab === value}
                role="tab"
                className={tabButtonClass(tab === value)}
              >
                {value}
              </button>
            ))}
          </div>
          {tab === "Productos" || tab === "Preparación" ? (
            <div className="space-y-2">
              {detail.items.map((item) => (
                <div key={String(item.id)} className="rounded-lg border border-slate-100 p-3">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-700">
                        {String(item.skuSnapshot)} · {String(item.productNameSnapshot)}
                      </p>
                      <p className="mt-1 text-[10.5px] text-slate-400">
                        Solicitado {String(item.quantity)} · Preparado {String(item.pickedQuantity)}
                      </p>
                      {item.reservationId ? (
                        (() => {
                          const reservation = detail.reservations.find((candidate) => candidate.id === item.reservationId);
                          return (
                            <p className="mt-1 break-all text-[10.5px] font-medium text-violet-700">
                              Reserva {String(reservation?.id ?? item.reservationId)} · {text(String(reservation?.status ?? "ACTIVE"))} · {String(reservation?.quantity ?? item.quantity)} unidades · {String(detail.location?.name ?? "Local N/D")}
                            </p>
                          );
                        })()
                      ) : (
                        <p className="mt-1 text-[10.5px] font-medium text-slate-400">Sin reserva registrada</p>
                      )}
                    </div>
                    {tab === "Preparación" && canManage && String(order?.status) === "PREPARING" ? (
                      <button
                        disabled={busy || Number(item.pickedQuantity) >= Number(item.quantity)}
                        onClick={() =>
                          void pick(item, Math.min(Number(item.quantity), Number(item.pickedQuantity) + 1))
                        }
                        className="h-8 shrink-0 rounded-lg border border-blue-200 px-2.5 text-[10.5px] font-semibold text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        +1 preparado
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                    <span
                      className="block h-full rounded-full bg-emerald-500"
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
                <div key={String(name)} className="rounded-lg border border-slate-100 p-3">
                  <p className="text-[10.5px] text-slate-400">{name}</p>
                  <p className="mt-1 text-xs font-bold text-slate-900">{money(currency, String(value))}</p>
                </div>
              ))}
              <Link href="/admin/pagos" className="text-xs font-semibold text-blue-600 hover:underline">
                Gestionar pago →
              </Link>
            </div>
          ) : tab === "Historial" ? (
            <div className="grid gap-2">
              {detail.history.map((row) => (
                <div key={String(row.id)} className="rounded-lg border border-slate-100 p-3 text-[11px] text-slate-500">
                  {historyTransition(row)} · {limaDateTime(row.createdAt)}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500">
                {text(String(order?.deliveryMethod))} · {text(String(order?.status))} · Local{" "}
                {String(detail.location?.name ?? "N/D")}
                <span className="mt-1 block text-slate-600">
                  {order?.deliveryAddress
                    ? `Dirección: ${String(order.deliveryAddress)}`
                    : String(order?.deliveryMethod) === "PICKUP"
                      ? "Recojo en el local seleccionado"
                      : "Sin dirección registrada"}
                </span>
              </div>
              {tab === "Entrega" ? (
                detail.shipments[0] ? (
                  <div className="grid gap-2 rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-[11px] text-slate-600 sm:grid-cols-2">
                    <div>
                      <p className="font-semibold text-slate-500">Transportista</p>
                      <p className="mt-1 font-bold text-slate-800">{String(detail.shipments[0].carrier ?? "N/D")}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-500">Guía</p>
                      <p className="mt-1 font-mono font-bold text-slate-800">{String(detail.shipments[0].trackingNumber ?? "N/D")}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-500">Estado</p>
                      <p className="mt-1 font-bold text-slate-800">{text(String(detail.shipments[0].status ?? ""))}</p>
                    </div>
                    {detail.shipments[0].trackingUrl ? (
                      <a
                        href={String(detail.shipments[0].trackingUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="self-end font-semibold text-blue-600 hover:underline"
                      >
                        Abrir seguimiento ↗
                      </a>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    Aún no hay una guía registrada. El avance depende del método de entrega y se habilita solo cuando el picking está completo.
                  </p>
                )
              ) : null}
              {canManage && actions.some((action) => action.status === "DELIVERED") ? (
                <label className="block text-[11px] font-semibold text-slate-500">
                  Receptor (opcional)
                  <input
                    value={receivedBy}
                    onChange={(event) => setReceivedBy(event.target.value)}
                    maxLength={160}
                    placeholder="Nombre de quien recibe el pedido"
                    className={`mt-1 ${inputClass}`}
                  />
                </label>
              ) : null}
              {canManage && actions.some((action) => action.status === "CANCELLED") ? (
                <label className="block text-[11px] font-semibold text-amber-700">
                  Motivo de cancelación
                  <input
                    value={cancelReason}
                    onChange={(event) => setCancelReason(event.target.value)}
                    maxLength={500}
                    placeholder="Obligatorio para cancelar y liberar reservas"
                    className={`mt-1 h-10 w-full rounded-lg border border-amber-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20`}
                  />
                </label>
              ) : null}
              {canManage &&
              canPaymentsView &&
              detail.reconciliation &&
              Number(detail.reconciliation.netReceivedAmount) > 0 &&
              ["NEW", "RECEIVED", "PAYMENT_PENDING", "PREPARING"].includes(String(order?.status)) ? (
                <p className="rounded-lg border border-amber-100 bg-amber-50 p-2.5 text-[11px] font-medium text-amber-700">
                  Este pedido tiene cobros confirmados. Antes de cancelarlo, gestiona el reembolso desde Pagos.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {canManage
                  ? actions.map((action) => (
                      <button
                        key={action.status}
                        disabled={busy || (action.status === "CANCELLED" && !cancelReason.trim())}
                        onClick={() => void transition(action.status)}
                        className={primaryButtonClass}
                      >
                        {action.label}
                      </button>
                    ))
                  : null}
                {canManage && detail.shipments.length > 0 && ["IN_TRANSIT", "SHIPPED"].includes(String(order?.status)) ? (
                  <button type="button" disabled={busy} onClick={() => void advanceTracking()} className={secondaryButtonClass} title="Registra el siguiente evento del transportista (solo con el transportista de prueba)">
                    Avanzar seguimiento
                  </button>
                ) : null}
                {canPaymentsView ? (
                  <Link href="/admin/pagos" className={secondaryButtonClass}>
                    Gestionar pago
                  </Link>
                ) : null}
              </div>
              {tab === "Resumen" ? (
                <section className="rounded-xl border border-slate-200/90 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-slate-900">Incidencias</p>
                      <p className="mt-1 text-[10.5px] text-slate-400">
                        Solo los bloqueadores impiden marcar el pedido como listo.
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-[10.5px] font-semibold text-amber-700">
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
                            className={`rounded-lg border p-2.5 ${open ? "border-amber-100 bg-amber-50" : "border-emerald-100 bg-emerald-50"}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-[10.5px] font-semibold text-slate-700">
                                  {incidentTypeLabel[String(row.type)] ?? String(row.type)}
                                  {row.blocker ? " · Bloqueadora" : ""}
                                </p>
                                <p className="mt-1 text-[10.5px] text-slate-500">{String(row.note)}</p>
                                <p className="mt-1 text-[10px] text-slate-400">
                                  {item ? String(item.productNameSnapshot) : "Pedido completo"} · {open ? "Abierta" : "Resuelta"}
                                </p>
                              </div>
                              {open ? (
                                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                              )}
                            </div>
                            {open && canManage ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                <input
                                  value={resolutionNote}
                                  onChange={(event) => setResolutionNote(event.target.value)}
                                  maxLength={800}
                                  placeholder="Nota de resolución (opcional)"
                                  className="h-8 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-[10.5px] text-slate-700 focus:border-blue-400 focus:outline-none"
                                />
                                <button
                                  disabled={incidentBusyId !== null}
                                  onClick={() => void resolveIncident(String(row.id))}
                                  className="rounded-lg bg-emerald-600 px-3 py-2 text-[10.5px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Resolver
                                </button>
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                    ) : (
                      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-[10.5px] text-slate-400">
                        No hay incidencias registradas.
                      </p>
                    )}
                  </div>
                </section>
              ) : null}
              {canManage ? (
                <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                  <p className="text-xs font-bold text-amber-800">Registrar incidencia</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <AdminSelect
                      ariaLabel="Tipo de incidencia"
                      value={incident.type}
                      onValueChange={(value) => setIncident({ ...incident, type: value })}
                      options={[
                        { value: "PHYSICAL_SHORTAGE", label: "Faltante físico" },
                        { value: "DAMAGED_PRODUCT", label: "Producto dañado" },
                        { value: "STOCK_MISMATCH", label: "Stock inconsistente" },
                        { value: "WRONG_PRODUCT", label: "Producto incorrecto" },
                        { value: "OTHER", label: "Otro" },
                      ]}
                    />
                    <AdminSelect
                      ariaLabel="Producto afectado"
                      value={incident.itemId}
                      onValueChange={(value) => setIncident({ ...incident, itemId: value })}
                      options={[
                        { value: "", label: "Pedido completo" },
                        ...detail.items.map((item) => ({
                          value: String(item.id),
                          label: String(item.productNameSnapshot),
                        })),
                      ]}
                    />
                    <input
                      value={incident.note}
                      onChange={(event) => setIncident({ ...incident, note: event.target.value })}
                      placeholder="Describe la incidencia"
                      maxLength={1000}
                      className={`${inputClass} h-9 sm:col-span-2`}
                    />
                  </div>
                  <label className="mt-2 flex items-center gap-2 text-[10.5px] font-semibold text-amber-800">
                    <input
                      type="checkbox"
                      checked={incident.blocker}
                      onChange={(event) => setIncident({ ...incident, blocker: event.target.checked })}
                      className="h-3.5 w-3.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500/40"
                    />
                    Bloquea el avance hasta resolverla
                  </label>
                  <button
                    disabled={busy || !incident.note.trim()}
                    onClick={() => void createIncident()}
                    className="mt-2 h-9 rounded-lg border border-amber-300 bg-white px-3 text-[10.5px] font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Guardar incidencia
                  </button>
                </div>
              ) : null}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {detail.order.saleId ? (
              <Link href={`/admin/ventas?saleId=${encodeURIComponent(String(detail.order.saleId))}`} className={secondaryButtonClass}>Ver venta</Link>
            ) : null}
            {detail.order.quoteId ? (
              <Link href={`/admin/cotizaciones?quoteId=${encodeURIComponent(String(detail.order.quoteId))}`} className={secondaryButtonClass}>Ver cotización</Link>
            ) : null}
            {canPaymentsView ? (
              <Link href={`/admin/pagos?orderId=${encodeURIComponent(String(detail.order.id))}`} className={secondaryButtonClass}>Gestionar pago</Link>
            ) : null}
            {detail.customer?.id ? (
              <Link href={`/admin/clientes?customerId=${encodeURIComponent(String(detail.customer.id))}`} className={secondaryButtonClass}>Ver cliente</Link>
            ) : null}
          </div>
          {trackingNotice ? (
            <p role="status" className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
              {trackingNotice}
            </p>
          ) : null}
          {notice ? (
            <p role="alert" className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
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
