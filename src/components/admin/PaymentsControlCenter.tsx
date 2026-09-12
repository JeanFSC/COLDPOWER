"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  ChevronRight,
  Download,
  Filter,
  LoaderCircle,
  Search,
} from "lucide-react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { ManualPaymentControl } from "@/components/admin/ManualPaymentControl";
import type { PaymentListItem, PaymentsPageResponse } from "@/lib/payments-contract";

type Detail = {
  payment: Record<string, unknown>;
  order: Record<string, unknown>;
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
  ERROR: "Error",
  MATCH: "Conciliado",
  UNDERPAID: "Faltante",
  OVERPAID: "Sobrepago",
  TRANSFER: "Transferencia",
  CASH: "Efectivo",
  DEPOSIT: "Depósito",
  CARD: "Tarjeta",
  CREDIT_CARD: "Tarjeta de crédito",
  DEBIT_CARD: "Tarjeta de débito",
  YAPE: "Yape",
  PLIN: "Plin",
};
function label(value: string | null | undefined) {
  return value ? (labels[value] ?? value) : "N/D";
}
function money(currency: string, value: string | number) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency }).format(Number(value));
}
function paymentCode(id: string) {
  return "PAGO-" + (id.split("-").at(-1) ?? id.slice(-8)).toUpperCase();
}
function styleFor(value: string) {
  return value === "MATCH" || value === "CONFIRMED" || value === "APPROVED"
    ? "bg-[#e4f7ef] text-[#13885c]"
    : value === "UNDERPAID" || value === "OVERPAID" || value === "REJECTED" || value === "ERROR"
      ? "bg-[#fff0e8] text-[#d7641e]"
      : "bg-[#e8f1ff] text-[#2277ee]";
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

export function PaymentsControlCenter({
  page,
  queryString,
  canManage,
  canRefund,
  canManual,
}: {
  page: PaymentsPageResponse;
  queryString: string;
  canManage: boolean;
  canRefund: boolean;
  canManual: boolean;
}) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const confirmed =
    page.metrics.amountsByCurrency
      .map((row) => row.currency + " " + money(row.currency, row.net))
      .join(" · ") || "N/D";
  const metrics: Array<[string, string, string]> = [
    ["Monto confirmado", confirmed, "Neto de reembolsos exitosos"],
    ["Órdenes conciliadas", String(page.metrics.reconciledOrders), "Conciliación por orden"],
    ["Pendientes", String(page.metrics.pending), "Pendiente o en revisión"],
    ["Observados", String(page.metrics.observed), "Diferencia, rechazo o error"],
    [
      "Tasa de conciliación",
      page.metrics.reconciliationRate == null
        ? "N/D"
        : String(page.metrics.reconciliationRate) + "%",
      String(page.metrics.ordersWithConfirmedPayments) + " órdenes con pago neto",
    ],
  ];
  const queues: Array<[string, PaymentListItem[]]> = [
    ["Pendientes", page.queues.pending],
    ["Con diferencia", page.queues.difference],
    ["Errores de proveedor", page.queues.providerErrors],
    ["Reembolsos", page.queues.refunds],
  ];
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[27px] font-black tracking-tight text-[#102a43]">
            Gestión de pagos
          </h1>
          <p className="mt-1 text-[11px] font-semibold text-[#71869c]">
            Administra, revisa y concilia los pagos recibidos.
          </p>
        </div>
        <Link
          href={"/api/admin/pagos/export?" + queryString}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dce6ee] bg-white px-3.5 text-[10px] font-extrabold text-[#304b66]"
        >
          <Download className="h-4 w-4" />
          Exportar reporte
        </Link>
      </header>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map(([title, value, note], index) => (
          <article
            key={title}
            className="min-h-[118px] rounded-xl border border-[#e2eaf1] bg-white p-3.5 shadow-[0_1px_3px_rgba(16,42,67,0.035)]"
          >
            <div className="flex gap-2.5">
              <span
                className={
                  index === 3
                    ? "inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#fff0e8] text-[#d7641e]"
                    : "inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#e8f1ff] text-[#2277ee]"
                }
              >
                {index === 3 ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <BadgeCheck className="h-4 w-4" />
                )}
              </span>
              <div>
                <p className="text-[10px] font-semibold text-[#7d91a5]">{title}</p>
                <p className="mt-1 text-[17px] font-black text-[#102a43]">{value}</p>
                <p className="mt-1 text-[9px] font-bold text-[#71869c]">{note}</p>
              </div>
            </div>
          </article>
        ))}
      </section>
      <section className="grid gap-3 rounded-xl border border-[#e2eaf1] bg-white p-4 shadow-[0_1px_3px_rgba(16,42,67,0.035)] md:grid-cols-2">
        <Breakdown
          title="Estado de pagos"
          rows={page.metrics.statusBreakdown.map(
            (row) => [label(row.status), row.count] as [string, number],
          )}
        />
        <Breakdown
          title="Métodos de pago"
          rows={page.metrics.methodBreakdown.map(
            (row) => [label(row.method), row.count] as [string, number],
          )}
        />
      </section>
      <form
        action="/admin/pagos"
        className="flex flex-wrap gap-2 rounded-xl border border-[#e2eaf1] bg-white p-2.5 shadow-[0_1px_3px_rgba(16,42,67,0.035)]"
      >
        <label className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-[#dce6ee] px-3">
          <Search className="h-4 w-4 text-[#71869c]" />
          <input
            name="query"
            defaultValue={new URLSearchParams(queryString).get("query") ?? ""}
            placeholder="Buscar pago, pedido, cliente o referencia..."
            className="w-full bg-transparent text-[11px] font-semibold outline-none placeholder:text-[#9aabba]"
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
          <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-[#dce6ee] px-3 text-[10px] font-extrabold text-[#304b66]">
            <Filter className="h-3.5 w-3.5" />
            Más filtros
          </summary>
          <div className="absolute right-0 z-30 mt-2 grid w-[min(92vw,620px)] gap-3 rounded-xl border border-[#dce6ee] bg-white p-4 shadow-2xl sm:grid-cols-2">
            <Select name="provider" title="Proveedor" values={page.facets.providers} query={queryString} />
            <Select name="methodType" title="Tipo de método" values={["MANUAL", "PROVIDER"]} query={queryString} />
            <FilterText name="customer" label="Cliente" query={queryString} placeholder="Nombre del cliente" />
            <FilterText name="order" label="Pedido" query={queryString} placeholder="Código o ID del pedido" />
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
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="bg-[#fbfcfd] text-[8px] font-extrabold uppercase tracking-wide text-[#7890a7]">
              <tr>
                {[
                  "Pago",
                  "Cliente",
                  "Pedido",
                  "Monto",
                  "Método",
                  "Estado",
                  "Conciliación",
                  "Referencia",
                  "Fecha",
                  "",
                ].map((heading) => (
                  <th key={heading} className="px-3 py-3">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
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
              className="rounded-lg border border-[#e4edf4] p-3 text-left"
            >
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-extrabold text-[#2277ee]">
                    {paymentCode(item.id)}
                  </p>
                  <p className="mt-1 text-[10px] text-[#526b84]">
                    {item.customerName} · {item.orderCode}
                  </p>
                </div>
                <strong className="text-xs text-[#173654]">
                  {money(item.currency, item.amount)}
                </strong>
              </div>
              <div className="mt-3 flex gap-1.5">
                <Badge value={item.status} />
                <Badge value={item.reconciliation} />
              </div>
            </button>
          ))}
        </div>
        {page.items.length === 0 ? (
          <div className="border-t border-[#edf2f6] p-10 text-center">
            <p className="text-sm font-extrabold text-[#304b66]">
              {page.totalItems ? "No hay pagos en esta página." : "No hay pagos con estos filtros."}
            </p>
          </div>
        ) : null}
        <Pager page={page.page} total={page.totalPages} query={queryString} />
      </section>
      <section>
        <h2 className="text-[15px] font-extrabold text-[#102a43]">Cola de conciliación</h2>
        <p className="mt-1 text-[10px] font-semibold text-[#8296a9]">
          Solo casos accionables: pendientes, diferencias, errores y reembolsos.
        </p>
        <div className="mt-3 grid gap-3 lg:grid-cols-4">
          {queues.map(([title, rows]) => (
            <Queue key={title} title={title} rows={rows} onOpen={setDetailId} />
          ))}
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
    <span
      className={"inline-flex rounded-md px-2 py-1 text-[8px] font-extrabold " + styleFor(value)}
    >
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
      className="h-10 rounded-lg border border-[#dce6ee] bg-white px-3 text-[10px] font-extrabold text-[#304b66]"
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
function Breakdown({ title, rows }: { title: string; rows: Array<[string, number]> }) {
  const total = Math.max(
    1,
    rows.reduce((sum, [, value]) => sum + value, 0),
  );
  return (
    <section className="border-b border-[#edf2f6] pb-3 last:border-b-0 md:border-b-0 md:first:border-r md:first:pr-4">
      <h3 className="text-[12px] font-extrabold text-[#173654]">{title}</h3>
      <div className="mt-3 grid gap-2">
        {rows.slice(0, 4).map(([name, value]) => (
          <div key={name}>
            <div className="flex justify-between text-[10px]">
              <span className="text-[#71869c]">{name}</span>
              <strong className="text-[#304b66]">{value}</strong>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-[#edf2f6]">
              <span
                className="block h-full rounded-full bg-[#2277ee]"
                style={{ width: String((value / total) * 100) + "%" }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
function Pager({ page, total, query }: { page: number; total: number; query: string }) {
  const href = (value: number) => {
    const params = new URLSearchParams(query);
    params.set("page", String(value));
    return "/admin/pagos?" + params.toString();
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
  rows: PaymentListItem[];
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
              className="rounded-lg border border-[#edf2f6] p-2.5 text-left hover:bg-[#f8fbfe]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-mono text-[10px] font-extrabold text-[#2277ee]">
                    {paymentCode(row.id)}
                  </p>
                  <p className="mt-1 truncate text-[9px] text-[#71869c]">
                    {row.customerName} · {row.orderCode}
                  </p>
                </div>
                <Badge value={title === "Con diferencia" ? row.reconciliation : row.status} />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[9px]">
                <span className="text-[#8296a9]">Esperado<strong className="mt-0.5 block text-[#526b84]">{money(row.currency, row.expectedAmount)}</strong></span>
                <span className="text-[#8296a9]">Neto<strong className="mt-0.5 block text-[#526b84]">{money(row.currency, row.netReceivedAmount)}</strong></span>
                <span className="text-[#8296a9]">Diferencia<strong className="mt-0.5 block text-[#526b84]">{money(row.currency, row.difference)}</strong></span>
              </div>
            </button>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-[#dce6ee] p-3 text-[10px] text-[#8296a9]">
            Sin casos en esta cola.
          </p>
        )}
      </div>
      <Link href="/admin/pagos" className="mt-3 inline-flex text-[10px] font-extrabold text-[#2277ee]">
        Ver todos
      </Link>
    </section>
  );
}
function PaymentRow({ item, onOpen }: { item: PaymentListItem; onOpen: (id: string) => void }) {
  return (
    <tr className="border-t border-[#edf2f6] text-[10px] font-semibold text-[#526b84] hover:bg-[#fbfdff]">
      <td className="px-3 py-3">
        <button onClick={() => onOpen(item.id)} className="font-mono font-extrabold text-[#2277ee]">
          {paymentCode(item.id)}
        </button>
      </td>
      <td className="px-3 py-3">{item.customerName}</td>
      <td className="px-3 py-3">
        <Link
          href={"/admin/pedidos?query=" + encodeURIComponent(item.orderCode)}
          className="font-extrabold text-[#2277ee]"
        >
          {item.orderCode}
        </Link>
      </td>
      <td className="px-3 py-3 font-extrabold text-[#173654]">
        {money(item.currency, item.amount)}
      </td>
      <td className="px-3 py-3">{label(item.method)}</td>
      <td className="px-3 py-3">
        <Badge value={item.status} />
      </td>
      <td className="px-3 py-3">
        <Badge value={item.reconciliation} />
      </td>
      <td className="max-w-32 truncate px-3 py-3">{item.providerReference ?? "N/D"}</td>
      <td className="px-3 py-3">{new Date(item.createdAt).toLocaleDateString("es-PE")}</td>
      <td className="px-3 py-3">
        <button
          onClick={() => onOpen(item.id)}
          className="rounded p-1 text-[#526b84] hover:bg-[#edf4fa]"
          aria-label={"Ver pago " + item.id}
        >
          <ChevronRight className="h-4 w-4" />
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
    String(payment?.status) === "CONFIRMED" || String(payment?.status) === "APPROVED";
  const amountPending = Math.max(
    0,
    Number(detail?.reconciliation.expectedAmount ?? 0) -
      Number(detail?.reconciliation.netReceivedAmount ?? 0),
  ).toFixed(2);
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
            "Idempotency-Key": "refund-" + paymentId + "-" + (refund.amount || "full"),
          },
          body: JSON.stringify({ amount: refund.amount || undefined, reason: refund.reason }),
        },
      );
      const data = await parse(response);
      if (!response.ok) throw new Error(apiMessage(data, "No se pudo solicitar el reembolso."));
      setRefund({ amount: "", reason: "" });
      await load();
    } catch (error) {
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
            className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 text-[10px] font-extrabold text-red-800 disabled:opacity-50"
          >
            {detailLoading ? "Reintentando…" : "Reintentar"}
          </button>
        </div>
      ) : detailLoading || !detail ? (
        <div className="flex gap-2 text-sm text-[#71869c]">
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
                      ? "rounded-md bg-[#e8f1ff] px-2.5 py-1.5 text-[10px] font-extrabold text-[#2277ee]"
                      : "rounded-md px-2.5 py-1.5 text-[10px] font-extrabold text-[#71869c]"
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
                <div key={String(name)} className="rounded-lg border border-[#edf2f6] p-3">
                  <p className="text-[9px] text-[#71869c]">{String(name)}</p>
                  <p className="mt-1 text-xs font-extrabold text-[#173654]">
                    {money(currency, String(value))}
                  </p>
                </div>
              ))}
            </div>
          ) : tab === "Resumen" ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-[#f7fbff] p-3 text-[10px] text-[#526b84]">
                {label(String(payment?.method))} ·{" "}
                {payment?.provider ? String(payment.provider) : "Manual"} · Referencia{" "}
                {String(payment?.providerReference ?? "N/D")}
              </div>
              {canManage && payment?.provider && payment?.providerReference ? (
                <button
                  disabled={busy}
                  onClick={() => void updateProvider()}
                  className="rounded-lg border border-[#2277ee] px-3 py-2 text-[10px] font-extrabold text-[#2277ee]"
                >
                  Actualizar estado
                </button>
              ) : null}
              {canManual && detail && Number(amountPending) > 0 ? (
                <ManualPaymentControl
                  orderId={String(detail.order.id)}
                  amount={amountPending}
                  currency={currency}
                  onConfirmed={() => load()}
                />
              ) : null}
              {canRefund && refundable ? (
                <div className="rounded-xl border border-[#f4d3bd] bg-[#fffaf6] p-3">
                  <p className="text-[11px] font-extrabold text-[#8a4b20]">Reembolso</p>
                  <p className="mt-1 text-[10px] text-[#71869c]">
                    Original {money(currency, String(payment?.amount ?? 0))} · El backend valida el
                    saldo realmente reembolsable.
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[150px_1fr]">
                    <input
                      value={refund.amount}
                      onChange={(event) => setRefund({ ...refund, amount: event.target.value })}
                      placeholder="Monto (vacío = total)"
                      className="h-9 rounded border border-[#e8d5c6] px-2 text-[10px]"
                    />
                    <input
                      value={refund.reason}
                      onChange={(event) => setRefund({ ...refund, reason: event.target.value })}
                      placeholder="Motivo obligatorio"
                      className="h-9 rounded border border-[#e8d5c6] px-2 text-[10px]"
                    />
                  </div>
                  <button
                    disabled={busy || !refund.reason.trim()}
                    onClick={() => void requestRefund()}
                    className="mt-2 rounded-lg border border-[#d7641e] px-3 py-2 text-[10px] font-extrabold text-[#d7641e]"
                  >
                    Solicitar reembolso
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
                    className="rounded-lg border border-[#edf2f6] p-3 text-[10px] text-[#526b84]"
                  >
                    {String(row.status ?? row.eventType ?? row.result ?? "Registro")} ·{" "}
                    {new Date(String(row.createdAt)).toLocaleString("es-PE")}
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-[#dce6ee] p-3 text-[10px] text-[#8296a9]">
                  Sin registros para esta sección.
                </p>
              )}
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
