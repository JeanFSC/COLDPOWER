"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  Eye,
  Filter,
  LoaderCircle,
  Percent,
  Search,
  Smartphone,
  Wallet,
} from "lucide-react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { AdminSparkline } from "@/components/admin/AdminChartsLazy";
import { ManualPaymentControl } from "@/components/admin/ManualPaymentControl";
import type { PaymentListItem, PaymentsPageResponse } from "@/lib/payments-contract";
import type { getPaymentsKpiSeries } from "@/lib/payments-repository";
import {
  groupPaymentMethodBreakdown,
  paymentCode,
  paymentMethodKey,
  paymentMethodLabel,
  paymentProviderLabel,
  paymentReferenceLabel,
} from "@/lib/payment-display";

type Detail = {
  payment: Record<string, unknown>;
  order: Record<string, unknown>;
  sale?: Record<string, unknown> | null;
  customer: Record<string, unknown>;
  attempts: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
  refunds: Array<Record<string, unknown>>;
  statusHistory: Array<Record<string, unknown>>;
  reconciliation: {
    expectedAmount: string;
    grossReceivedAmount: string;
    refundedAmount: string;
    netReceivedAmount: string;
    difference: number;
    status: string;
  };
};

const labels: Record<string, string> = {
  PENDING: "Pendiente",
  UNDER_REVIEW: "En revisión",
  CONFIRMED: "Confirmado",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
  REFUND_REQUIRED: "Por reembolsar",
  ERROR: "Error",
  MATCH: "Conciliado",
  UNDERPAID: "Faltante",
  OVERPAID: "Sobrepago",
  TRANSFER: "Transferencia",
  TRANSFERENCIA: "Transferencia",
  CASH: "Efectivo",
  DEPOSIT: "Depósito",
  CARD: "Tarjeta",
  CREDIT_CARD: "Tarjeta de crédito",
  DEBIT_CARD: "Tarjeta de débito",
  YAPE: "Yape",
  PLIN: "Plin",
  mock: "Pasarela de prueba",
  "development-gateway": "Pasarela de prueba",
};
function label(value: string | null | undefined) {
  return value ? (labels[value] ?? paymentMethodLabel(value)) : "N/D";
}
function money(currency: string, value: string | number) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency }).format(Number(value));
}
function amountsByCurrencyText(rows: Array<{ currency: string; net: string | number }>) {
  if (!rows.length) return "N/D";
  return rows
    .map((row) => (rows.length === 1 ? money(row.currency, row.net) : `${row.currency} · ${money(row.currency, row.net)}`))
    .join(" · ");
}
type MethodBreakdownRow = PaymentsPageResponse["metrics"]["methodBreakdown"][number];
function groupedMethodBreakdown(rows: MethodBreakdownRow[]) {
  return groupPaymentMethodBreakdown(rows);
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
function paymentHistoryLabel(row: Record<string, unknown>) {
  const from = row.fromStatus ?? row.from;
  const to = row.toStatus ?? row.to;
  if (from != null || to != null) {
    return `${from == null ? "Inicio" : label(String(from))} → ${to == null ? "Registro" : label(String(to))}`;
  }
  return label(String(row.status ?? row.eventType ?? row.result ?? "Registro"));
}
function badgeStyle(value: string) {
  if (value === "MATCH" || value === "CONFIRMED" || value === "APPROVED") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (value === "UNDERPAID" || value === "OVERPAID" || value === "REJECTED" || value === "ERROR") return "bg-red-50 text-red-700 border-red-100";
  if (value === "REFUNDED" || value === "CANCELLED") return "bg-slate-100 text-slate-600 border-slate-200";
  return "bg-amber-50 text-amber-700 border-amber-100";
}
function methodStyle(value: string) {
  const method = paymentMethodKey(value);
  if (method === "TRANSFER") return "bg-blue-50 text-blue-700 border-blue-100";
  if (method === "CARD" || method === "CREDIT_CARD" || method === "DEBIT_CARD") return "bg-purple-50 text-purple-700 border-purple-100";
  if (method === "YAPE" || method === "PLIN") return "bg-teal-50 text-teal-700 border-teal-100";
  if (method === "CASH" || method === "DEPOSIT") return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-slate-100 text-slate-600 border-slate-200";
}
function methodIcon(value: string) {
  if (value === "TRANSFER" || value === "TRANSFERENCIA") return Banknote;
  if (value === "CARD" || value === "CREDIT_CARD" || value === "DEBIT_CARD") return CreditCard;
  if (value === "YAPE" || value === "PLIN") return Smartphone;
  return Wallet;
}
function methodIconBg(value: string) {
  if (value === "TRANSFER" || value === "TRANSFERENCIA") return "bg-blue-50 text-blue-600";
  if (value === "CARD" || value === "CREDIT_CARD" || value === "DEBIT_CARD") return "bg-purple-50 text-purple-600";
  if (value === "YAPE" || value === "PLIN") return "bg-teal-50 text-teal-600";
  return "bg-amber-50 text-amber-600";
}
function pageNumbers(current: number, total: number) {
  const width = Math.min(5, total);
  const start = Math.max(1, Math.min(current - 2, total - width + 1));
  return Array.from({ length: width }, (_, index) => start + index);
}
async function parse(response: Response) {
  return response.json().catch(() => ({})) as Promise<Record<string, unknown>>;
}
function apiMessage(data: Record<string, unknown>, fallback: string) {
  const error = data.error;
  return typeof error === "string"
    ? error
    : typeof error === "object" && error && "message" in error && typeof error.message === "string"
      ? error.message
      : fallback;
}

type KpiSeries = Awaited<ReturnType<typeof getPaymentsKpiSeries>>;

export function PaymentsControlCenter({
  page,
  series,
  queryString,
  canManage,
  canRefund,
  canManual,
}: {
  page: PaymentsPageResponse;
  series: KpiSeries;
  queryString: string;
  canManage: boolean;
  canRefund: boolean;
  canManual: boolean;
}) {
  const [detailId, setDetailId] = useState<string | null>(() => new URLSearchParams(queryString).get("paymentId"));
  const confirmed = amountsByCurrencyText(page.metrics.amountsByCurrency);
  const methodBreakdown = groupedMethodBreakdown(page.metrics.methodBreakdown);
  const reconciliationRate = page.metrics.reconciliationRate;
  const statusTotal = Math.max(1, page.metrics.total);
  const kpis: Array<{
    key: string;
    label: string;
    value: string;
    note: string;
    icon: typeof BadgeCheck;
    iconBg: string;
    iconInk: string;
    tone: "blue" | "orange" | "green" | "red" | "purple";
    sparkline: number[];
  }> = [
    { key: "confirmed", label: "Monto confirmado", value: confirmed, note: "Alcance actual · tendencia de los últimos 14 días", icon: BadgeCheck, iconBg: "bg-blue-50", iconInk: "text-blue-600", tone: "blue", sparkline: series.confirmedAmount },
    { key: "reconciled", label: "Órdenes conciliadas", value: String(page.metrics.reconciledOrders), note: "Conciliación por orden", icon: BadgeCheck, iconBg: "bg-emerald-50", iconInk: "text-emerald-600", tone: "green", sparkline: series.confirmedCount },
    { key: "pending", label: "Pendientes", value: String(page.metrics.pending), note: "Pendiente o en revisión", icon: Clock, iconBg: "bg-amber-50", iconInk: "text-amber-600", tone: "orange", sparkline: series.pending },
    { key: "observed", label: "Observados", value: String(page.metrics.observed), note: "Diferencia, rechazo o error", icon: AlertTriangle, iconBg: "bg-red-50", iconInk: "text-red-600", tone: "red", sparkline: series.observed },
  ];
  const queuePills: Array<[string, string | undefined, number]> = [
    ["Todos", undefined, page.metrics.total],
    ["Pendientes", "pending", page.metrics.pending],
    ["Con diferencia", "difference", page.metrics.underpaidOrders + page.metrics.overpaidOrders],
    ["Errores de proveedor", "providerErrors", page.metrics.rejected],
    ["Por reembolsar", "refunds", page.metrics.refunded],
  ];
  const activeQueue = new URLSearchParams(queryString).get("queue") ?? "";
  const queueHref = (value: string | undefined) => {
    const params = new URLSearchParams(queryString);
    if (value) params.set("queue", value);
    else params.delete("queue");
    params.delete("page");
    return "/admin/pagos?" + params.toString();
  };
  const actionable = [...page.queues.pending, ...page.queues.difference, ...page.queues.providerErrors, ...page.queues.refunds].slice(0, 8);
  const otherStatus = Math.max(0, page.metrics.total - page.metrics.approved - page.metrics.pending - page.metrics.rejected);
  const statusDonut = [
    { label: "Aprobados", value: page.metrics.approved, dot: "bg-emerald-500", hex: "#10b981" },
    { label: "Pendientes", value: page.metrics.pending, dot: "bg-amber-500", hex: "#f59e0b" },
    { label: "Rechazados", value: page.metrics.rejected, dot: "bg-red-500", hex: "#ef4444" },
    ...(otherStatus > 0 ? [{ label: "Reembolsados / otros", value: otherStatus, dot: "bg-slate-400", hex: "#94a3b8" }] : []),
  ];
  let cursor = 0;
  const donutSegments = statusDonut.map((row) => {
    const start = cursor;
    cursor += row.value;
    return { ...row, dasharray: `${(row.value / statusTotal) * 87.96} 87.96`, offset: `${-(start / statusTotal) * 87.96}` };
  });

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 shadow-xs">
            <BadgeCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-900">Gestión de pagos</h1>
            <p className="text-xs font-normal text-slate-500">Administra, revisa y concilia los pagos recibidos.</p>
          </div>
        </div>
        <Link
          href={"/api/admin/pagos/export?" + queryString}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:border-slate-300"
        >
          <Download className="h-4 w-4 text-slate-500" />
          Exportar reporte
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
              <div className="flex items-center gap-3.5">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${item.iconBg} ${item.iconInk}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <span className="block truncate text-[11.5px] font-medium text-slate-500">{item.label}</span>
                  <span className="block truncate text-xl font-bold leading-snug text-slate-900">{item.value}</span>
                </div>
              </div>
              <AdminSparkline
                tone={item.tone}
                data={item.sparkline}
                ariaLabel={item.sparkline.some((value) => value > 0) ? `Tendencia real de ${item.label.toLowerCase()} (últimos 14 días)` : `${item.note}; sin serie histórica comparable`}
              />
              <p className="mt-1.5 truncate text-[10.5px] font-semibold text-slate-400">{item.note}</p>
            </div>
          );
        })}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-50 text-purple-600">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-[11.5px] font-medium text-slate-500">Tasa de conciliación</span>
              <span className="block text-xl font-bold leading-snug text-slate-900">{reconciliationRate == null ? "N/D" : `${reconciliationRate}%`}</span>
            </div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-purple-100">
            <div className="h-full rounded-full bg-purple-600" style={{ width: `${Math.max(0, Math.min(100, reconciliationRate ?? 0))}%` }} />
          </div>
          <p className="mt-1.5 text-[10.5px] font-semibold text-slate-400">{page.metrics.reconciliationNumerator} de {page.metrics.reconciliationDenominator} órdenes conciliables</p>
        </div>
      </section>

      <section className="grid items-start gap-4 lg:grid-cols-2">
        <div className="flex h-fit flex-col rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
          <h2 className="text-sm font-bold tracking-tight text-slate-900">Estado de pago</h2>
          <div className="grid items-center justify-items-center gap-5 py-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:justify-items-stretch sm:gap-6 sm:px-4">
            <div className="relative flex h-36 w-36 shrink-0 items-center justify-center sm:h-40 sm:w-40 sm:justify-self-center">
              <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                <circle cx="18" cy="18" fill="none" r="14" stroke="#f1f5f9" strokeWidth={3.5} />
                {donutSegments.map((segment) => (
                  <circle key={segment.label} cx="18" cy="18" fill="none" r="14" stroke={segment.hex} strokeDasharray={segment.dasharray} strokeDashoffset={segment.offset} strokeWidth={3.5} />
                ))}
              </svg>
              <div className="absolute flex select-none flex-col items-center justify-center text-center">
                <span className="text-3xl font-extrabold leading-none tracking-tight text-slate-900">{page.metrics.total}</span>
                <span className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Pagos totales</span>
              </div>
            </div>
            <div className="w-full space-y-3 sm:flex sm:h-full sm:flex-col sm:justify-between sm:space-y-0">
              {statusDonut.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-3 w-3 shrink-0 rounded-full ${row.dot}`} />
                    <span className="text-sm font-medium text-slate-600">{row.label}</span>
                  </div>
                  <div className="text-sm font-bold text-slate-800">
                    {row.value} <span className="text-xs font-normal text-slate-400">({((row.value / statusTotal) * 100).toFixed(1)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex h-fit flex-col rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
          <h2 className="text-sm font-bold tracking-tight text-slate-900">Métodos de pago</h2>
          <div className="space-y-4 pt-3">
            {methodBreakdown.length ? (
              methodBreakdown.map((row) => {
                const MethodIcon = methodIcon(row.method);
                const total = amountsByCurrencyText(row.confirmedAmountsByCurrency);
                const share = row.confirmedAmountsByCurrency[0]
                  ? (row.confirmedAmountsByCurrency[0].net /
                      Math.max(
                        1,
                        page.metrics.amountsByCurrency.find((c) => c.currency === row.confirmedAmountsByCurrency[0].currency)?.net ?? 0,
                      )) *
                    100
                  : null;
                return (
                  <div key={row.method} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3.5">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${methodIconBg(row.method)}`}>
                        <MethodIcon className="h-5 w-5" />
                      </div>
                       <span className="whitespace-nowrap text-sm font-medium text-slate-700">{paymentMethodLabel(row.method)}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-8">
                      <span className="text-sm font-bold text-slate-800">{total}</span>
                      <span className="w-14 text-right text-sm font-medium text-slate-400">{share == null ? "N/D" : `${share.toFixed(1)}%`}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-[11px] text-slate-400">Sin pagos registrados.</p>
            )}
          </div>
        </div>
      </section>

      <form
        action="/admin/pagos"
        className="flex flex-wrap gap-2 rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-2xs"
      >
        <label className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            name="query"
            defaultValue={new URLSearchParams(queryString).get("query") ?? ""}
            placeholder="Buscar pago, pedido, cliente o referencia..."
            className="w-full bg-transparent text-xs font-medium text-slate-700 outline-none placeholder:text-slate-400"
          />
        </label>
        <Select name="status" title="Estado" values={page.facets.statuses} query={queryString} />
        <Select
          name="reconciliation"
          title="Conciliación"
          values={["PENDING", "MATCH", "UNDERPAID", "OVERPAID"]}
          query={queryString}
        />
        <Select name="method" title="Método" values={page.facets.methods} query={queryString} />
        <Select
          name="currency"
          title="Moneda"
          values={page.facets.currencies}
          query={queryString}
        />
        <details className="relative">
          <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            Más filtros
          </summary>
          <div className="absolute right-0 z-30 mt-2 grid w-[min(92vw,620px)] gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl sm:grid-cols-2">
            <Select name="provider" title="Proveedor" values={page.facets.providers} query={queryString} />
            <Select name="methodType" title="Tipo de método" values={["MANUAL", "PROVIDER"]} query={queryString} />
            <FilterText name="customer" label="Cliente" query={queryString} placeholder="Nombre del cliente" />
            <FilterText name="order" label="Pedido" query={queryString} placeholder="Código o ID del pedido" />
            <FilterDate name="dateFrom" label="Desde" query={queryString} />
            <FilterDate name="dateTo" label="Hasta" query={queryString} />
            <button className="h-10 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-blue-700 sm:col-span-2">
              Aplicar filtros
            </button>
          </div>
        </details>
        <button className="h-10 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50">
          Aplicar
        </button>
      </form>

      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
        <div className="flex items-center gap-2.5 border-b border-slate-200 p-4">
          <h2 className="text-sm font-bold text-slate-900">Pagos</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{page.totalItems}</span>
        </div>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                {["Pago", "Cliente", "Pedido", "Monto", "Método", "Estado", "Conciliación", "Referencia", "Fecha", "Acciones"].map((heading) => (
                  <th key={heading} className="px-3 py-3 font-medium">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {page.items.map((item) => (
                <PaymentRow key={item.id} item={item} onOpen={setDetailId} />
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-2 p-3 lg:hidden">
          {page.items.map((item) => (
            <button
              key={item.id}
              onClick={() => setDetailId(item.id)}
              className="rounded-lg border border-slate-200 p-3 text-left"
            >
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-bold text-blue-600">{paymentCode(item.id)}</p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {item.customerName} · {item.orderCode}
                  </p>
                </div>
                <strong className="text-xs text-slate-800">{money(item.currency, item.amount)}</strong>
              </div>
              <div className="mt-3 flex gap-1.5">
                <Badge value={item.status} />
                <Badge value={item.refundRequired ? "REFUND_REQUIRED" : item.reconciliation} />
              </div>
            </button>
          ))}
        </div>
        {page.items.length === 0 ? (
          <div className="border-t border-slate-100 p-10 text-center">
            <p className="text-sm font-bold text-slate-700">
              {page.totalItems ? "No hay pagos en esta página." : "No hay pagos con estos filtros."}
            </p>
          </div>
        ) : null}
        <Pager page={page.page} total={page.totalPages} query={queryString} />
      </section>

      <section className="space-y-3">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Gestión y conciliación</h2>
            <p className="text-xs text-slate-500">Revisa y resuelve las diferencias para mantener la contabilidad al día.</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {queuePills.map(([title, value, count]) => (
              <Link
                key={title}
                href={queueHref(value)}
                className={
                  (value ?? "") === activeQueue
                    ? "rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs"
                    : "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                }
              >
                {title} <span className="ml-1 text-[11px] text-current">{count}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {actionable.length ? (
            actionable.map((item) => <ReconciliationCard key={item.id} item={item} onOpen={setDetailId} />)
          ) : (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-400 sm:col-span-2 lg:col-span-4">
              No hay pagos pendientes de resolución.
            </p>
          )}
        </div>
      </section>

      <PaymentDrawer
        key={detailId ?? "closed"}
        paymentId={detailId}
        canManage={canManage}
        canRefund={canRefund}
        canManual={canManual}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}

function Badge({ value }: { value: string }) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium ${badgeStyle(value)} border`}>
      {label(value)}
    </span>
  );
}
function Select({
  name,
  title,
  values,
  query,
}: {
  name: string;
  title: string;
  values: string[];
  query: string;
}) {
  return (
    <select
      name={name}
      aria-label={title}
      defaultValue={new URLSearchParams(query).get(name) ?? ""}
      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
    >
      <option value="">{title}</option>
      {values.map((value) => (
        <option key={value} value={value}>
          {label(value)}
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
    <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
      {label}
      <input
        name={name}
        defaultValue={new URLSearchParams(query).get(name) ?? ""}
        placeholder={placeholder}
        className="h-10 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}
function FilterDate({ name, label, query }: { name: string; label: string; query: string }) {
  return (
    <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
      {label} <span className="text-[9px] font-semibold normal-case tracking-normal text-slate-500">(DD/MM/AAAA)</span>
      <input
        type="date"
        name={name}
        defaultValue={new URLSearchParams(query).get(name) ?? ""}
        aria-label={`${label}, formato DD/MM/AAAA`}
        title="Formato: DD/MM/AAAA"
        className="h-10 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700"
      />
    </label>
  );
}
function Pager({ page, total, query }: { page: number; total: number; query: string }) {
  const href = (value: number) => {
    const params = new URLSearchParams(query);
    params.set("page", String(value));
    return "/admin/pagos?" + params.toString();
  };
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row">
      <span className="text-xs text-slate-500">
        Página {page} de {total}
      </span>
      {total > 1 ? (
        <nav aria-label="Paginación de pagos" className="flex items-center gap-1">
          <Link href={href(Math.max(1, page - 1))} className="rounded p-1 text-slate-500 hover:text-slate-700" aria-label="Página anterior">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          {pageNumbers(page, total).map((value) => (
            <Link
              key={value}
              href={href(value)}
              aria-current={value === page ? "page" : undefined}
              className={
                value === page
                  ? "flex h-6 w-6 items-center justify-center rounded bg-blue-600 text-xs font-semibold text-white"
                  : "flex h-6 w-6 items-center justify-center rounded text-xs text-slate-600 hover:bg-slate-100"
              }
            >
              {value}
            </Link>
          ))}
          <Link href={href(Math.min(total, page + 1))} className="rounded p-1 text-slate-500 hover:text-slate-700" aria-label="Página siguiente">
            <ChevronRight className="h-4 w-4" />
          </Link>
        </nav>
      ) : null}
    </div>
  );
}
function reconciliationNote(item: PaymentListItem) {
  if (item.refundRequired) return "Aprobación tardía: reembolso pendiente";
  if (item.status === "REJECTED" || item.status === "ERROR") return "Rechazado por el proveedor";
  if (item.reconciliation === "UNDERPAID" || item.reconciliation === "OVERPAID") return "Monto no coincide con el pedido";
  return "Pendiente de confirmación";
}
function ReconciliationCard({ item, onOpen }: { item: PaymentListItem; onOpen: (id: string) => void }) {
  const refundRequired = item.refundRequired;
  const observed = item.status === "REJECTED" || item.status === "ERROR" || item.reconciliation === "UNDERPAID" || item.reconciliation === "OVERPAID";
  const accent = refundRequired ? "border-orange-200" : observed ? "border-red-200" : "border-amber-200";
  const badge = refundRequired ? "bg-orange-50 text-orange-700 border-orange-200" : observed ? "bg-red-50 text-red-600 border-red-200" : "bg-amber-50 text-amber-600 border-amber-200";
  const buttonColor = "bg-blue-600 hover:bg-blue-700";
  return (
    <div className={`flex flex-col justify-between rounded-xl border ${accent} bg-white p-4 shadow-2xs`}>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${badge} border`}>
            {refundRequired ? "Por reembolsar" : observed ? "Observado" : "Pendiente"}
          </span>
          <button type="button" onClick={() => onOpen(item.id)} aria-label={`Ver pago ${item.id}`} className="text-slate-400 hover:text-slate-600">
            <Eye className="h-4 w-4" />
          </button>
        </div>
        <h3 className="truncate font-mono text-sm font-bold text-slate-900">{paymentCode(item.id)}</h3>
        <p className="truncate text-xs font-medium text-slate-500">{item.customerName}</p>
        <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Monto</span>
            <span className="font-bold text-slate-800">{money(item.currency, item.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Referencia</span>
            <span className="max-w-48 truncate font-medium text-slate-700" title={item.providerReference ?? undefined}>{paymentReferenceLabel(item.providerReference)}</span>
          </div>
          {observed && Number(item.difference) !== 0 ? (
            <div className="flex justify-between font-medium text-red-600">
              <span>Diferencia</span>
              <span className="font-bold">{money(item.currency, item.difference)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-slate-100 pt-1.5">
            <span className="text-slate-400">Motivo</span>
            <span className="text-right font-medium text-slate-700">{reconciliationNote(item)}</span>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onOpen(item.id)}
        className={`mt-4 w-full rounded-lg py-2 text-xs font-semibold text-white shadow-2xs transition-colors ${buttonColor}`}
      >
        {refundRequired ? "Procesar reembolso" : observed ? "Resolver conciliación" : "Revisar pago"}
      </button>
    </div>
  );
}
function PaymentRow({ item, onOpen }: { item: PaymentListItem; onOpen: (id: string) => void }) {
  return (
    <tr className="text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50/60">
      <td className="px-3 py-3">
        <button onClick={() => onOpen(item.id)} className="font-mono font-bold text-blue-600 hover:underline">
          {paymentCode(item.id)}
        </button>
      </td>
      <td className="px-3 py-3 font-medium text-slate-800">
        <Link href={`/admin/clientes?customerId=${encodeURIComponent(item.customerId)}`} className="hover:text-blue-600 hover:underline">
          {item.customerName}
        </Link>
      </td>
      <td className="px-3 py-3">
        <Link
          href={`/admin/pedidos?orderId=${encodeURIComponent(item.orderId)}`}
          className="font-semibold text-blue-600 hover:underline"
        >
          {item.orderCode}
        </Link>
      </td>
      <td className="px-3 py-3 font-bold text-slate-900">{money(item.currency, item.amount)}</td>
      <td className="px-3 py-3">
        <span className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium ${methodStyle(item.method)} border`}>
          {paymentMethodLabel(item.method)}
        </span>
      </td>
      <td className="px-3 py-3">
        <Badge value={item.status} />
      </td>
      <td className="px-3 py-3">
        <Badge value={item.refundRequired ? "REFUND_REQUIRED" : item.reconciliation} />
      </td>
      <td className="max-w-32 truncate px-3 py-3" title={item.providerReference ?? undefined}>{paymentReferenceLabel(item.providerReference)}</td>
      <td className="px-3 py-3 text-slate-500">{limaDateTime(item.createdAt).split(",")[0]}</td>
      <td className="px-3 py-3">
        <button
          onClick={() => onOpen(item.id)}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label={"Ver pago " + item.id}
        >
          <Eye className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

function PaymentDrawer({
  paymentId,
  canManage,
  canRefund,
  canManual,
  onClose,
}: {
  paymentId: string | null;
  canManage: boolean;
  canRefund: boolean;
  canManual: boolean;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [tab, setTab] = useState("Resumen");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [refund, setRefund] = useState({ amount: "", reason: "" });
  const [refundAttempt, setRefundAttempt] = useState(0);
  const loadDetail = useCallback(async () => {
    if (!paymentId) return;
    setDetailLoading(true);
    try {
      const response = await fetch("/api/admin/pagos/" + encodeURIComponent(paymentId), {
        cache: "no-store",
      });
      const data = await parse(response);
      if (!response.ok || !data.payment || !data.order) {
        throw new Error(apiMessage(data, "No se pudo cargar el detalle del pago."));
      }
      setDetail(data as unknown as Detail);
      setDetailError(null);
    } catch (error) {
      setDetail(null);
      setDetailError(
        error instanceof Error ? error.message : "No se pudo cargar el detalle del pago.",
      );
      throw error;
    } finally {
      setDetailLoading(false);
    }
  }, [paymentId]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDetail().catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDetail]);
  const payment = detail?.payment;
  const currency = String(payment?.currency ?? "PEN");
  const refundable =
    ["CONFIRMED", "APPROVED"].includes(String(payment?.status)) &&
    (String(payment?.methodType) === "MANUAL" || Boolean(payment?.provider));
  const amountPending = Math.max(
    0,
    Number(detail?.reconciliation.expectedAmount ?? 0) -
      Number(detail?.reconciliation.netReceivedAmount ?? 0),
  ).toFixed(2);
  const orderStatus = String(detail?.order?.status ?? "");
  const orderClosed = ["CANCELLED", "DELIVERED"].includes(orderStatus);
  const providerPending =
    String(payment?.methodType) === "PROVIDER" &&
    ["PENDING", "UNDER_REVIEW"].includes(String(payment?.status));
  const manualPaymentBlockedReason = orderClosed
    ? "El pedido está cerrado; gestiona la devolución o el ajuste desde el flujo correspondiente."
    : providerPending
      ? "El pago del proveedor sigue pendiente; primero actualiza su estado."
      : null;
  const canConfirmManualPayment = Boolean(canManual && detail && Number(amountPending) > 0 && !orderClosed && !providerPending);
  const records =
    tab === "Intentos"
      ? (detail?.attempts ?? [])
      : tab === "Eventos"
        ? (detail?.events ?? [])
        : tab === "Reembolsos"
          ? (detail?.refunds ?? [])
          : (detail?.statusHistory ?? []);
  async function load() {
    await loadDetail();
  }
  async function updateProvider() {
    if (!paymentId) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(
        "/api/admin/pagos/" + encodeURIComponent(paymentId) + "/status",
        { method: "POST" },
      );
      const data = await parse(response);
      if (!response.ok) throw new Error(apiMessage(data, "No se pudo actualizar el proveedor."));
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo actualizar el proveedor.");
    } finally {
      setBusy(false);
    }
  }
  async function requestRefund() {
    if (!paymentId || !refund.reason.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(
        "/api/admin/pagos/" + encodeURIComponent(paymentId) + "/refund",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "Idempotency-Key": "refund-" + paymentId + "-" + (refund.amount || "full") + "-" + refundAttempt,
          },
          body: JSON.stringify({ amount: refund.amount || undefined, reason: refund.reason }),
        },
      );
      const data = await parse(response);
      if (!response.ok) throw new Error(apiMessage(data, "No se pudo solicitar el reembolso."));
      setRefund({ amount: "", reason: "" });
      setRefundAttempt(0);
      await load();
    } catch (error) {
      setRefundAttempt((value) => value + 1);
      setNotice(error instanceof Error ? error.message : "No se pudo solicitar el reembolso.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminDrawer
      open={Boolean(paymentId)}
      onClose={onClose}
      title="Detalle y conciliación"
      size="wide"
    >
      {detailError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p role="alert">{detailError}</p>
          <button
            type="button"
            onClick={() => void loadDetail().catch(() => undefined)}
            disabled={detailLoading}
            className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-bold text-red-800 disabled:opacity-50"
          >
            {detailLoading ? "Reintentando…" : "Reintentar"}
          </button>
        </div>
      ) : detailLoading || !detail ? (
        <div className="flex gap-2 text-sm text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Cargando pago…
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-4">
            {[
              ["Pago", paymentCode(String(payment?.id ?? ""))],
              ["Cliente", detail.customer.name],
              ["Pedido", detail.order.code],
              ["Estado", label(String(payment?.status))],
            ].map(([name, value]) => (
              <div key={String(name)} className="rounded-lg border border-slate-100 p-3">
                <p className="text-[10px] font-bold uppercase text-slate-400">{String(name)}</p>
                <p className="mt-1 truncate text-xs font-bold text-slate-800">{String(value)}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/clientes?customerId=${encodeURIComponent(String(detail.customer.id))}`} className="text-xs font-semibold text-blue-600 hover:underline">
              Ver cliente · {String(detail.customer.name)}
            </Link>
            <Link href={`/admin/pedidos?orderId=${encodeURIComponent(String(detail.order.id))}`} className="text-xs font-semibold text-blue-600 hover:underline">
              Ver pedido · {String(detail.order.code)}
            </Link>
            {detail.sale?.id ? (
              <Link href={`/admin/ventas?saleId=${encodeURIComponent(String(detail.sale.id))}`} className="text-xs font-semibold text-blue-600 hover:underline">
                Ver venta · {String(detail.sale.code ?? detail.sale.id)}
              </Link>
            ) : null}
          </div>
          <div
            className="flex flex-wrap gap-1 border-b border-slate-100 pb-2"
            role="tablist"
            aria-label="Secciones del pago"
          >
            {["Resumen", "Conciliación", "Intentos", "Eventos", "Reembolsos", "Historial"].map(
              (value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTab(value)}
                  aria-selected={tab === value}
                  role="tab"
                  className={
                    tab === value
                      ? "rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-600"
                      : "rounded-md px-2.5 py-1.5 text-xs font-bold text-slate-500"
                  }
                >
                  {value}
                </button>
              ),
            )}
          </div>
          {tab === "Conciliación" ? (
            <div className="grid gap-2 sm:grid-cols-5">
              {[
                ["Esperado", detail.reconciliation.expectedAmount],
                ["Recibido", detail.reconciliation.grossReceivedAmount],
                ["Reembolsado", detail.reconciliation.refundedAmount],
                ["Neto", detail.reconciliation.netReceivedAmount],
                ["Diferencia", detail.reconciliation.difference],
              ].map(([name, value]) => (
                <div key={String(name)} className="rounded-lg border border-slate-100 p-3">
                  <p className="text-[10px] text-slate-400">{String(name)}</p>
                  <p className="mt-1 text-xs font-bold text-slate-800">
                    {money(currency, String(value))}
                  </p>
                </div>
              ))}
            </div>
          ) : tab === "Resumen" ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600">
                {paymentMethodLabel(String(payment?.method ?? ""))} ·{" "}
                {payment?.provider ? paymentProviderLabel(String(payment.provider)) : "Manual"} · Referencia{" "}
                {paymentReferenceLabel(String(payment?.providerReference ?? ""))}
              </div>
              {canManage && payment?.provider && payment?.providerReference ? (
                <button
                  disabled={busy}
                  onClick={() => void updateProvider()}
                  className="rounded-lg border border-blue-600 px-3 py-2 text-xs font-bold text-blue-600"
                >
                  Actualizar estado
                </button>
              ) : null}
              {canConfirmManualPayment && detail ? (
                <ManualPaymentControl
                  orderId={String(detail.order.id)}
                  amount={amountPending}
                  currency={currency}
                  onConfirmed={() => load()}
                />
              ) : null}
              {canManual && detail && Number(amountPending) > 0 && manualPaymentBlockedReason ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] font-semibold text-amber-800">
                  {manualPaymentBlockedReason}
                </p>
              ) : null}
              {canRefund && refundable ? (
                <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-3">
                  <p className="text-[11px] font-bold text-orange-800">Devolución manual</p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Original {money(currency, String(payment?.amount ?? 0))} · El backend valida el
                    saldo realmente reembolsable.
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[150px_1fr]">
                    <input
                      value={refund.amount}
                      onChange={(event) => setRefund({ ...refund, amount: event.target.value })}
                      placeholder="Monto (vacío = total)"
                      className="h-9 rounded border border-orange-200 px-2 text-[10px]"
                    />
                    <input
                      value={refund.reason}
                      onChange={(event) => setRefund({ ...refund, reason: event.target.value })}
                      placeholder="Motivo obligatorio"
                      className="h-9 rounded border border-orange-200 px-2 text-[10px]"
                    />
                  </div>
                  <button
                    disabled={busy || !refund.reason.trim()}
                    onClick={() => void requestRefund()}
                    className="mt-2 rounded-lg border border-orange-500 px-3 py-2 text-xs font-bold text-orange-600 disabled:opacity-50"
                  >
                    Solicitar devolución
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-2">
              {records.length ? (
                records.map((row) => (
                  <div
                    key={String(row.id)}
                    className="rounded-lg border border-slate-100 p-3 text-[11px] text-slate-600"
                  >
                    {paymentHistoryLabel(row)} · {limaDateTime(row.createdAt)}
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-slate-200 p-3 text-[11px] text-slate-400">
                  Sin registros para esta sección.
                </p>
              )}
            </div>
          )}
          {notice ? (
            <p role="alert" className="text-xs font-bold text-red-600">
              {notice}
            </p>
          ) : null}
        </div>
      )}
    </AdminDrawer>
  );
}
