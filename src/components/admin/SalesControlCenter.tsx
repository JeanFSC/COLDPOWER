"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  CreditCard,
  Download,
  FileText,
  Filter,
  LoaderCircle,
  Plus,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import type { SalesListItem, SalesPageResponse } from "@/lib/sales-contract";

type CustomerOption = { id: string; name: string; phone: string | null };
type LocationOption = { id: string; code: string; name: string };
type ProductOption = {
  productId: string;
  sku: string;
  productName: string;
  brandName: string | null;
};
type DirectLine = ProductOption & { quantity: number };

function money(currency: string, value: string | number | null | undefined) {
  return value == null
    ? "N/D"
    : new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
      }).format(Number(value));
}
function moneyByCurrencyText(
  rows: SalesPageResponse["metrics"]["moneyByCurrency"],
  field: "expectedAmount" | "receivedAmount" | "averageTicket",
) {
  if (!rows.length) return "N/D";
  return rows
    .map((row) => (row[field] == null ? "N/D" : money(row.currency, row[field])))
    .join(" · ");
}
function labelState(value: string) {
  return (
    (
      {
        PENDING: "Pendiente",
        PARTIAL: "Parcial",
        PAID: "Cobrada",
        OVERPAID: "Sobrepago",
        OBSERVED: "Observado",
        NO_ORDER: "Sin pedido",
        CONFIRMED: "Confirmada",
        APPROVED: "Aprobado",
        UNDER_REVIEW: "En revisión",
        REJECTED: "Rechazado",
        ERROR: "Error",
        ISSUED: "Emitida",
        VOID: "Anulada",
        REFUNDED: "Reembolsado",
        PICKUP: "Recojo en tienda",
        DELIVERY: "Despacho",
        SHIPPING: "Envío",
        NEW: "Nuevo",
        RECEIVED: "Recibido",
        PAYMENT_PENDING: "Pago pendiente",
        PREPARING: "En preparación",
        READY: "Listo",
        READY_FOR_PICKUP: "Listo para recojo",
        IN_TRANSIT: "En tránsito",
        SHIPPED: "Despachado",
        DELIVERED: "Entregado",
        DRAFT: "Borrador",
        CANCELLED: "Cancelada",
        TRANSFER: "Transferencia",
        TRANSFERENCIA: "Transferencia",
        CARD: "Tarjeta",
        CREDIT_CARD: "Tarjeta de crédito",
        DEBIT_CARD: "Tarjeta de débito",
        YAPE: "Yape",
        PLIN: "Plin",
        CASH: "Efectivo",
        DEPOSIT: "Depósito",
      } as Record<string, string>
    )[value] ?? value
  );
}
function tone(value: string) {
  return /PAID|CONFIRMED|ISSUED/.test(value)
    ? "bg-[#e4f7ef] text-[#159263]"
    : /PARTIAL|PENDING|DRAFT/.test(value)
      ? "bg-[#fff0e0] text-[#f58b20]"
      : /OVERPAID|OBSERVED|CANCELLED|ERROR/.test(value)
        ? "bg-[#ffe8e8] text-[#d94848]"
        : "bg-[#e8f1ff] text-[#2277ee]";
}
function labelOrderState(value: string) {
  return value === "PAID" ? "Pagado" : labelState(value);
}
async function json(response: Response) {
  return response.json().catch(() => null) as Promise<Record<string, unknown> | null>;
}
function message(data: Record<string, unknown> | null, fallback: string) {
  const err = data?.error;
  return err &&
    typeof err === "object" &&
    typeof (err as { message?: unknown }).message === "string"
    ? (err as { message: string }).message
    : fallback;
}

export function SalesControlCenter({
  page,
  queryString,
  canManage,
  canPaymentsView,
  customers,
  locations,
}: {
  page: SalesPageResponse;
  queryString: string;
  canManage: boolean;
  canPaymentsView: boolean;
  customers: CustomerOption[];
  locations: LocationOption[];
}) {
  const [mode, setMode] = useState<"chooser" | "direct" | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const { pending, invoices, alerts } = page.queues;
  const metrics = [
    { label: "Ventas confirmadas", value: page.metrics.confirmed, note: "Compromisos comerciales" },
    {
      label: "Monto vendido",
      value: moneyByCurrencyText(page.metrics.moneyByCurrency, "expectedAmount"),
      note: page.metrics.moneyByCurrency.length > 1 ? "Por moneda" : "Sin consolidar",
    },
    {
      label: "Cobrado",
      value: moneyByCurrencyText(page.metrics.moneyByCurrency, "receivedAmount"),
      note: "Neto de pagos confirmados",
    },
    {
      label: "Ticket promedio",
      value: moneyByCurrencyText(page.metrics.moneyByCurrency, "averageTicket"),
      note: "Por moneda",
    },
    { label: "Alertas", value: page.metrics.alertCount, note: "Requieren revisión" },
  ];
  return (
    <div className="space-y-4 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[25px] font-black tracking-[-0.035em] text-[#102a43] sm:text-[28px]">
            Gestión de ventas
          </h1>
          <p className="mt-1.5 text-[11px] font-semibold text-[#7d91a5]">
            Administra y da seguimiento a todas tus ventas y operaciones.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#dce6ee] bg-white px-3 text-[10px] font-extrabold text-[#304b66]">
            <CalendarDays className="h-4 w-4" />
            Últimos 30 días
          </span>
          <Link
            href={`/api/admin/ventas/export?${queryString}`}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#dce6ee] bg-white px-3 text-[10px] font-extrabold text-[#304b66]"
          >
            <Download className="h-4 w-4" />
            Exportar
          </Link>
          {canManage ? (
            <button
              onClick={() => setMode("chooser")}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#2277ee] px-3.5 text-[10px] font-extrabold text-white shadow-[0_5px_12px_rgba(34,119,238,0.18)]"
            >
              <Plus className="h-4 w-4" />
              Registrar venta
            </button>
          ) : null}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric, index) => (
          <article
            key={metric.label}
            className="min-h-[124px] rounded-xl border border-[#e2eaf1] bg-white p-3.5 shadow-[0_1px_3px_rgba(16,42,67,0.035)]"
          >
            <div className="flex items-start gap-2.5">
              <span
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${index === 4 ? "bg-[#ffe8e8] text-[#ed4b4b]" : index === 2 ? "bg-[#e4f7ef] text-[#159263]" : "bg-[#e8f1ff] text-[#2277ee]"}`}
              >
                {index === 4 ? (
                  <CircleAlert className="h-4 w-4" />
                ) : index === 2 ? (
                  <CreditCard className="h-4 w-4" />
                ) : (
                  <BarChart3 className="h-4 w-4" />
                )}
              </span>
              <div>
                <p className="text-[10px] font-semibold text-[#7d91a5]">{metric.label}</p>
                <p className="mt-1 font-display text-[19px] font-black text-[#102a43]">
                  {metric.value}
                </p>
                <p className="mt-1 text-[9px] font-extrabold text-[#159263]">{metric.note}</p>
              </div>
            </div>
            <div className="mt-5 border-t border-[#edf2f6]" />
          </article>
        ))}
      </div>
      <section className="grid gap-3 rounded-xl border border-[#e2eaf1] bg-white p-4 shadow-[0_1px_3px_rgba(16,42,67,0.035)] md:grid-cols-4">
        <MoneyStrip
          title="Ventas cobradas vs pendientes"
          rows={page.metrics.moneyByCurrency.map((row) => ({
            label: row.currency,
            value: `${money(row.currency, row.receivedAmount)} / ${money(row.currency, row.pendingAmount)}`,
          }))}
        />
        <MoneyStrip
          title="Ticket promedio"
          rows={page.metrics.moneyByCurrency.map((row) => ({
            label: row.currency,
            value: row.averageTicket ? money(row.currency, row.averageTicket) : "N/D",
          }))}
        />
        <MoneyStrip
          title="Ventas por método de pago"
          rows={page.metrics.paymentBreakdown.map((row) => ({
            label: labelState(row.method),
            value: String(row.count),
          }))}
        />
        <MoneyStrip
          title="Ventas por canal"
          rows={page.metrics.channelBreakdown.map((row) => ({
            label: row.channel,
            value: String(row.count),
          }))}
        />
      </section>
      <form
        action="/admin/ventas"
        className="flex flex-wrap gap-2 rounded-xl border border-[#e2eaf1] bg-white p-2.5 shadow-[0_1px_3px_rgba(16,42,67,0.035)]"
      >
        <label className="flex h-10 min-w-[230px] flex-1 items-center gap-2 rounded-lg border border-[#dce6ee] px-3">
          <Search className="h-4 w-4 text-[#6d84a0]" />
          <input
            name="query"
            defaultValue={new URLSearchParams(queryString).get("query") ?? ""}
            placeholder="Buscar por venta, cliente, documento, vendedor..."
            className="w-full bg-transparent text-[11px] font-semibold outline-none placeholder:text-[#9aabba]"
          />
        </label>
        <FilterSelect
          name="status"
          values={page.facets.statuses}
          query={queryString}
          label="Estado"
        />
        <FilterSelect
          name="currency"
          values={page.facets.currencies}
          query={queryString}
          label="Moneda"
        />
        <FilterSelect
          name="channel"
          values={page.facets.channels}
          query={queryString}
          label="Canal"
        />
        <details className="relative">
          <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-[#dce6ee] px-3 text-[10px] font-extrabold text-[#304b66]">
            <Filter className="h-3.5 w-3.5" />
            Más filtros
          </summary>
          <div className="absolute right-0 z-30 mt-2 grid w-[min(92vw,620px)] gap-3 rounded-xl border border-[#dce6ee] bg-white p-4 shadow-2xl sm:grid-cols-2">
            <FilterSelect
              name="paymentReconciliation"
              values={["PENDING", "PARTIAL", "PAID", "OVERPAID", "OBSERVED", "NO_ORDER"]}
              query={queryString}
              label="Conciliación de cobro"
            />
            <FilterSelect
              name="paymentStatus"
              values={["PENDING", "UNDER_REVIEW", "CONFIRMED", "APPROVED", "REJECTED", "CANCELLED", "REFUNDED", "ERROR"]}
              query={queryString}
              label="Estado del pago"
            />
            <FilterSelect
              name="invoiceStatus"
              values={["PENDING", "ISSUED", "VOID", "ERROR"]}
              query={queryString}
              label="Facturación"
            />
            <FilterText name="seller" label="Vendedor" query={queryString} placeholder="Nombre del vendedor" />
            <FilterText name="customer" label="Cliente" query={queryString} placeholder="Nombre del cliente" />
            <FilterDate name="dateFrom" label="Desde" query={queryString} />
            <FilterDate name="dateTo" label="Hasta" query={queryString} />
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
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-[#fbfcfd] text-[8px] font-extrabold uppercase tracking-wide text-[#7890a7]">
              <tr>
                {[
                  "Venta",
                  "Cliente",
                  "Monto",
                  "Documentos",
                  "Cobro",
                  "Estado",
                  "Canal",
                  "Vendedor",
                  "Fecha",
                  "",
                ].map((value) => (
                  <th key={value} className="px-3 py-3">
                    {value}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {page.items.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-[#edf2f6] text-[10px] font-semibold text-[#526b84] hover:bg-[#fbfdff]"
                >
                  <td className="px-3 py-3">
                    <button
                      onClick={() => setDetailId(row.id)}
                      className="text-left font-extrabold text-[#2277ee]"
                    >
                      {row.code}
                      <span className="mt-0.5 block text-[9px] text-[#8296a9]">
                        {row.quoteTrackingCode ?? "Venta directa"}
                      </span>
                    </button>
                  </td>
                  <td className="px-3 py-3">{row.customerName}</td>
                  <td className="px-3 py-3 font-extrabold text-[#173654]">
                    {money(row.currency, row.total)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {row.quoteTrackingCode ? (
                        <span className="rounded bg-[#e8f1ff] px-1.5 py-1 text-[8px] text-[#2277ee]">
                          {row.quoteTrackingCode}
                        </span>
                      ) : null}
                      {row.orderCode ? (
                        <span className="rounded bg-[#f3f5f7] px-1.5 py-1 text-[8px] text-[#526b84]">
                          {row.orderCode}
                        </span>
                      ) : null}
                      {row.externalInvoiceReference ? (
                        <span className="rounded bg-[#e4f7ef] px-1.5 py-1 text-[8px] text-[#159263]">
                          {row.externalInvoiceReference}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-md px-2 py-1 text-[8px] font-extrabold ${tone(row.payment.state)}`}
                    >
                      {labelState(row.payment.state)}
                    </span>
                    <span className="mt-1 block text-[8px] text-[#8296a9]">
                      {money(row.currency, row.payment.receivedAmount)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-md px-2 py-1 text-[8px] font-extrabold ${tone(row.status)}`}
                    >
                      {labelState(row.status)}
                    </span>
                  </td>
                  <td className="px-3 py-3">{row.channel ?? "N/D"}</td>
                  <td className="px-3 py-3">{row.sellerName ?? "Sin asignar"}</td>
                  <td className="px-3 py-3">
                    {new Date(row.createdAt).toLocaleDateString("es-PE")}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => setDetailId(row.id)}
                      className="rounded p-1 text-[#526b84] hover:bg-[#edf4fa]"
                      aria-label={`Ver ${row.code}`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-2 p-3 md:hidden">
          {page.items.map((row) => (
            <button
              key={row.id}
              onClick={() => setDetailId(row.id)}
              className="rounded-lg border border-[#edf2f6] p-3 text-left"
            >
              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold text-[#2277ee]">{row.code}</p>
                  <p className="mt-1 text-[10px] text-[#526b84]">{row.customerName}</p>
                </div>
                <strong className="text-xs text-[#173654]">{money(row.currency, row.total)}</strong>
              </div>
              <div className="mt-3 flex justify-between">
                <span className={`rounded px-1.5 py-1 text-[8px] ${tone(row.payment.state)}`}>
                  {labelState(row.payment.state)}
                </span>
                <span className="text-[9px] text-[#8296a9]">{row.channel ?? "N/D"}</span>
              </div>
            </button>
          ))}
        </div>
        {page.items.length === 0 ? (
          <div className="border-t border-[#edf2f6] p-10 text-center">
            <p className="text-sm font-extrabold text-[#304b66]">
              {page.totalItems ? "No hay ventas en esta página." : "No hay ventas con estos filtros."}
            </p>
          </div>
        ) : null}
        <Pager page={page.page} total={page.totalPages} query={queryString} />
      </section>
      <section>
        <h2 className="text-[15px] font-extrabold text-[#102a43]">Centro de operaciones</h2>
        <p className="mt-1 text-[10px] font-semibold text-[#8296a9]">
          Acciones y tareas clave para completar el ciclo de ventas.
        </p>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {canPaymentsView ? (
            <Queue
              title="Cobros pendientes"
              rows={pending}
              href="/admin/pagos"
              action="Gestionar pagos"
            />
          ) : null}
          <Queue
            title="Facturación"
            rows={invoices}
            href="/admin/ventas?invoiceStatus=PENDING"
            action="Ver por facturar"
          />
          <Queue title="Validación" rows={alerts} href="/admin/ventas" action="Ver alertas" />
        </div>
      </section>
      <AdminDrawer
        open={mode !== null}
        onClose={() => setMode(null)}
        title={mode === "direct" ? "Venta directa" : "Registrar venta"}
        size="wide"
      >
        {mode === "chooser" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => setMode("direct")}
              className="rounded-xl border border-[#d9e7f5] p-5 text-left hover:bg-[#f7fbff]"
            >
              <ShoppingCart className="h-6 w-6 text-[#2277ee]" />
              <h3 className="mt-3 text-sm font-extrabold text-[#173654]">Venta directa</h3>
              <p className="mt-1 text-[11px] leading-5 text-[#71869c]">
                Crea venta, pedido, reserva e intención de cobro con precios calculados en servidor.
              </p>
            </button>
            <Link
              href="/admin/cotizaciones"
              onClick={() => setMode(null)}
              className="rounded-xl border border-[#d9e7f5] p-5 text-left hover:bg-[#f7fbff]"
            >
              <FileText className="h-6 w-6 text-[#8057e8]" />
              <h3 className="mt-3 text-sm font-extrabold text-[#173654]">
                Desde cotización aceptada
              </h3>
              <p className="mt-1 text-[11px] leading-5 text-[#71869c]">
                Usa el flujo controlado de la cotización aceptada.
              </p>
            </Link>
          </div>
        ) : (
          <DirectSaleForm
            customers={customers}
            locations={locations}
            onDone={() => setMode(null)}
          />
        )}
      </AdminDrawer>
      <SaleDetailDrawer
        key={detailId ?? "closed"}
        saleId={detailId}
        canManage={canManage}
        canPaymentsView={canPaymentsView}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}

function MoneyStrip({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="border-b border-[#edf2f6] pb-3 last:border-b-0 md:border-b-0 md:border-r md:pr-3">
      <h3 className="text-[11px] font-extrabold text-[#173654]">{title}</h3>
      <div className="mt-3 grid gap-2">
        {rows.length ? (
          rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-3 text-[10px]">
              <span className="text-[#71869c]">{row.label}</span>
              <strong className="text-[#304b66]">{row.value}</strong>
            </div>
          ))
        ) : (
          <p className="text-[10px] text-[#8296a9]">Sin datos en este alcance.</p>
        )}
      </div>
    </div>
  );
}
function FilterSelect({
  name,
  values,
  query,
  label,
}: {
  name: string;
  values: string[];
  query: string;
  label: string;
}) {
  return (
    <select
      name={name}
      defaultValue={new URLSearchParams(query).get(name) ?? ""}
      className="h-10 rounded-lg border border-[#dce6ee] bg-white px-3 text-[10px] font-extrabold text-[#304b66]"
    >
      <option value="">{label}</option>
      {values.map((value) => (
        <option key={value} value={value}>
          {labelState(value)}
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
  const link = (target: number) => {
    const params = new URLSearchParams(query);
    params.set("page", String(target));
    return `/admin/ventas?${params}`;
  };
  return (
    <div className="flex items-center justify-between border-t border-[#edf2f6] px-4 py-3 text-[10px]">
      <span className="text-[#8296a9]">
        Página {page} de {total}
      </span>
      <div className="flex gap-1">
        <Link href={link(Math.max(1, page - 1))} className="rounded px-2 py-1 hover:bg-[#edf4fa]">
          Anterior
        </Link>
        <Link
          href={link(Math.min(total, page + 1))}
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
  href,
  action,
}: {
  title: string;
  rows: SalesListItem[];
  href: string;
  action: string;
}) {
  return (
    <section className="rounded-xl border border-[#e2eaf1] bg-white p-3.5 shadow-[0_1px_3px_rgba(16,42,67,0.035)]">
      <div className="flex items-center justify-between">
        <h3 className="text-[12px] font-extrabold text-[#173654]">{title}</h3>
        <ClipboardList className="h-4 w-4 text-[#2277ee]" />
      </div>
      <div className="mt-3 grid gap-2">
        {rows.length ? (
          rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-[#edf2f6] p-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-[10px] font-extrabold text-[#2277ee]">{row.code}</p>
                <p className="mt-1 truncate text-[9px] text-[#71869c]">{row.customerName}</p>
              </div>
              <span
                className={`shrink-0 rounded px-1.5 py-1 text-[8px] font-extrabold ${tone(row.payment.state)}`}
              >
                {labelState(row.payment.state)}
              </span>
            </div>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-[#dce6ee] p-3 text-[10px] text-[#8296a9]">
            Sin elementos pendientes.
          </p>
        )}
      </div>
      <Link href={href} className="mt-4 inline-flex text-[10px] font-extrabold text-[#2277ee]">
        {action} →
      </Link>
    </section>
  );
}
function DirectSaleForm({
  customers,
  locations,
  onDone,
}: {
  customers: CustomerOption[];
  locations: LocationOption[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"PICKUP" | "DELIVERY" | "SHIPPING">(
    "PICKUP",
  );
  const [address, setAddress] = useState("");
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<ProductOption[]>([]);
  const [lines, setLines] = useState<DirectLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  async function search() {
    if (term.trim().length < 2) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/precios/productos?q=${encodeURIComponent(term)}`, {
        cache: "no-store",
      });
      const data = await json(response);
      if (!response.ok) throw new Error(message(data, "No se pudo buscar productos."));
      setResults(Array.isArray(data?.items) ? (data.items as ProductOption[]) : []);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo buscar productos.");
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/ventas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "DIRECT",
          customerId,
          locationId,
          deliveryMethod,
          address,
          channel: "DIRECT",
          items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
          idempotencyKey: `direct-${crypto.randomUUID()}`,
        }),
      });
      const data = await json(response);
      if (!response.ok) throw new Error(message(data, "No se pudo registrar la venta."));
      onDone();
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo registrar la venta.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <p className="text-[11px] font-semibold text-[#71869c]">
        El servidor confirma precio vigente, moneda única, promociones y disponibilidad antes de
        crear la operación.
      </p>
      {notice ? (
        <p
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] font-semibold text-amber-900"
        >
          {notice}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84]">
          Cliente
          <select
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            className="h-10 rounded-lg border border-[#dce6ee] px-3 text-xs"
          >
            <option value="">Selecciona cliente</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84]">
          Local
          <select
            value={locationId}
            onChange={(event) => setLocationId(event.target.value)}
            className="h-10 rounded-lg border border-[#dce6ee] px-3 text-xs"
          >
            <option value="">Selecciona local</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.code} · {location.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="rounded-xl border border-[#e2eaf1] p-3">
        <p className="text-[11px] font-extrabold text-[#173654]">Productos</p>
        <div className="mt-2 flex gap-2">
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void search();
              }
            }}
            placeholder="SKU o nombre de producto"
            className="h-9 min-w-0 flex-1 rounded-lg border border-[#dce6ee] px-3 text-xs"
          />
          <button
            disabled={busy}
            onClick={() => void search()}
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#2277ee] px-3 text-[10px] font-extrabold text-[#2277ee]"
          >
            <Search className="h-3.5 w-3.5" />
            Buscar
          </button>
        </div>
        {results.length ? (
          <div className="mt-2 grid gap-1">
            {results.map((product) => (
              <button
                key={product.productId}
                onClick={() => {
                  if (!lines.some((line) => line.productId === product.productId))
                    setLines([...lines, { ...product, quantity: 1 }]);
                  setResults([]);
                  setTerm("");
                }}
                className="rounded-lg p-2 text-left hover:bg-[#f4f8fc]"
              >
                <span className="text-[10px] font-extrabold text-[#304b66]">{product.sku}</span>
                <span className="ml-2 text-[10px] text-[#71869c]">{product.productName}</span>
              </button>
            ))}
          </div>
        ) : null}
        <div className="mt-3 grid gap-2">
          {lines.map((line) => (
            <div
              key={line.productId}
              className="flex items-center gap-2 rounded-lg bg-[#f7fbff] p-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-extrabold text-[#304b66]">
                  {line.sku} · {line.productName}
                </p>
                <p className="mt-0.5 text-[9px] text-[#8296a9]">Precio se calculará en servidor</p>
              </div>
              <input
                aria-label={`Cantidad de ${line.productName}`}
                type="number"
                min="1"
                max="999"
                value={line.quantity}
                onChange={(event) =>
                  setLines(
                    lines.map((item) =>
                      item.productId === line.productId
                        ? { ...item, quantity: Math.max(1, Number(event.target.value) || 1) }
                        : item,
                    ),
                  )
                }
                className="h-8 w-16 rounded border border-[#dce6ee] px-2 text-xs"
              />
              <button
                onClick={() => setLines(lines.filter((item) => item.productId !== line.productId))}
                className="p-1 text-[#d94848]"
                aria-label={`Quitar ${line.productName}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84]">
          Entrega
          <select
            value={deliveryMethod}
            onChange={(event) => setDeliveryMethod(event.target.value as typeof deliveryMethod)}
            className="h-10 rounded-lg border border-[#dce6ee] px-3 text-xs"
          >
            <option value="PICKUP">Recojo</option>
            <option value="DELIVERY">Delivery</option>
            <option value="SHIPPING">Envío</option>
          </select>
        </label>
        {deliveryMethod !== "PICKUP" ? (
          <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84]">
            Dirección
            <input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              className="h-10 rounded-lg border border-[#dce6ee] px-3 text-xs"
            />
          </label>
        ) : null}
      </div>
      <button
        disabled={
          busy ||
          !customerId ||
          !locationId ||
          !lines.length ||
          (deliveryMethod !== "PICKUP" && !address.trim())
        }
        onClick={() => void submit()}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#2277ee] px-4 text-[10px] font-extrabold text-white disabled:opacity-50"
      >
        {busy ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        Confirmar venta directa
      </button>
    </div>
  );
}
function SaleDetailDrawer({
  saleId,
  canManage,
  canPaymentsView,
  onClose,
}: {
  saleId: string | null;
  canManage: boolean;
  canPaymentsView: boolean;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [tab, setTab] = useState<
    "Resumen" | "Productos" | "Cobros" | "Pedido" | "Facturación" | "Historial"
  >("Resumen");
  const [invoiceDraft, setInvoiceDraft] = useState({
    invoiceStatus: "PENDING",
    externalInvoiceReference: "",
    invoiceIssuedAt: "",
    invoiceNote: "",
  });
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const loadDetail = useCallback(async () => {
    if (!saleId) return;
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/admin/ventas/${encodeURIComponent(saleId)}`, {
        cache: "no-store",
      });
      const data = await json(response);
      if (!response.ok || !data?.sale) {
        throw new Error(message(data, "No se pudo cargar el detalle de la venta."));
      }
      const saleData = data.sale as Record<string, unknown>;
      setInvoiceDraft({
        invoiceStatus: String(saleData.invoiceStatus ?? "PENDING"),
        externalInvoiceReference: String(saleData.externalInvoiceReference ?? ""),
        invoiceIssuedAt: saleData.invoiceIssuedAt
          ? new Date(String(saleData.invoiceIssuedAt)).toISOString().slice(0, 16)
          : "",
        invoiceNote: String(saleData.invoiceNote ?? ""),
      });
      setDetail(data);
      setError("");
    } catch (loadError) {
      setDetail(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar el detalle de la venta.",
      );
    } finally {
      setDetailLoading(false);
    }
  }, [saleId]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDetail();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDetail]);
  const sale = detail?.sale as Record<string, string | null | undefined> | undefined;
  const customer = detail?.customer as Record<string, string | null | undefined> | undefined;
  const quote = detail?.quote as Record<string, string | null | undefined> | undefined;
  const opportunity = detail?.opportunity as Record<string, string | null | undefined> | undefined;
  const items = Array.isArray(detail?.items)
    ? (detail.items as Array<Record<string, unknown>>)
    : [];
  const orders = Array.isArray(detail?.orders)
    ? (detail.orders as Array<Record<string, unknown>>)
    : [];
  const payments = orders.flatMap((order): Array<Record<string, unknown>> => {
    if (!Array.isArray(order.payments)) return [];
    return (order.payments as Array<Record<string, unknown>>).map((payment) => ({
      ...payment,
      orderCode: order.code,
    }));
  });
  const audit = Array.isArray(detail?.audit)
    ? (detail.audit as Array<Record<string, unknown>>)
    : [];
  const tabs: Array<typeof tab> = [
    "Resumen",
    "Productos",
    "Pedido",
    "Facturación",
    "Historial",
  ];
  if (canPaymentsView) tabs.splice(2, 0, "Cobros");
  const value = (raw: unknown, fallback = "—") =>
    raw == null || raw === "" ? fallback : String(raw);
  const saleCurrency = String(sale?.currency ?? "PEN");
  const paymentCurrency = (payment: Record<string, unknown>) =>
    String(payment.currency ?? saleCurrency);
  const saleCurrencyPayments = payments.filter(
    (payment) => paymentCurrency(payment) === saleCurrency,
  );
  const otherPaymentCurrencies = [
    ...new Set(payments.map(paymentCurrency).filter((currency) => currency !== saleCurrency)),
  ];
  const total = sale ? Number(sale.total ?? 0) : 0;
  const grossReceived = saleCurrencyPayments.reduce(
    (sum, payment) =>
      ["CONFIRMED", "APPROVED", "REFUNDED"].includes(String(payment.status))
        ? sum + Number(payment.amount ?? 0)
        : sum,
    0,
  );
  const refunded = saleCurrencyPayments.reduce(
    (sum, payment) =>
      ["CONFIRMED", "APPROVED", "REFUNDED"].includes(String(payment.status))
        ? sum + Number(payment.refundedAmount ?? 0)
        : sum,
    0,
  );
  const received = saleCurrencyPayments.reduce(
    (sum, payment) =>
      ["CONFIRMED", "APPROVED", "REFUNDED"].includes(String(payment.status))
        ? sum + Number(payment.amount ?? 0) - Number(payment.refundedAmount ?? 0)
        : sum,
    0,
  );
  const balance = Math.max(0, total - received);
  const difference = received - total;
  async function saveInvoice() {
    if (!saleId) return;
    setInvoiceBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/ventas/${encodeURIComponent(saleId)}/facturacion`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(invoiceDraft),
        },
      );
      const data = await json(response);
      if (!response.ok || !data)
        throw new Error(message(data, "No se pudo actualizar la facturación."));
      const updatedSale = data.sale as Record<string, unknown> | undefined;
      if (updatedSale) {
        setDetail((current) => (current ? { ...current, sale: updatedSale } : current));
        setInvoiceDraft((current) => ({
          ...current,
          invoiceStatus: String(updatedSale.invoiceStatus ?? current.invoiceStatus),
          externalInvoiceReference: String(updatedSale.externalInvoiceReference ?? ""),
          invoiceIssuedAt: updatedSale.invoiceIssuedAt
            ? new Date(String(updatedSale.invoiceIssuedAt)).toISOString().slice(0, 16)
            : current.invoiceIssuedAt,
          invoiceNote: String(updatedSale.invoiceNote ?? ""),
        }));
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo actualizar la facturación.");
    } finally {
      setInvoiceBusy(false);
    }
  }
  return (
    <AdminDrawer
      open={Boolean(saleId)}
      onClose={() => {
        setDetail(null);
        onClose();
      }}
      title="Detalle de venta"
      size="wide"
    >
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p role="alert">{error}</p>
          <button
            type="button"
            onClick={() => void loadDetail()}
            disabled={detailLoading}
            className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 text-[10px] font-extrabold text-red-800 disabled:opacity-50"
          >
            {detailLoading ? "Reintentando…" : "Reintentar"}
          </button>
        </div>
      ) : !sale ? (
        <div className="flex items-center gap-2 text-sm text-[#71869c]">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Cargando trazabilidad…
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              ["Código", sale.code],
              ["Estado", labelState(String(sale.status))],
              ["Total", money(String(sale.currency), String(sale.total))],
              ["Facturación", sale.invoiceStatus ?? "Pendiente"],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg border border-[#edf2f6] p-3">
                <p className="text-[9px] font-extrabold uppercase text-[#71869c]">{label}</p>
                <p className="mt-1 text-xs font-extrabold text-[#173654]">{String(value)}</p>
              </div>
            ))}
          </div>
          <nav
            className="flex gap-1 overflow-x-auto border-b border-[#edf2f6]"
            aria-label="Secciones del detalle de venta"
            role="tablist"
          >
            {tabs.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                aria-selected={tab === item}
                role="tab"
                className={`whitespace-nowrap border-b-2 px-3 py-2 text-[10px] font-extrabold ${tab === item ? "border-[#2277ee] text-[#2277ee]" : "border-transparent text-[#71869c]"}`}
              >
                {item}
              </button>
            ))}
          </nav>
          {tab === "Resumen" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Cliente", value(customer?.name)],
                ["Vendedor", value(detail?.sellerName, "Sin asignar")],
                ["Cotización", value(quote?.trackingCode, "Venta directa")],
                ["Oportunidad", value(opportunity?.code)],
                ["Fecha", sale.createdAt ? new Date(sale.createdAt).toLocaleString("es-PE") : "—"],
                ["Subtotal", money(String(sale.currency), sale.subtotal)],
                ["Descuento", money(String(sale.currency), sale.discountAmount)],
                ...(canPaymentsView
                  ? [["Saldo", money(String(sale.currency), balance)] as [string, string]]
                  : []),
              ].map(([label, itemValue]) => (
                <div key={String(label)} className="rounded-lg border border-[#edf2f6] p-3">
                  <p className="text-[9px] font-extrabold uppercase text-[#71869c]">{label}</p>
                  <p className="mt-1 text-xs font-extrabold text-[#173654]">{String(itemValue)}</p>
                </div>
              ))}
            </div>
          ) : null}
          {tab === "Productos" ? (
            <DetailSection title="Productos (snapshot de venta)">
              {items.length ? (
                items.map((item) => (
                  <div
                    key={String(item.id)}
                    className="flex justify-between gap-3 border-b border-[#edf2f6] p-3 text-[10px] last:border-b-0"
                  >
                    <div>
                      <p className="font-extrabold text-[#304b66]">
                        {value(item.skuSnapshot)} · {value(item.productNameSnapshot)}
                      </p>
                      <p className="mt-1 text-[#8296a9]">
                        Cantidad: {value(item.quantity)} · Precio:{" "}
                        {money(
                          String(item.currency),
                          typeof item.unitPrice === "string" || typeof item.unitPrice === "number"
                            ? item.unitPrice
                            : null,
                        )}{" "}
                        · Descuento: {value(item.discountAmount)}
                      </p>
                    </div>
                    <strong className="text-[#173654]">
                      {money(
                        String(item.currency),
                        typeof item.lineTotal === "string" || typeof item.lineTotal === "number"
                          ? item.lineTotal
                          : null,
                      )}
                    </strong>
                  </div>
                ))
              ) : (
                <EmptyDetail text="No hay productos en esta venta." />
              )}
            </DetailSection>
          ) : null}
          {tab === "Cobros" && canPaymentsView ? (
            <DetailSection title="Cobros y saldo">
              <div className="grid gap-2 p-3 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  ["Esperado", money(String(sale.currency), sale.total)],
                  ["Recibido", money(String(sale.currency), grossReceived)],
                  ["Reembolsado", money(String(sale.currency), refunded)],
                  ["Neto", money(String(sale.currency), received)],
                  ["Saldo", money(String(sale.currency), balance)],
                  ["Diferencia", money(String(sale.currency), difference)],
                ].map(([label, itemValue]) => (
                  <div key={String(label)} className="rounded-lg bg-[#f7fafc] p-3">
                    <p className="text-[9px] font-extrabold uppercase text-[#71869c]">{label}</p>
                    <p className="mt-1 text-sm font-black text-[#173654]">{itemValue}</p>
                  </div>
                ))}
              </div>
              {otherPaymentCurrencies.length ? (
                <p className="border-t border-[#edf2f6] px-3 py-2 text-[10px] font-semibold text-[#8a4b20]">
                  Pagos en {otherPaymentCurrencies.join(", ")} no se mezclan con el total en {saleCurrency}.
                </p>
              ) : null}
              {payments.length ? (
                payments.map((payment, index) => (
                  <div
                    key={String(payment.id ?? index)}
                    className="flex flex-wrap items-center justify-between gap-2 border-t border-[#edf2f6] p-3 text-[10px]"
                  >
                    <span className="font-extrabold text-[#304b66]">
                      {value(payment.method)} · {value(payment.orderCode)}
                    </span>
                    <span
                      className={`rounded-md px-2 py-1 text-[8px] font-extrabold ${tone(value(payment.status))}`}
                    >
                      {labelState(value(payment.status))}
                    </span>
                    <strong className="text-[#173654]">
                      {money(
                        typeof payment.currency === "string"
                          ? payment.currency
                          : String(sale.currency),
                        typeof payment.amount === "string" || typeof payment.amount === "number"
                          ? payment.amount
                          : null,
                      )}
                    </strong>
                  </div>
                ))
              ) : (
                <EmptyDetail text="No hay cobros registrados." />
              )}
            </DetailSection>
          ) : null}
          {tab === "Pedido" ? (
            <DetailSection title="Pedido relacionado">
              {orders.length ? (
                orders.map((order, index) => (
                  <div
                    key={String(order.id ?? index)}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf2f6] p-3 text-[10px] last:border-b-0"
                  >
                    <div>
                      <p className="font-extrabold text-[#304b66]">{value(order.code)}</p>
                      <p className="mt-1 text-[#8296a9]">
                        Estado: {labelOrderState(value(order.status))} · Entrega:{" "}
                        {labelState(value(order.deliveryMethod))}
                      </p>
                    </div>
                    <Link
                      href={`/admin/pedidos?query=${encodeURIComponent(value(order.code, ""))}`}
                      className="font-extrabold text-[#2277ee]"
                    >
                      Ver pedido
                    </Link>
                  </div>
                ))
              ) : (
                <EmptyDetail text="Esta venta todavía no tiene pedido relacionado." />
              )}
            </DetailSection>
          ) : null}
          {tab === "Facturación" ? (
            <DetailSection title="Facturación externa">
              <div className="grid gap-3 p-3 sm:grid-cols-2">
                <div>
                  <p className="text-[9px] font-extrabold uppercase text-[#71869c]">Estado</p>
                  <p className="mt-1 text-xs font-extrabold text-[#173654]">
                    {labelState(value(sale.invoiceStatus, "Pendiente"))}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-extrabold uppercase text-[#71869c]">
                    Referencia ACSOFT
                  </p>
                  <p className="mt-1 text-xs font-extrabold text-[#173654]">
                    {value(sale.externalInvoiceReference, "Sin referencia registrada")}
                  </p>
                </div>
              </div>
              {canManage ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveInvoice();
                  }}
                  className="grid gap-3 border-t border-[#edf2f6] p-3 sm:grid-cols-2"
                >
                  <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84]">
                    Estado externo
                    <select
                      value={invoiceDraft.invoiceStatus}
                      onChange={(event) =>
                        setInvoiceDraft({ ...invoiceDraft, invoiceStatus: event.target.value })
                      }
                      className="h-10 rounded-lg border border-[#dce6ee] px-3 text-xs"
                    >
                      {[
                        ["PENDING", "Pendiente de emitir en ACSOFT"],
                        ["ISSUED", "Emitida"],
                        ["VOID", "Anulada"],
                        ["ERROR", "Error"],
                      ].map(([status, label]) => (
                        <option key={status} value={status}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84]">
                    Serie/número o referencia
                    <input
                      value={invoiceDraft.externalInvoiceReference}
                      onChange={(event) =>
                        setInvoiceDraft({
                          ...invoiceDraft,
                          externalInvoiceReference: event.target.value,
                        })
                      }
                      maxLength={160}
                      placeholder="Referencia emitida por ACSOFT"
                      className="h-10 rounded-lg border border-[#dce6ee] px-3 text-xs"
                    />
                  </label>
                  <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84]">
                    Fecha de emisión
                    <input
                      type="datetime-local"
                      value={invoiceDraft.invoiceIssuedAt}
                      onChange={(event) =>
                        setInvoiceDraft({ ...invoiceDraft, invoiceIssuedAt: event.target.value })
                      }
                      className="h-10 rounded-lg border border-[#dce6ee] px-3 text-xs"
                    />
                  </label>
                  <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84] sm:col-span-2">
                    Nota
                    <textarea
                      value={invoiceDraft.invoiceNote}
                      onChange={(event) =>
                        setInvoiceDraft({ ...invoiceDraft, invoiceNote: event.target.value })
                      }
                      maxLength={500}
                      placeholder="Observación sobre la facturación externa"
                      className="min-h-20 rounded-lg border border-[#dce6ee] px-3 py-2 text-xs"
                    />
                  </label>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      disabled={
                        invoiceBusy ||
                        (invoiceDraft.invoiceStatus === "ISSUED" &&
                          !invoiceDraft.externalInvoiceReference.trim())
                      }
                      className="rounded-lg bg-[#2277ee] px-3 py-2 text-[10px] font-extrabold text-white disabled:opacity-50"
                    >
                      {invoiceBusy ? "Guardando…" : "Guardar facturación"}
                    </button>
                  </div>
                </form>
              ) : null}
            </DetailSection>
          ) : null}
          {tab === "Historial" ? (
            <DetailSection title="Historial y auditoría">
              {audit.length ? (
                audit.map((entry, index) => (
                  <div
                    key={String(entry.id ?? index)}
                    className="border-b border-[#edf2f6] p-3 text-[10px] last:border-b-0"
                  >
                    <p className="font-extrabold text-[#304b66]">
                      {value(entry.action ?? entry.eventType, "Actualización")}
                    </p>
                    <p className="mt-1 text-[#8296a9]">
                      {value(
                        entry.createdAt
                          ? new Date(String(entry.createdAt)).toLocaleString("es-PE")
                          : null,
                      )}{" "}
                      · {value(entry.actorName ?? entry.actorId, "Sistema")}
                    </p>
                    <p className="mt-1 text-[#526b84]">
                      {value(entry.reason ?? entry.note, "Sin detalle adicional")}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyDetail text="No hay eventos de auditoría para esta venta." />
              )}
            </DetailSection>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {canPaymentsView ? (
              <Link
                href="/admin/pagos"
                className="rounded-lg border border-[#dce6ee] px-3 py-2 text-[10px] font-extrabold text-[#2277ee]"
              >
                Gestionar cobros
              </Link>
            ) : null}
            <Link
              href="/admin/pedidos"
              className="rounded-lg border border-[#dce6ee] px-3 py-2 text-[10px] font-extrabold text-[#2277ee]"
            >
              Ver pedidos
            </Link>
          </div>
        </div>
      )}
    </AdminDrawer>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-[#e2eaf1]">
      <div className="border-b border-[#edf2f6] px-4 py-3">
        <h3 className="text-xs font-extrabold text-[#173654]">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function EmptyDetail({ text }: { text: string }) {
  return <p className="p-4 text-[10px] text-[#8296a9]">{text}</p>;
}
