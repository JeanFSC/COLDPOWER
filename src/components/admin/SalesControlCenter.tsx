"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  CreditCard,
  Download,
  Eye,
  FileText,
  Filter,
  LoaderCircle,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { AdminSelect } from "@/components/admin/AdminSelect";
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

const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const textareaClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const primaryButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-xs shadow-blue-500/25 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";
const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
const barColors = ["bg-blue-600", "bg-blue-500", "bg-blue-400", "bg-sky-400", "bg-sky-300", "bg-slate-400"];

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
  if (/PAID|CONFIRMED|ISSUED/.test(value)) return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (/PARTIAL|PENDING|DRAFT/.test(value)) return "bg-amber-50 text-amber-700 border-amber-100";
  if (/OVERPAID|OBSERVED|CANCELLED|ERROR/.test(value)) return "bg-rose-50 text-rose-700 border-rose-100";
  return "bg-blue-50 text-blue-700 border-blue-100";
}
function labelOrderState(value: string) {
  return value === "PAID" ? "Pagado" : labelState(value);
}
function tabClass(active: boolean) {
  if (active) return "whitespace-nowrap border-b-2 px-3 py-2 text-xs font-semibold border-blue-600 text-blue-600";
  return "whitespace-nowrap border-b-2 px-3 py-2 text-xs font-semibold border-transparent text-slate-500 hover:text-slate-700";
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
  const kpis: Array<{ key: string; label: string; value: string | number; note: string; icon: typeof BarChart3; iconBg: string; iconInk: string }> = [
    { key: "confirmed", label: "Ventas confirmadas", value: page.metrics.confirmed, note: "Compromisos comerciales", icon: CheckCircle2, iconBg: "bg-blue-50", iconInk: "text-blue-600" },
    { key: "sold", label: "Monto vendido", value: moneyByCurrencyText(page.metrics.moneyByCurrency, "expectedAmount"), note: page.metrics.moneyByCurrency.length > 1 ? "Por moneda" : "Sin consolidar", icon: BarChart3, iconBg: "bg-indigo-50", iconInk: "text-indigo-600" },
    { key: "collected", label: "Cobrado", value: moneyByCurrencyText(page.metrics.moneyByCurrency, "receivedAmount"), note: "Neto de pagos confirmados", icon: CreditCard, iconBg: "bg-emerald-50", iconInk: "text-emerald-600" },
    { key: "ticket", label: "Ticket promedio", value: moneyByCurrencyText(page.metrics.moneyByCurrency, "averageTicket"), note: "Por moneda", icon: Receipt, iconBg: "bg-purple-50", iconInk: "text-purple-600" },
    { key: "alerts", label: "Alertas", value: page.metrics.alertCount, note: "Requieren revisión", icon: CircleAlert, iconBg: "bg-rose-50", iconInk: "text-rose-600" },
  ];
  const primaryMoney = page.metrics.moneyByCurrency[0];
  const receivedVsPendingTotal = primaryMoney
    ? Math.max(1, Number(primaryMoney.receivedAmount) + Number(primaryMoney.pendingAmount))
    : 0;
  const receivedShare = primaryMoney ? (Number(primaryMoney.receivedAmount) / receivedVsPendingTotal) * 100 : 0;
  const paymentTotal = Math.max(1, page.metrics.paymentBreakdown.reduce((sum, row) => sum + row.count, 0));
  const channelTotal = Math.max(1, page.metrics.channelBreakdown.reduce((sum, row) => sum + row.count, 0));

  return (
    <div className="space-y-5 pb-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 shadow-xs">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-900">Gestión de ventas</h1>
            <p className="text-xs font-normal text-slate-500">Administra y da seguimiento a todas tus ventas y operaciones.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700">
            <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
            Últimos 30 días
          </span>
          <Link href={`/api/admin/ventas/export?${queryString}`} className={secondaryButtonClass}>
            <Download className="h-3.5 w-3.5 text-slate-500" />
            Exportar
          </Link>
          {canManage ? (
            <button onClick={() => setMode("chooser")} className={primaryButtonClass}>
              <Plus className="h-3.5 w-3.5" />
              Registrar venta
            </button>
          ) : null}
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

      <section className="grid gap-4 xl:grid-cols-12">
        <div className="flex flex-col rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs xl:col-span-3">
          <h2 className="text-sm font-bold tracking-tight text-slate-900">Ventas cobradas vs pendientes</h2>
          {primaryMoney ? (
            <div className="flex flex-1 items-center gap-4 pt-3">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
                <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" fill="none" r="40" stroke="#f1f5f9" strokeWidth={16} />
                  <circle cx="50" cy="50" fill="none" r="40" stroke="#10b981" strokeDasharray={`${(receivedShare / 100) * 251.2} 251.2`} strokeWidth={16} />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-[11px] font-bold text-slate-900">{receivedShare.toFixed(0)}%</span>
                  <span className="text-[9px] text-slate-400">Cobrado</span>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    <span className="text-slate-600">Cobrado</span>
                  </span>
                  <strong className="text-slate-800">{money(primaryMoney.currency, primaryMoney.receivedAmount)}</strong>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-slate-200" />
                    <span className="text-slate-600">Pendiente</span>
                  </span>
                  <strong className="text-slate-800">{money(primaryMoney.currency, primaryMoney.pendingAmount)}</strong>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-[11px] text-slate-400">Sin ventas registradas en este alcance.</p>
          )}
        </div>

        <div className="flex flex-col rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs xl:col-span-3">
          <h2 className="text-sm font-bold tracking-tight text-slate-900">Ticket promedio</h2>
          {page.metrics.moneyByCurrency.length ? (
            <div className="flex-1 space-y-2 pt-3">
              {page.metrics.moneyByCurrency.map((row) => (
                <div key={row.currency} className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-slate-500">{row.currency}</span>
                  <strong className="text-sm text-slate-900">{row.averageTicket ? money(row.currency, row.averageTicket) : "N/D"}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-[11px] text-slate-400">Sin datos en este alcance.</p>
          )}
        </div>

        <div className="flex flex-col rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs xl:col-span-3">
          <h2 className="text-sm font-bold tracking-tight text-slate-900">Ventas por método de pago</h2>
          {page.metrics.paymentBreakdown.length ? (
            <div className="flex-1 space-y-2.5 pt-3">
              {page.metrics.paymentBreakdown.map((row, index) => (
                <div key={row.method} className="flex items-center text-xs">
                  <span className="w-20 truncate font-medium text-slate-700">{labelState(row.method)}</span>
                  <div className="flex flex-1 items-center gap-2">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-2 rounded-full ${barColors[index % barColors.length]}`} style={{ width: `${Math.max(2, (row.count / paymentTotal) * 100)}%` }} />
                    </div>
                    <span className="w-8 shrink-0 text-right text-[11px] font-medium text-slate-500">{((row.count / paymentTotal) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-[11px] text-slate-400">Sin datos en este alcance.</p>
          )}
        </div>

        <div className="flex flex-col rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs xl:col-span-3">
          <h2 className="text-sm font-bold tracking-tight text-slate-900">Ventas por canal</h2>
          {page.metrics.channelBreakdown.length ? (
            <div className="flex-1 space-y-2.5 pt-3">
              {page.metrics.channelBreakdown.map((row, index) => (
                <div key={row.channel} className="flex items-center text-xs">
                  <span className="w-20 truncate font-medium text-slate-700">{row.channel}</span>
                  <div className="flex flex-1 items-center gap-2">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-2 rounded-full ${barColors[index % barColors.length]}`} style={{ width: `${Math.max(2, (row.count / channelTotal) * 100)}%` }} />
                    </div>
                    <span className="w-8 shrink-0 text-right text-[11px] font-medium text-slate-500">{((row.count / channelTotal) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-[11px] text-slate-400">Sin datos en este alcance.</p>
          )}
        </div>
      </section>

      <form
        action="/admin/ventas"
        className="flex flex-wrap items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs"
      >
        <label className="flex h-10 min-w-[230px] flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            name="query"
            defaultValue={new URLSearchParams(queryString).get("query") ?? ""}
            placeholder="Buscar por venta, cliente, documento, vendedor..."
            className="w-full bg-transparent text-xs font-medium text-slate-700 outline-none placeholder:text-slate-400"
          />
        </label>
        <FilterSelect name="status" values={page.facets.statuses} query={queryString} label="Estado" />
        <FilterSelect name="currency" values={page.facets.currencies} query={queryString} label="Moneda" />
        <FilterSelect name="channel" values={page.facets.channels} query={queryString} label="Canal" />
        <details className="relative">
          <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            Más filtros
          </summary>
          <div className="absolute right-0 z-30 mt-2 grid w-[min(92vw,620px)] gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl sm:grid-cols-2">
            <FilterSelect name="paymentReconciliation" values={["PENDING", "PARTIAL", "PAID", "OVERPAID", "OBSERVED", "NO_ORDER"]} query={queryString} label="Conciliación de cobro" />
            <FilterSelect name="paymentStatus" values={["PENDING", "UNDER_REVIEW", "CONFIRMED", "APPROVED", "REJECTED", "CANCELLED", "REFUNDED", "ERROR"]} query={queryString} label="Estado del pago" />
            <FilterSelect name="invoiceStatus" values={["PENDING", "ISSUED", "VOID", "ERROR"]} query={queryString} label="Facturación" />
            <FilterText name="seller" label="Vendedor" query={queryString} placeholder="Nombre del vendedor" />
            <FilterText name="customer" label="Cliente" query={queryString} placeholder="Nombre del cliente" />
            <FilterDate name="dateFrom" label="Desde" query={queryString} />
            <FilterDate name="dateTo" label="Hasta" query={queryString} />
            <button className={`${primaryButtonClass} sm:col-span-2`}>Aplicar filtros</button>
          </div>
        </details>
        <button className={secondaryButtonClass}>Aplicar</button>
      </form>

      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                {["Venta", "Cliente", "Monto", "Documentos", "Cobro", "Estado", "Canal", "Vendedor", "Fecha", ""].map((value) => (
                  <th key={value} className="px-3 py-3 font-medium">{value}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {page.items.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-slate-50/60">
                  <td className="px-3 py-3">
                    <button onClick={() => setDetailId(row.id)} className="text-left font-semibold text-blue-600 hover:underline">
                      {row.code}
                      <span className="mt-0.5 block text-[10.5px] font-normal text-slate-400">
                        {row.quoteTrackingCode ?? "Venta directa"}
                      </span>
                    </button>
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-900">{row.customerName}</td>
                  <td className="px-3 py-3 font-semibold text-slate-900">{money(row.currency, row.total)}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {row.quoteTrackingCode ? (
                        <span className="rounded-md bg-blue-50 px-1.5 py-1 text-[10px] font-medium text-blue-700">{row.quoteTrackingCode}</span>
                      ) : null}
                      {row.orderCode ? (
                        <span className="rounded-md bg-slate-100 px-1.5 py-1 text-[10px] font-medium text-slate-600">{row.orderCode}</span>
                      ) : null}
                      {row.externalInvoiceReference ? (
                        <span className="rounded-md bg-emerald-50 px-1.5 py-1 text-[10px] font-medium text-emerald-700">{row.externalInvoiceReference}</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10.5px] font-medium ${tone(row.payment.state)}`}>{labelState(row.payment.state)}</span>
                    <span className="mt-1 block text-[10px] text-slate-400">{money(row.currency, row.payment.receivedAmount)}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10.5px] font-medium ${tone(row.status)}`}>{labelState(row.status)}</span>
                  </td>
                  <td className="px-3 py-3 text-slate-500">{row.channel ?? "N/D"}</td>
                  <td className="px-3 py-3 text-slate-500">{row.sellerName ?? "Sin asignar"}</td>
                  <td className="px-3 py-3 text-slate-500">{new Date(row.createdAt).toLocaleDateString("es-PE")}</td>
                  <td className="px-3 py-3 text-center">
                    <button onClick={() => setDetailId(row.id)} className="inline-flex rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label={`Ver ${row.code}`}>
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-2 p-3 md:hidden">
          {page.items.map((row) => (
            <button key={row.id} onClick={() => setDetailId(row.id)} className="rounded-lg border border-slate-200 p-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50/60">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-blue-600">{row.code}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{row.customerName}</p>
                </div>
                <strong className="text-xs text-slate-900">{money(row.currency, row.total)}</strong>
              </div>
              <div className="mt-3 flex justify-between">
                <span className={`inline-flex items-center rounded-md border px-1.5 py-1 text-[10px] font-medium ${tone(row.payment.state)}`}>{labelState(row.payment.state)}</span>
                <span className="text-[10.5px] text-slate-400">{row.channel ?? "N/D"}</span>
              </div>
            </button>
          ))}
        </div>
        {page.items.length === 0 ? (
          <div className="border-t border-slate-100 p-10 text-center">
            <p className="text-sm font-bold text-slate-700">{page.totalItems ? "No hay ventas en esta página." : "No hay ventas con estos filtros."}</p>
          </div>
        ) : null}
        <Pager page={page.page} total={page.totalPages} query={queryString} totalItems={page.totalItems} pageSize={page.pageSize} />
      </section>

      <section>
        <h2 className="text-sm font-bold tracking-tight text-slate-900">Centro de operaciones</h2>
        <p className="mt-1 text-xs text-slate-500">Acciones y tareas clave para completar el ciclo de ventas.</p>
        <div className="mt-3 grid gap-4 lg:grid-cols-3">
          {canPaymentsView ? (
            <Queue title="Cobros pendientes" rows={pending} href="/admin/pagos" action="Gestionar pagos" />
          ) : null}
          <Queue title="Facturación" rows={invoices} href="/admin/ventas?invoiceStatus=PENDING" action="Ver por facturar" />
          <Queue title="Validación" rows={alerts} href="/admin/ventas" action="Ver alertas" />
        </div>
      </section>

      <AdminDrawer open={mode !== null} onClose={() => setMode(null)} title={mode === "direct" ? "Venta directa" : "Registrar venta"} size="wide">
        {mode === "chooser" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <button onClick={() => setMode("direct")} className="rounded-xl border border-slate-200 p-5 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/40">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
              <h3 className="mt-3 text-sm font-bold text-slate-900">Venta directa</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Crea venta, pedido, reserva e intención de cobro con precios calculados en servidor.
              </p>
            </button>
            <Link href="/admin/cotizaciones" onClick={() => setMode(null)} className="rounded-xl border border-slate-200 p-5 text-left transition-colors hover:border-purple-200 hover:bg-purple-50/40">
              <FileText className="h-6 w-6 text-purple-600" />
              <h3 className="mt-3 text-sm font-bold text-slate-900">Desde cotización aceptada</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">Usa el flujo controlado de la cotización aceptada.</p>
            </Link>
          </div>
        ) : (
          <DirectSaleForm customers={customers} locations={locations} onDone={() => setMode(null)} />
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

function FilterSelect({ name, values, query, label }: { name: string; values: string[]; query: string; label: string }) {
  const current = new URLSearchParams(query).get(name) ?? "";
  return (
    <AdminSelect
      name={name}
      ariaLabel={label}
      className="w-auto min-w-[10rem]"
      value={current}
      options={[{ value: "", label }, ...values.map((value) => ({ value, label: labelState(value) }))]}
    />
  );
}
function FilterText({ name, label, placeholder, query }: { name: string; label: string; placeholder: string; query: string }) {
  return (
    <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
      {label}
      <input name={name} defaultValue={new URLSearchParams(query).get(name) ?? ""} placeholder={placeholder} className={`${inputClass} normal-case`} />
    </label>
  );
}
function FilterDate({ name, label, query }: { name: string; label: string; query: string }) {
  return (
    <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
      {label}
      <input type="date" name={name} defaultValue={new URLSearchParams(query).get(name) ?? ""} className={`${inputClass} normal-case`} />
    </label>
  );
}
function Pager({ page, total, query, totalItems, pageSize }: { page: number; total: number; query: string; totalItems: number; pageSize: number }) {
  const link = (target: number) => {
    const params = new URLSearchParams(query);
    params.set("page", String(target));
    return `/admin/ventas?${params}`;
  };
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(totalItems, page * pageSize);
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 sm:flex-row">
      <span className="text-xs text-slate-500">Mostrando {from} a {to} de {totalItems} ventas</span>
      {total > 1 ? (
        <nav aria-label="Paginación de ventas" className="flex items-center gap-1">
          {pageNumbers(page, total).map((value) => (
            <Link key={value} href={link(value)} aria-current={value === page ? "page" : undefined} className={pagerLinkClass(value === page)}>
              {value}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
function Queue({ title, rows, href, action }: { title: string; rows: SalesListItem[]; href: string; action: string }) {
  return (
    <section className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
        <h3 className="text-xs font-bold text-slate-900">{title}</h3>
      </div>
      <div className="mt-3 grid gap-2">
        {rows.length ? (
          rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-[11.5px] font-semibold text-slate-800">{row.code}</p>
                <p className="mt-0.5 truncate text-[10px] text-slate-400">{row.customerName}</p>
              </div>
              <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${tone(row.payment.state)}`}>{labelState(row.payment.state)}</span>
            </div>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-[10.5px] text-slate-400">Sin elementos pendientes.</p>
        )}
      </div>
      <Link href={href} className="mt-3 inline-flex text-xs font-semibold text-blue-600 hover:underline">
        {action} →
      </Link>
    </section>
  );
}
function DirectSaleForm({ customers, locations, onDone }: { customers: CustomerOption[]; locations: LocationOption[]; onDone: () => void }) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"PICKUP" | "DELIVERY" | "SHIPPING">("PICKUP");
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
      const response = await fetch(`/api/admin/precios/productos?q=${encodeURIComponent(term)}`, { cache: "no-store" });
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
      <p className="text-xs text-slate-500">
        El servidor confirma precio vigente, moneda única, promociones y disponibilidad antes de crear la operación.
      </p>
      {notice ? (
        <p role="alert" className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs font-semibold text-amber-700">
          {notice}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-[11px] font-semibold text-slate-500">
          Cliente
          <AdminSelect
            ariaLabel="Cliente"
            value={customerId}
            onValueChange={setCustomerId}
            options={[{ value: "", label: "Selecciona cliente" }, ...customers.map((customer) => ({ value: customer.id, label: customer.name }))]}
          />
        </label>
        <label className="grid gap-1.5 text-[11px] font-semibold text-slate-500">
          Local
          <AdminSelect
            ariaLabel="Local"
            value={locationId}
            onValueChange={setLocationId}
            options={[{ value: "", label: "Selecciona local" }, ...locations.map((location) => ({ value: location.id, label: `${location.code} · ${location.name}` }))]}
          />
        </label>
      </div>
      <div className="rounded-xl border border-slate-200 p-3">
        <p className="text-xs font-bold text-slate-900">Productos</p>
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
            className={`${inputClass} h-9`}
          />
          <button disabled={busy} onClick={() => void search()} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 px-3 text-xs font-semibold text-blue-600 disabled:cursor-not-allowed disabled:opacity-50">
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
                className="rounded-lg p-2 text-left hover:bg-slate-50"
              >
                <span className="text-xs font-semibold text-slate-700">{product.sku}</span>
                <span className="ml-2 text-xs text-slate-500">{product.productName}</span>
              </button>
            ))}
          </div>
        ) : null}
        <div className="mt-3 grid gap-2">
          {lines.map((line) => (
            <div key={line.productId} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-700">{line.sku} · {line.productName}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">Precio se calculará en servidor</p>
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
                className="h-8 w-16 rounded-lg border border-slate-200 px-2 text-xs"
              />
              <button onClick={() => setLines(lines.filter((item) => item.productId !== line.productId))} className="p-1 text-rose-500 hover:text-rose-600" aria-label={`Quitar ${line.productName}`}>
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-[11px] font-semibold text-slate-500">
          Entrega
          <AdminSelect
            ariaLabel="Entrega"
            value={deliveryMethod}
            onValueChange={(value) => setDeliveryMethod(value as typeof deliveryMethod)}
            options={[
              { value: "PICKUP", label: "Recojo" },
              { value: "DELIVERY", label: "Delivery" },
              { value: "SHIPPING", label: "Envío" },
            ]}
          />
        </label>
        {deliveryMethod !== "PICKUP" ? (
          <label className="grid gap-1.5 text-[11px] font-semibold text-slate-500">
            Dirección
            <input value={address} onChange={(event) => setAddress(event.target.value)} className={inputClass} />
          </label>
        ) : null}
      </div>
      <button
        disabled={busy || !customerId || !locationId || !lines.length || (deliveryMethod !== "PICKUP" && !address.trim())}
        onClick={() => void submit()}
        className={primaryButtonClass}
      >
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        Confirmar venta directa
      </button>
    </div>
  );
}
function SaleDetailDrawer({ saleId, canManage, canPaymentsView, onClose }: { saleId: string | null; canManage: boolean; canPaymentsView: boolean; onClose: () => void }) {
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [tab, setTab] = useState<"Resumen" | "Productos" | "Cobros" | "Pedido" | "Facturación" | "Historial">("Resumen");
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
      const response = await fetch(`/api/admin/ventas/${encodeURIComponent(saleId)}`, { cache: "no-store" });
      const data = await json(response);
      if (!response.ok || !data?.sale) {
        throw new Error(message(data, "No se pudo cargar el detalle de la venta."));
      }
      const saleData = data.sale as Record<string, unknown>;
      setInvoiceDraft({
        invoiceStatus: String(saleData.invoiceStatus ?? "PENDING"),
        externalInvoiceReference: String(saleData.externalInvoiceReference ?? ""),
        invoiceIssuedAt: saleData.invoiceIssuedAt ? new Date(String(saleData.invoiceIssuedAt)).toISOString().slice(0, 16) : "",
        invoiceNote: String(saleData.invoiceNote ?? ""),
      });
      setDetail(data);
      setError("");
    } catch (loadError) {
      setDetail(null);
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el detalle de la venta.");
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
  const items = Array.isArray(detail?.items) ? (detail.items as Array<Record<string, unknown>>) : [];
  const orders = Array.isArray(detail?.orders) ? (detail.orders as Array<Record<string, unknown>>) : [];
  const payments = orders.flatMap((order): Array<Record<string, unknown>> => {
    if (!Array.isArray(order.payments)) return [];
    return (order.payments as Array<Record<string, unknown>>).map((payment) => ({ ...payment, orderCode: order.code }));
  });
  const audit = Array.isArray(detail?.audit) ? (detail.audit as Array<Record<string, unknown>>) : [];
  const tabs: Array<typeof tab> = ["Resumen", "Productos", "Pedido", "Facturación", "Historial"];
  if (canPaymentsView) tabs.splice(2, 0, "Cobros");
  const value = (raw: unknown, fallback = "—") => (raw == null || raw === "" ? fallback : String(raw));
  const saleCurrency = String(sale?.currency ?? "PEN");
  const paymentCurrency = (payment: Record<string, unknown>) => String(payment.currency ?? saleCurrency);
  const saleCurrencyPayments = payments.filter((payment) => paymentCurrency(payment) === saleCurrency);
  const otherPaymentCurrencies = [...new Set(payments.map(paymentCurrency).filter((currency) => currency !== saleCurrency))];
  const total = sale ? Number(sale.total ?? 0) : 0;
  const grossReceived = saleCurrencyPayments.reduce(
    (sum, payment) => (["CONFIRMED", "APPROVED", "REFUNDED"].includes(String(payment.status)) ? sum + Number(payment.amount ?? 0) : sum),
    0,
  );
  const refunded = saleCurrencyPayments.reduce(
    (sum, payment) => (["CONFIRMED", "APPROVED", "REFUNDED"].includes(String(payment.status)) ? sum + Number(payment.refundedAmount ?? 0) : sum),
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
      const response = await fetch(`/api/admin/ventas/${encodeURIComponent(saleId)}/facturacion`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(invoiceDraft),
      });
      const data = await json(response);
      if (!response.ok || !data) throw new Error(message(data, "No se pudo actualizar la facturación."));
      const updatedSale = data.sale as Record<string, unknown> | undefined;
      if (updatedSale) {
        setDetail((current) => (current ? { ...current, sale: updatedSale } : current));
        setInvoiceDraft((current) => ({
          ...current,
          invoiceStatus: String(updatedSale.invoiceStatus ?? current.invoiceStatus),
          externalInvoiceReference: String(updatedSale.externalInvoiceReference ?? ""),
          invoiceIssuedAt: updatedSale.invoiceIssuedAt ? new Date(String(updatedSale.invoiceIssuedAt)).toISOString().slice(0, 16) : current.invoiceIssuedAt,
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
        <div className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">
          <p role="alert">{error}</p>
          <button type="button" onClick={() => void loadDetail()} disabled={detailLoading} className="mt-3 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-50">
            {detailLoading ? "Reintentando…" : "Reintentar"}
          </button>
        </div>
      ) : !sale ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Cargando trazabilidad…
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-4">
            {[
              ["Código", sale.code],
              ["Estado", labelState(String(sale.status))],
              ["Total", money(String(sale.currency), String(sale.total))],
              ["Facturación", labelState(sale.invoiceStatus ?? "PENDING")],
            ].map(([label, itemValue]) => (
              <div key={String(label)} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                <p className="mt-1 truncate text-xs font-bold text-slate-900">{String(itemValue)}</p>
              </div>
            ))}
          </div>
          <nav className="flex gap-1 overflow-x-auto border-b border-slate-100" aria-label="Secciones del detalle de venta" role="tablist">
            {tabs.map((item) => (
              <button key={item} type="button" onClick={() => setTab(item)} aria-selected={tab === item} role="tab" className={tabClass(tab === item)}>
                {item}
              </button>
            ))}
          </nav>
          {tab === "Resumen" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                ["Cliente", value(customer?.name)],
                ["Vendedor", value(detail?.sellerName, "Sin asignar")],
                ["Cotización", value(quote?.trackingCode, "Venta directa")],
                ["Oportunidad", value(opportunity?.code)],
                ["Fecha", sale.createdAt ? new Date(sale.createdAt).toLocaleString("es-PE") : "—"],
                ["Subtotal", money(String(sale.currency), sale.subtotal)],
                ["Descuento", money(String(sale.currency), sale.discountAmount)],
                ...(canPaymentsView ? [["Saldo", money(String(sale.currency), balance)] as [string, string]] : []),
              ].map(([label, itemValue]) => (
                <div key={String(label)} className="rounded-lg border border-slate-100 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                  <p className="mt-1 text-xs font-bold text-slate-900">{String(itemValue)}</p>
                </div>
              ))}
            </div>
          ) : null}
          {tab === "Productos" ? (
            <DetailSection title="Productos (snapshot de venta)">
              {items.length ? (
                items.map((item) => (
                  <div key={String(item.id)} className="flex justify-between gap-3 border-b border-slate-100 p-3 text-[11px] last:border-b-0">
                    <div>
                      <p className="font-semibold text-slate-700">{value(item.skuSnapshot)} · {value(item.productNameSnapshot)}</p>
                      <p className="mt-1 text-slate-400">
                        Cantidad: {value(item.quantity)} · Precio:{" "}
                        {money(String(item.currency), typeof item.unitPrice === "string" || typeof item.unitPrice === "number" ? item.unitPrice : null)}{" "}
                        · Descuento: {value(item.discountAmount)}
                      </p>
                    </div>
                    <strong className="text-slate-900">
                      {money(String(item.currency), typeof item.lineTotal === "string" || typeof item.lineTotal === "number" ? item.lineTotal : null)}
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
                  <div key={String(label)} className="rounded-lg bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{itemValue}</p>
                  </div>
                ))}
              </div>
              {otherPaymentCurrencies.length ? (
                <p className="border-t border-slate-100 px-3 py-2 text-[10.5px] font-medium text-amber-700">
                  Pagos en {otherPaymentCurrencies.join(", ")} no se mezclan con el total en {saleCurrency}.
                </p>
              ) : null}
              {payments.length ? (
                payments.map((payment, index) => (
                  <div key={String(payment.id ?? index)} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 p-3 text-[11px]">
                    <span className="font-semibold text-slate-700">{value(payment.method)} · {value(payment.orderCode)}</span>
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${tone(value(payment.status))}`}>{labelState(value(payment.status))}</span>
                    <strong className="text-slate-900">
                      {money(
                        typeof payment.currency === "string" ? payment.currency : String(sale.currency),
                        typeof payment.amount === "string" || typeof payment.amount === "number" ? payment.amount : null,
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
                  <div key={String(order.id ?? index)} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-3 text-[11px] last:border-b-0">
                    <div>
                      <p className="font-semibold text-slate-700">{value(order.code)}</p>
                      <p className="mt-1 text-slate-400">
                        Estado: {labelOrderState(value(order.status))} · Entrega: {labelState(value(order.deliveryMethod))}
                      </p>
                    </div>
                    <Link href={`/admin/pedidos?query=${encodeURIComponent(value(order.code, ""))}`} className="font-semibold text-blue-600 hover:underline">
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
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Estado</p>
                  <p className="mt-1 text-xs font-bold text-slate-900">{labelState(value(sale.invoiceStatus, "Pendiente"))}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Referencia ACSOFT</p>
                  <p className="mt-1 text-xs font-bold text-slate-900">{value(sale.externalInvoiceReference, "Sin referencia registrada")}</p>
                </div>
              </div>
              {canManage ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveInvoice();
                  }}
                  className="grid gap-3 border-t border-slate-100 p-3 sm:grid-cols-2"
                >
                  <label className="grid gap-1.5 text-[11px] font-semibold text-slate-500">
                    Estado externo
                    <AdminSelect
                      ariaLabel="Estado externo de facturación"
                      value={invoiceDraft.invoiceStatus}
                      onValueChange={(newValue) => setInvoiceDraft({ ...invoiceDraft, invoiceStatus: newValue })}
                      options={[
                        { value: "PENDING", label: "Pendiente de emitir en ACSOFT" },
                        { value: "ISSUED", label: "Emitida" },
                        { value: "VOID", label: "Anulada" },
                        { value: "ERROR", label: "Error" },
                      ]}
                    />
                  </label>
                  <label className="grid gap-1.5 text-[11px] font-semibold text-slate-500">
                    Serie/número o referencia
                    <input
                      value={invoiceDraft.externalInvoiceReference}
                      onChange={(event) => setInvoiceDraft({ ...invoiceDraft, externalInvoiceReference: event.target.value })}
                      maxLength={160}
                      placeholder="Referencia emitida por ACSOFT"
                      className={inputClass}
                    />
                  </label>
                  <label className="grid gap-1.5 text-[11px] font-semibold text-slate-500">
                    Fecha de emisión
                    <input
                      type="datetime-local"
                      value={invoiceDraft.invoiceIssuedAt}
                      onChange={(event) => setInvoiceDraft({ ...invoiceDraft, invoiceIssuedAt: event.target.value })}
                      className={inputClass}
                    />
                  </label>
                  <label className="grid gap-1.5 text-[11px] font-semibold text-slate-500 sm:col-span-2">
                    Nota
                    <textarea
                      value={invoiceDraft.invoiceNote}
                      onChange={(event) => setInvoiceDraft({ ...invoiceDraft, invoiceNote: event.target.value })}
                      maxLength={500}
                      placeholder="Observación sobre la facturación externa"
                      className={`${textareaClass} min-h-20`}
                    />
                  </label>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      disabled={invoiceBusy || (invoiceDraft.invoiceStatus === "ISSUED" && !invoiceDraft.externalInvoiceReference.trim())}
                      className={primaryButtonClass}
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
                  <div key={String(entry.id ?? index)} className="border-b border-slate-100 p-3 text-[11px] last:border-b-0">
                    <p className="font-semibold text-slate-700">{value(entry.action ?? entry.eventType, "Actualización")}</p>
                    <p className="mt-1 text-slate-400">
                      {value(entry.createdAt ? new Date(String(entry.createdAt)).toLocaleString("es-PE") : null)} · {value(entry.actorName ?? entry.actorId, "Sistema")}
                    </p>
                    <p className="mt-1 text-slate-500">{value(entry.reason ?? entry.note, "Sin detalle adicional")}</p>
                  </div>
                ))
              ) : (
                <EmptyDetail text="No hay eventos de auditoría para esta venta." />
              )}
            </DetailSection>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {canPaymentsView ? (
              <Link href="/admin/pagos" className={secondaryButtonClass}>Gestionar cobros</Link>
            ) : null}
            <Link href="/admin/pedidos" className={secondaryButtonClass}>Ver pedidos</Link>
          </div>
        </div>
      )}
    </AdminDrawer>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200/90">
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-xs font-bold text-slate-900">{title}</h3>
      </div>
      {children}
    </section>
  );
}
function EmptyDetail({ text }: { text: string }) {
  return <p className="p-4 text-[11px] text-slate-400">{text}</p>;
}
