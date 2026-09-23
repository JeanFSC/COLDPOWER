"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  Filter,
  Mail,
  MoreHorizontal,
  PackageSearch,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  ShoppingCart,
  X,
} from "lucide-react";
import { Button } from "@/components/shared/Button";
import { QuoteConversionControl } from "@/components/admin/QuoteConversionControl";
import {
  quoteCurrencyLabel,
  type QuoteListItem,
  type QuotePageResponse,
} from "@/lib/quote-contract";
import { quoteStatusLabels, type QuoteDisplayStatus } from "@/lib/quote-workflow";

type Props = {
  page: QuotePageResponse;
  permissions: string[];
  queryString: string;
  exportHref: string;
  opportunityId?: string;
  customerId?: string;
};
type DetailLine = {
  productId: string;
  skuSnapshot: string;
  productNameSnapshot: string;
  quantity: number;
  baseUnitPrice: string | null;
  discountPercentage: string | null;
  discountAmount: string | null;
  finalUnitPrice: string | null;
  lineTotal: string | null;
  currency: string | null;
  discountStatus?: string;
};
type Detail = {
  quote: {
    id: string;
    trackingCode: string;
    name: string;
    customerType: string;
    documentNumber: string;
    phone: string;
    email: string | null;
    message: string;
    workflowStatus: string;
    normalizedWorkflowStatus?: string;
    currentVersionNumber: number;
    currency: string | null;
    subtotal: string | null;
    discountAmount: string | null;
    taxAmount: string | null;
    total: string | null;
    taxMode: string;
    validUntil: string | null;
    sentAt: string | null;
    acceptedVersionId: string | null;
    acceptanceNote: string | null;
    responseNote: string | null;
    cancellationReason: string | null;
    createdAt: string;
    updatedAt: string;
  };
  items: DetailLine[];
  history: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    changedBy: string;
    createdAt: string;
  }>;
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    documentNumber: string | null;
    address: string | null;
  } | null;
  opportunity: {
    id: string;
    code: string;
    stage: string;
    nextAction: string | null;
    followUpAt: string | null;
  } | null;
  seller: { id: string; name: string | null; email: string | null } | null;
  activities: Array<{
    id: string;
    type: string;
    subject: string;
    body: string | null;
    createdAt: string;
  }>;
  followUps: Array<{ id: string; title: string; dueAt: string; status: string }>;
  stageHistory: Array<{
    id: string;
    fromStage: string | null;
    toStage: string;
    note: string | null;
    createdAt: string;
  }>;
  versions: Array<{
    id: string;
    versionNumber: number;
    status: string;
    currency: string | null;
    subtotal: string | null;
    discountAmount: string | null;
    taxAmount: string | null;
    total: string | null;
    validUntil: string | null;
    createdAt: string;
    items: DetailLine[];
  }>;
  acceptedVersion: { id: string; versionNumber: number; status: string } | null;
  discountApprovals: Array<{
    id: string;
    quoteItemId: string | null;
    percentage: string;
    amount: string;
    reason: string;
    status: string;
    note: string | null;
    createdAt: string;
  }>;
  commercial: {
    sale: { id: string; code: string } | null;
    order: { id: string; code: string } | null;
    payment: { id: string } | null;
  };
};
type DialogKind = "send" | "response" | "followUp" | "cancel" | null;
type CustomerOption = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  documentNumber: string | null;
};
type ProductOption = {
  productId: string;
  sku: string;
  productName: string;
  categoryName: string | null;
  familyName: string | null;
  brandName: string | null;
};
type DraftLine = { productId: string; sku: string; name: string; quantity: number };

function uniqueProductOptions(items: ProductOption[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.productId)) return false;
    seen.add(item.productId);
    return true;
  });
}

function readApiError(payload: unknown, fallback: string) {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
    if (typeof error === "object" && error !== null && "message" in error)
      return String((error as { message?: unknown }).message ?? fallback);
  }
  return fallback;
}
function dateLabel(value: string | Date | null | undefined, withTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : withTime
      ? date.toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })
      : date.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}
function amount(currency: string | null | undefined, value: string | number | null | undefined) {
  return value === null || value === undefined || value === ""
    ? "Por cotizar"
    : `${quoteCurrencyLabel(currency)} ${Number(value).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function acceptedValue(items: QuoteListItem[]) {
  const accepted = items.filter(
    (item) => item.workflowStatus === "ACCEPTED" && item.total !== null,
  );
  return accepted.length
    ? amount(
        accepted[0]?.currency,
        accepted.reduce((sum, item) => sum + Number(item.total ?? 0), 0),
      )
    : "Por cotizar";
}
function statusTone(status: string) {
  if (status === "ACCEPTED") return "border-emerald-600/25 bg-emerald-600/10 text-emerald-600";
  if (status === "REJECTED" || status === "EXPIRED" || status === "CANCELLED")
    return "border-rose-600/20 bg-rose-600/10 text-rose-600";
  if (status === "CONVERTED") return "border-blue-600/20 bg-blue-600/10 text-blue-600";
  if (status === "FOLLOW_UP") return "border-amber-600/25 bg-amber-600/10 text-[#a15c00]";
  return "border-[#dbe8f3] bg-[#f5f9fc] text-[#45627c]";
}
function statusLabel(status: string) {
  return status in quoteStatusLabels
    ? quoteStatusLabels[status as QuoteDisplayStatus]
    : "Estado no clasificado";
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${statusTone(status)}`}
    >
      {statusLabel(status)}
    </span>
  );
}
function IconBox({
  children,
  tone = "blue",
}: {
  children: React.ReactNode;
  tone?: "orange" | "yellow" | "green" | "purple" | "blue";
}) {
  const tones = {
    orange: "bg-[#fff1e6] text-[#ee7c24]",
    yellow: "bg-[#fff7df] text-[#dd9b13]",
    green: "bg-[#e8f8ef] text-[#21a05c]",
    purple: "bg-[#f2edff] text-[#7b59d6]",
    blue: "bg-[#eaf2ff] text-blue-600",
  };
  return (
    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function QuotesWorkspace({
  page,
  permissions,
  queryString,
  exportHref,
  opportunityId: initialOpportunityId,
  customerId: initialCustomerId,
}: Props) {
  const router = useRouter();
  const params = useMemo(() => new URLSearchParams(queryString), [queryString]);
  const opportunityId = initialOpportunityId ?? params.get("opportunityId");
  const customerId = initialCustomerId ?? params.get("customerId");
  const [search, setSearch] = useState(params.get("query") ?? "");
  const [detailId, setDetailId] = useState<string | null>(() => params.get("quoteId"));
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [drawerTab, setDrawerTab] = useState<
    "summary" | "pricing" | "activity" | "versions" | "history"
  >("summary");
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [newQuoteOpen, setNewQuoteOpen] = useState(
    Boolean(
      params.get("new") === "1" &&
      permissions.includes("quotes.create"),
    ),
  );
  const [notice, setNotice] = useState("");

  const can = (permission: string) => permissions.includes(permission);
  const pushParams = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page");
    router.push(`/admin/cotizaciones${next.toString() ? `?${next.toString()}` : ""}`);
  };
  const openDetail = async (id: string) => {
    setDetailId(id);
    setDrawerTab("summary");
    setDetail(null);
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/admin/cotizaciones/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(readApiError(payload, "No se pudo cargar la cotización."));
      setDetail(payload.data ?? payload);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo cargar la cotización.");
    } finally {
      setDetailLoading(false);
    }
  };
  const closeDetail = () => {
    setDetailId(null);
    setDetail(null);
    setDialog(null);
    setActionError("");
  };
  const performAction = async (path: string, method: "POST" | "PATCH", body: Record<string, unknown>, success: string) => {
    if (!detailId) return;
    setActionBusy(true);
    setActionError("");
    try {
      const endpoint = method === "PATCH"
        ? `/api/admin/cotizaciones/${encodeURIComponent(detailId)}`
        : `/api/admin/cotizaciones${path}`;
      const response = await fetch(
        endpoint,
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(method === "POST" ? { ...body, quoteId: detailId } : body),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readApiError(payload, "No se pudo guardar la acción."));
      setDialog(null);
      setNotice(success);
      await openDetail(detailId);
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "No se pudo guardar la acción.");
    } finally {
      setActionBusy(false);
    }
  };
  const createVersion = async () => {
    await performAction("/version", "POST", {}, "Nueva versión abierta para edición.");
  };

  const approveDiscount = async (approvalId: string, approved: boolean) => {
    if (!detailId) return;
    setActionBusy(true);
    setActionError("");
    try {
      const response = await fetch("/api/admin/cotizaciones/discount", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, approved }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readApiError(payload, "No se pudo actualizar el descuento."));
      setNotice(approved ? "Descuento aprobado." : "Descuento rechazado.");
      await openDetail(detailId);
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "No se pudo actualizar el descuento.");
    } finally {
      setActionBusy(false);
    }
  };

  useEffect(() => {
    const quoteId = params.get("quoteId");
    if (!quoteId || detail) return;
    const timer = window.setTimeout(() => {
      void openDetail(quoteId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [params, detail]);

  useEffect(() => {
    if (!detailId) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [detailId]);
  const flow = [
    { key: "DRAFT", label: "Borradores", count: page.summary.draft },
    { key: "SENT", label: "Enviadas", count: page.summary.sent },
    { key: "FOLLOW_UP", label: "Seguimiento", count: page.summary.followUp },
    { key: "ACCEPTED", label: "Aceptadas", count: page.summary.accepted },
    { key: "CONVERTED", label: "Convertidas", count: page.summary.converted },
  ];
  const upcomingExpirations = page.items
    .filter(
      (item) =>
        item.validUntil &&
        ["SENT", "FOLLOW_UP"].includes(item.workflowStatus) &&
        new Date(item.validUntil).getTime() >= new Date().getTime(),
    )
    .sort((a, b) => new Date(a.validUntil!).getTime() - new Date(b.validUntil!).getTime())
    .slice(0, 5);
  return (
    <main className="min-h-full bg-[#f7fafc] px-4 pb-12 pt-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1550px]">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-blue-600">
              Operaciones comerciales
            </p>
            <h1 className="mt-2 font-display text-3xl font-black tracking-[-0.03em] text-slate-900 sm:text-[36px]">
              Gestión de cotizaciones
            </h1>
            <p className="mt-2 text-sm text-[#71869b]">
              Controla propuestas, respuestas y conversiones con trazabilidad completa.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={exportHref}
              className="inline-flex h-11 items-center gap-2 rounded-pill border border-[#d8e4ee] bg-white px-4 text-sm font-bold text-slate-900 hover:border-blue-600"
            >
              <Download size={16} /> Exportar
            </a>
            {can("quotes.create") ? (
              <button
                type="button"
                onClick={() => setNewQuoteOpen(true)}
                className="inline-flex h-11 items-center gap-2 rounded-pill bg-blue-600 px-4 text-sm font-bold text-white shadow-xs shadow-blue-500/25 transition-colors hover:bg-blue-700"
              >
                <Plus size={17} /> Nueva cotización
              </button>
            ) : null}
          </div>
        </div>
        <section
          aria-label="Indicadores de cotizaciones"
          className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <KpiCard
            label="Cotizaciones abiertas"
            value={page.metrics.open}
            note="Borradores, enviadas, seguimiento y aceptadas"
            icon={<FileText size={19} />}
            tone="orange"
            onClick={() => pushParams({ status: "open" })}
          />
          <KpiCard
            label="Borradores"
            value={page.metrics.pending}
            note="Pendientes de enviar al cliente"
            icon={<Clock3 size={19} />}
            tone="yellow"
            onClick={() => pushParams({ workflowStatus: "DRAFT" })}
          />
          <KpiCard
            label="Aceptadas"
            value={page.metrics.accepted}
            note="Listas para convertir en venta"
            icon={<Check size={19} />}
            tone="green"
            onClick={() => pushParams({ workflowStatus: "ACCEPTED" })}
          />
          <KpiCard
            label="Tasa de conversión"
            value={
              page.metrics.conversionRate === null
                ? "N/D"
                : `${page.metrics.conversionRate.toFixed(1)}%`
            }
            note={
              page.metrics.conversionRate === null
                ? "Sin cierres suficientes"
                : "Convertidas / cerradas con resultado"
            }
            title="Porcentaje de cotizaciones con resultado comercial definido que terminaron convirtiéndose en venta. Las cancelaciones administrativas no se incluyen."
            icon={<ShoppingCart size={19} />}
            tone="purple"
            onClick={() => pushParams({ workflowStatus: "CONVERTED" })}
          />
        </section>
        <form
          className="mt-6 flex flex-col gap-3 rounded-2xl border border-[#dde8f1] bg-white p-3 shadow-[0_6px_22px_rgba(16,42,67,0.04)] lg:flex-row lg:items-center"
          onSubmit={(event) => {
            event.preventDefault();
            pushParams({ query: search.trim() || null });
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#91a5b7]" size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 w-full rounded-xl border border-[#e2ebf2] bg-[#fbfdff] pl-10 pr-3 text-sm outline-none placeholder:text-[#9aaebe] focus:border-blue-600"
              placeholder="Buscar por código, cliente, SKU, modelo o correo…"
              aria-label="Buscar cotizaciones"
            />
          </div>
          <select
            aria-label="Filtrar por estado"
            value={
              params.get("workflowStatus") ??
              (params.get("status") === "open" ? "" : (params.get("status") ?? ""))
            }
            onChange={(event) =>
              pushParams({ workflowStatus: event.target.value || null, status: null })
            }
            className="h-11 rounded-xl border border-[#e2ebf2] bg-white px-3 text-sm font-semibold text-slate-900"
          >
            <option value="">Estado: Todos</option>
            {(
              [
                "DRAFT",
                "SENT",
                "FOLLOW_UP",
                "ACCEPTED",
                "REJECTED",
                "EXPIRED",
                "CONVERTED",
                "CANCELLED",
              ] as const
            ).map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar por vigencia"
            value={params.get("validity") ?? ""}
            onChange={(event) => pushParams({ validity: event.target.value || null })}
            className="h-11 rounded-xl border border-[#e2ebf2] bg-white px-3 text-sm font-semibold text-slate-900"
          >
            <option value="">Fecha: Todos</option>
            <option value="today">Vence hoy</option>
            <option value="3d">Próximos 3 días</option>
            <option value="7d">Próximos 7 días</option>
            <option value="expired">Vencidas</option>
          </select>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#eef5ff] px-4 text-sm font-extrabold text-blue-600 hover:bg-[#e2efff]"
          >
            <Filter size={16} /> Aplicar
          </button>
          {params.toString() ? (
            <button
              type="button"
              onClick={() => router.push("/admin/cotizaciones")}
              className="h-11 rounded-xl px-3 text-sm font-bold text-[#71869b] hover:bg-[#f5f8fa]"
            >
              Limpiar
            </button>
          ) : null}
        </form>
        {notice ? (
          <div
            className="mt-4 flex items-center justify-between rounded-xl border border-emerald-600/20 bg-emerald-600/5 px-4 py-3 text-sm font-semibold text-emerald-600"
            role="status"
          >
            {notice}
            <button type="button" onClick={() => setNotice("")} aria-label="Cerrar aviso">
              <X size={16} />
            </button>
          </div>
        ) : null}
        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
          <section className="min-w-0 overflow-hidden rounded-2xl border border-[#dde8f1] bg-white shadow-[0_8px_26px_rgba(16,42,67,0.04)]">
            <div className="flex items-center justify-between border-b border-[#e7eef4] px-5 py-4">
              <div>
                <h2 className="font-display text-lg font-black text-slate-900">Bandeja comercial</h2>
                <p className="mt-1 text-xs text-[#8195a8]">
                  {page.totalItems} registros · ordenados por última actualización
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.refresh()}
                className="inline-flex items-center gap-2 rounded-lg border border-[#e2ebf2] px-3 py-2 text-xs font-bold text-[#577087] hover:border-blue-600"
              >
                <RefreshCw size={14} /> Actualizar
              </button>
            </div>
            <div className="hidden md:block">
              <table className="w-full text-left">
                <thead className="bg-[#fbfdff] text-[10px] font-extrabold uppercase tracking-[0.11em] text-[#8ca0b1]">
                  <tr>
                    <th className="px-5 py-3">Cotización</th>
                    <th className="px-3 py-3">Cliente</th>
                    <th className="px-3 py-3">Productos</th>
                    <th className="px-3 py-3 text-right">Importe</th>
                    <th className="px-3 py-3">Estado</th>
                    <th className="px-3 py-3">Vigencia</th>
                    <th className="px-3 py-3">Responsable</th>
                    <th className="px-3 py-3">Próxima acción</th>
                    <th className="px-3 py-3">Actualizada</th>
                    <th className="px-4 py-3" aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf2f6]">
                  {page.items.map((quote) => (
                    <QuoteTableRow key={quote.id} quote={quote} onOpen={openDetail} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 p-3 md:hidden">
              {page.items.map((quote) => (
                <QuoteMobileCard key={quote.id} quote={quote} onOpen={openDetail} />
              ))}
            </div>
            {page.items.length === 0 ? (
              <EmptyState onNew={can("quotes.create") ? () => setNewQuoteOpen(true) : undefined} />
            ) : null}
            <Pagination
              page={page.page}
              totalPages={page.totalPages}
              totalItems={page.totalItems}
              onChange={(next) => pushParams({ page: String(next) })}
            />
          </section>
          <aside className="grid content-start gap-5">
            <div className="rounded-2xl border border-[#dde8f1] bg-white p-5 shadow-[0_8px_26px_rgba(16,42,67,0.04)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-blue-600">
                    Resumen del flujo
                  </p>
                  <h2 className="mt-1 font-display text-xl font-black text-slate-900">
                    Estado de la cartera
                  </h2>
                </div>
                <IconBox tone="blue">
                  <FileText size={17} />
                </IconBox>
              </div>
              <div className="mt-5 grid gap-4">
                {flow.map((item, index) => (
                  <button
                    type="button"
                    key={item.key}
                    onClick={() => pushParams({ workflowStatus: item.key })}
                    className="group flex items-center gap-3 text-left"
                  >
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-full text-xs font-black ${index === 0 ? "bg-[#fff0e4] text-[#ec7a21]" : index === 4 ? "bg-[#e7f8ee] text-emerald-600" : "bg-[#edf4ff] text-blue-600"}`}
                    >
                      {item.count}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-slate-900 group-hover:text-blue-600">
                        {item.label}
                      </span>
                      <span className="block text-[11px] text-[#8aa0b2]">
                        {index < 3 ? "En proceso" : index === 3 ? "Decisión cliente" : "Resultado"}
                      </span>
                    </span>
                    <ArrowRight size={15} className="text-[#b1c0cc]" />
                  </button>
                ))}
              </div>
              <div className="mt-5 border-t border-[#edf2f6] pt-4">
                <div className="flex justify-between text-xs">
                  <span className="text-[#8195a8]">Valor aceptado</span>
                  <strong className="text-slate-900">{acceptedValue(page.items)}</strong>
                </div>
                <div className="mt-3 flex justify-between text-xs">
                  <span className="text-[#8195a8]">Seguimientos vencidos</span>
                  <strong className={page.summary.followUps.overdue ? "text-rose-600" : "text-slate-900"}>
                    {page.summary.followUps.overdue}
                  </strong>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-[#dde8f1] bg-white p-5 shadow-[0_8px_26px_rgba(16,42,67,0.04)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-blue-600">
                    Vigencia
                  </p>
                  <h2 className="mt-1 font-display text-xl font-black text-slate-900">
                    Vencimientos próximos
                  </h2>
                </div>
                <IconBox tone="yellow">
                  <Clock3 size={17} />
                </IconBox>
              </div>
              <div className="mt-4 grid gap-2">
                {upcomingExpirations.length ? (
                  upcomingExpirations.map((quote) => {
                    const daysLeft = Math.ceil(
                      (new Date(quote.validUntil!).getTime() - new Date().getTime()) / 86_400_000,
                    );
                    return (
                      <button
                        type="button"
                        key={quote.id}
                        onClick={() => openDetail(quote.id)}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[#edf2f6] px-3 py-2 text-left"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-bold text-slate-900">
                            {quote.name}
                          </span>
                          <span className="block text-[10px] text-[#8aa0b2]">
                            {quote.trackingCode} · {dateLabel(quote.validUntil)}
                          </span>
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${daysLeft <= 1 ? "bg-rose-50 text-rose-600" : daysLeft <= 3 ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-600"}`}
                        >
                          {daysLeft <= 0 ? "Hoy" : `${daysLeft} ${daysLeft === 1 ? "día" : "días"}`}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <p className="rounded-lg border border-dashed border-[#dde8f1] p-3 text-center text-xs text-[#8aa0b2]">
                    Sin vencimientos próximos.
                  </p>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-[#f4dfc8] bg-[#fffaf3] p-5">
              <div className="flex items-start gap-3">
                <IconBox tone="orange">
                  <BellRing size={17} />
                </IconBox>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#cc741f]">
                    Recomendación
                  </p>
                  <h2 className="mt-1 font-display text-lg font-black text-slate-900">
                    Próximas acciones
                  </h2>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#6f6257]">
                {page.summary.alerts[0]?.label ?? "No hay alertas operativas pendientes."}
              </p>
              <div className="mt-4 grid gap-2">
                {page.summary.alerts.slice(0, 3).map((alert) => (
                  <button
                    type="button"
                    key={alert.id}
                    onClick={() =>
                      alert.workflowStatus
                        ? pushParams({ workflowStatus: alert.workflowStatus })
                        : undefined
                    }
                    className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2 text-left text-xs font-bold text-[#705d4d]"
                  >
                    <span>{alert.label}</span>
                    <span className="rounded-full bg-[#fff0dc] px-2 py-0.5 text-[#cc741f]">
                      {alert.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
          <div className="rounded-2xl border border-[#dde8f1] bg-white p-5 shadow-[0_8px_26px_rgba(16,42,67,0.04)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-blue-600">
                  Operación diaria
                </p>
                <h2 className="mt-1 font-display text-xl font-black text-slate-900">
                  Ruta de una cotización
                </h2>
              </div>
              <span className="text-xs font-bold text-[#8aa0b2]">{page.summary.open} abiertas</span>
            </div>
            <div className="mt-6 grid gap-2 sm:grid-cols-5">
              {flow.map((item, index) => (
                <div key={item.key} className="relative">
                  <div className="flex items-center gap-2">
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-full text-xs font-black ${index === 4 ? "bg-emerald-600 text-white" : "bg-[#edf4ff] text-blue-600"}`}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-xs font-extrabold text-slate-900">{item.label}</p>
                      <p className="text-[11px] text-[#8aa0b2]">{item.count} registros</p>
                    </div>
                  </div>
                  {index < flow.length - 1 ? (
                    <span className="absolute left-10 right-[-8px] top-4 hidden h-px bg-[#dbe7f0] sm:block" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-[#d9e9f5] bg-[#f3f8fd] p-5">
            <div className="flex items-start gap-3">
              <IconBox tone="purple">
                <ShieldCheck size={17} />
              </IconBox>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#6f54c4]">
                  Guía rápida
                </p>
                <h2 className="mt-1 font-display text-lg font-black text-slate-900">Buenas prácticas</h2>
              </div>
            </div>
            <ul className="mt-4 grid gap-3 text-xs leading-5 text-[#617990]">
              <li className="flex gap-2">
                <Check size={15} className="mt-0.5 shrink-0 text-emerald-600" /> Enviar siempre una
                versión con vigencia y moneda definidas.
              </li>
              <li className="flex gap-2">
                <Check size={15} className="mt-0.5 shrink-0 text-emerald-600" /> Convertir sólo la
                versión que el cliente aceptó.
              </li>
              <li className="flex gap-2">
                <Check size={15} className="mt-0.5 shrink-0 text-emerald-600" /> Registrar respuesta y
                siguiente acción en CRM.
              </li>
            </ul>
          </div>
        </section>
      </div>
      {detailId ? (
        <DetailDrawer
          detail={detail}
          loading={detailLoading}
          tab={drawerTab}
          setTab={setDrawerTab}
          close={closeDetail}
          dialog={dialog}
          setDialog={setDialog}
          busy={actionBusy}
          error={actionError}
          setError={setActionError}
          performAction={performAction}
          createVersion={createVersion}
          approveDiscount={approveDiscount}
          can={can}
          onEdited={() => {
            router.refresh();
            void openDetail(detailId);
          }}
        />
      ) : null}
      {newQuoteOpen ? (
        <NewQuoteDrawer
          opportunityId={opportunityId}
          customerId={customerId}
          close={() => setNewQuoteOpen(false)}
          onSaved={() => {
            setNewQuoteOpen(false);
            router.refresh();
          }}
          can={can}
        />
      ) : null}
    </main>
  );
}

function KpiCard({
  label,
  value,
  note,
  icon,
  tone,
  onClick,
  title,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: React.ReactNode;
  tone: "orange" | "yellow" | "green" | "purple";
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="group rounded-2xl border border-[#dde8f1] bg-white p-5 text-left shadow-[0_8px_26px_rgba(16,42,67,0.04)] transition hover:-translate-y-0.5 hover:border-blue-600/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[#8195a8]">{label}</p>
          <p className="mt-2 font-display text-3xl font-black tracking-[-0.03em] text-slate-900">
            {value}
          </p>
        </div>
        <IconBox tone={tone}>{icon}</IconBox>
      </div>
      <p className="mt-4 text-[11px] leading-4 text-[#8aa0b2]">{note}</p>
    </button>
  );
}
function QuoteTableRow({ quote, onOpen }: { quote: QuoteListItem; onOpen: (id: string) => void }) {
  return (
    <tr className="group hover:bg-[#fbfdff]">
      <td className="px-5 py-4">
        <button type="button" onClick={() => onOpen(quote.id)} className="text-left">
          <span className="font-mono text-xs font-extrabold text-blue-600">
            {quote.trackingCode}
          </span>
          <span className="mt-1 block text-[11px] text-[#8aa0b2]">
            v{quote.currentVersion || 1} · {quote.preferredContact || "Contacto"}
          </span>
        </button>
      </td>
      <td className="px-3 py-4">
        <button type="button" onClick={() => onOpen(quote.id)} className="max-w-[160px] text-left">
          <span className="block truncate text-sm font-extrabold text-slate-900">{quote.name}</span>
          <span className="mt-1 block truncate text-[11px] text-[#8aa0b2]">
            {quote.email || quote.phone || "Sin contacto"}
          </span>
        </button>
      </td>
      <td className="px-3 py-4">
        <span className="block max-w-[190px] truncate text-xs font-semibold text-[#415d75]">
          {quote.itemsPreview[0]?.name || quote.productName || "Consulta general"}
        </span>
        <span className="mt-1 block text-[11px] text-[#8aa0b2]">
          {quote.itemCount} {quote.itemCount === 1 ? "producto" : "productos"}
        </span>
      </td>
      <td className="px-3 py-4 text-right">
        <span className="whitespace-nowrap text-sm font-black text-slate-900">
          {amount(quote.currency, quote.total)}
        </span>
        <span className="mt-1 block text-[10px] text-[#8aa0b2]">
          {quote.currency || "Moneda pendiente"}
        </span>
      </td>
      <td className="px-3 py-4">
        <StatusBadge status={quote.workflowStatus} />
      </td>
      <td className="px-3 py-4">
        <span
          className={`text-xs font-bold ${quote.validUntil && new Date(quote.validUntil) < new Date() && ["SENT", "FOLLOW_UP"].includes(quote.workflowStatus) ? "text-rose-600" : "text-[#536f87]"}`}
        >
          {quote.validUntil ? dateLabel(quote.validUntil) : "Por definir"}
        </span>
      </td>
      <td className="px-3 py-4">
        <span className="block max-w-[115px] truncate text-xs font-bold text-[#536f87]">
          {quote.seller?.name || "Sin asignar"}
        </span>
      </td>
      <td className="px-3 py-4">
        <span className="block max-w-[130px] truncate text-xs font-semibold text-[#536f87]">
          {quote.nextAction || (quote.workflowStatus === "ACCEPTED" ? "Convertir" : "Por definir")}
        </span>
      </td>
      <td className="px-3 py-4 whitespace-nowrap text-xs text-[#8195a8]">
        {dateLabel(quote.updatedAt)}
      </td>
      <td className="px-4 py-4">
        <button
          type="button"
          onClick={() => onOpen(quote.id)}
          aria-label={`Abrir ${quote.trackingCode}`}
          className="grid h-8 w-8 place-items-center rounded-lg text-[#91a5b7] hover:bg-[#eef5ff] hover:text-blue-600"
        >
          <MoreHorizontal size={17} />
        </button>
      </td>
    </tr>
  );
}
function QuoteMobileCard({
  quote,
  onOpen,
}: {
  quote: QuoteListItem;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(quote.id)}
      className="rounded-xl border border-[#e0eaf2] bg-white p-4 text-left shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-extrabold text-blue-600">{quote.trackingCode}</p>
          <p className="mt-1 text-sm font-black text-slate-900">{quote.name}</p>
        </div>
        <StatusBadge status={quote.workflowStatus} />
      </div>
      <p className="mt-3 truncate text-xs font-semibold text-[#536f87]">
        {quote.productName || quote.itemsPreview[0]?.name || "Consulta general"}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#edf2f6] pt-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[#8aa0b2]">Importe</p>
          <p className="mt-1 text-sm font-black text-slate-900">{amount(quote.currency, quote.total)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[#8aa0b2]">Actualizada</p>
          <p className="mt-1 text-xs font-bold text-[#536f87]">{dateLabel(quote.updatedAt)}</p>
        </div>
      </div>
    </button>
  );
}
function EmptyState({ onNew }: { onNew?: () => void }) {
  return (
    <div className="grid place-items-center px-6 py-14 text-center">
      <IconBox tone="blue">
        <FileText size={18} />
      </IconBox>
      <h3 className="mt-4 font-display text-lg font-black text-slate-900">
        No hay cotizaciones para estos filtros
      </h3>
      <p className="mt-2 max-w-sm text-sm text-[#8195a8]">
        Prueba otra búsqueda o crea una cotización cuando tengas un cliente y una necesidad
        comercial reales.
      </p>
      {onNew ? (
        <button
          type="button"
          onClick={onNew}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-pill bg-blue-600 px-4 text-sm font-bold text-white shadow-xs shadow-blue-500/25 transition-colors hover:bg-blue-700"
        >
          <Plus size={16} /> Nueva cotización
        </button>
      ) : null}
    </div>
  );
}
function Pagination({
  page,
  totalPages,
  totalItems,
  onChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onChange: (page: number) => void;
}) {
  if (totalItems === 0) return null;
  return (
    <div className="flex items-center justify-between border-t border-[#e7eef4] px-5 py-4">
      <p className="text-xs text-[#8195a8]">
        Página <strong className="text-slate-900">{page}</strong> de{" "}
        <strong className="text-slate-900">{totalPages}</strong>
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="grid h-8 w-8 place-items-center rounded-lg border border-[#dfe9f1] text-[#71869b] disabled:opacity-40"
        >
          <ChevronLeft size={15} />
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="grid h-8 w-8 place-items-center rounded-lg border border-[#dfe9f1] text-[#71869b] disabled:opacity-40"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

function DrawerShell({
  title,
  eyebrow,
  children,
  close,
  wide = false,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/35 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl ${wide ? "max-w-[760px]" : "max-w-[620px]"}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#e7eef4] px-5 py-5 sm:px-7">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-blue-600">
              {eyebrow}
            </p>
            <h2 className="mt-1 font-display text-2xl font-black tracking-[-0.03em] text-slate-900">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="grid h-9 w-9 place-items-center rounded-lg text-[#8195a8] hover:bg-[#f1f6fa] hover:text-slate-900"
            aria-label="Cerrar"
          >
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DetailDrawer({
  detail,
  loading,
  tab,
  setTab,
  close,
  dialog,
  setDialog,
  busy,
  error,
  setError,
  performAction,
  createVersion,
  approveDiscount,
  can,
  onEdited,
}: {
  detail: Detail | null;
  loading: boolean;
  tab: "summary" | "pricing" | "activity" | "versions" | "history";
  setTab: (tab: "summary" | "pricing" | "activity" | "versions" | "history") => void;
  close: () => void;
  dialog: DialogKind;
  setDialog: (dialog: DialogKind) => void;
  busy: boolean;
  error: string;
  setError: (error: string) => void;
  performAction: (path: string, method: "POST" | "PATCH", body: Record<string, unknown>, success: string) => Promise<void>;
  createVersion: () => Promise<void>;
  approveDiscount: (approvalId: string, approved: boolean) => Promise<void>;
  can: (permission: string) => boolean;
  onEdited: () => void;
}) {
  const [editing, setEditing] = useState(false);
  if (loading || !detail)
    return (
      <DrawerShell eyebrow="Cotización" title="Cargando detalle…" close={close}>
        <div className="grid flex-1 place-items-center text-sm text-[#8195a8]">
          <RefreshCw className="animate-spin" size={20} />
        </div>
      </DrawerShell>
    );
  const quote = detail.quote;
  const status = quote.normalizedWorkflowStatus || quote.workflowStatus;
  const tabs = [
    { key: "summary", label: "Resumen" },
    { key: "pricing", label: "Precios" },
    { key: "activity", label: "Actividad" },
    { key: "versions", label: "Versiones" },
    { key: "history", label: "Historial" },
  ] as const;
  return (
    <DrawerShell
      eyebrow={`${quote.trackingCode} · v${quote.currentVersionNumber || 1}`}
      title={quote.name}
      close={close}
      wide
    >
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7eef4] px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <StatusBadge status={status} />
            <span className="text-xs text-[#8195a8]">Actualizada {dateLabel(quote.updatedAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/api/admin/cotizaciones/${encodeURIComponent(quote.id)}/pdf`}
              className="inline-flex items-center gap-2 rounded-lg border border-[#dfe9f1] px-3 py-2 text-xs font-bold text-slate-900 hover:border-blue-600"
            >
              <Download size={14} /> PDF
            </a>
            {can("quotes.edit") && status === "DRAFT" ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-[#dfe9f1] px-3 py-2 text-xs font-bold text-slate-900 hover:border-blue-600"
              >
                <FileText size={14} /> Editar
              </button>
            ) : null}
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto border-b border-[#e7eef4] px-5 sm:px-7">
          {tabs.map((item) => (
            <button
              type="button"
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`whitespace-nowrap border-b-2 px-2 py-3 text-xs font-extrabold ${tab === item.key ? "border-blue-600 text-blue-600" : "border-transparent text-[#8195a8]"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="p-5 sm:p-7">
          {tab === "summary" ? (
            <SummaryTab detail={detail} />
          ) : tab === "pricing" ? (
            <PricingTab detail={detail} can={can} approveDiscount={approveDiscount} />
          ) : tab === "activity" ? (
            <ActivityTab detail={detail} />
          ) : tab === "versions" ? (
            <VersionsTab detail={detail} />
          ) : (
            <HistoryTab detail={detail} />
          )}
        </div>
      </div>
      <div className="border-t border-[#e7eef4] bg-[#fbfdff] p-4 sm:p-5">
        {error ? (
          <p
            className="mb-3 rounded-lg border border-rose-600/20 bg-rose-600/5 p-3 text-xs font-semibold text-rose-600"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {can("quotes.send") && (status === "DRAFT" || status === "FOLLOW_UP") ? (
            <Button
              size="sm"
              onClick={() => {
                setError("");
                setDialog("send");
              }}
            >
              <Send size={15} /> {status === "FOLLOW_UP" ? "Reenviar" : "Enviar"}
            </Button>
          ) : null}
          {can("quotes.edit") && (status === "SENT" || status === "FOLLOW_UP") ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setError("");
                  setDialog("response");
                }}
              >
                Registrar respuesta
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setError("");
                  setDialog("followUp");
                }}
              >
                <CalendarDays size={15} /> Seguimiento
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void createVersion()}
              >
                Nueva versión
              </Button>
            </>
          ) : null}
          {can("quotes.convert") && can("sales.manage") && status === "ACCEPTED" ? (
            <QuoteConversionControl
              quoteId={quote.id}
              status={status}
              acceptedVersionId={quote.acceptedVersionId}
            />
          ) : null}
          {can("quotes.edit") && ["DRAFT", "SENT", "FOLLOW_UP", "ACCEPTED"].includes(status) ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setError("");
                setDialog("cancel");
              }}
            >
              Cancelar
            </Button>
          ) : null}
        </div>
      </div>
      {dialog === "send" ? (
        <ActionDialog
          kind="send"
          close={() => setDialog(null)}
          busy={busy}
          error={error}
          onSubmit={(body) => performAction("/send", "POST", body, "Envío registrado y versionado.")}
        />
      ) : dialog === "response" ? (
        <ActionDialog
          kind="response"
          close={() => setDialog(null)}
          busy={busy}
          error={error}
          onSubmit={(body) =>
            performAction("/response", "POST", body, "Respuesta registrada en el historial.")
          }
        />
      ) : dialog === "followUp" ? (
        <ActionDialog
          kind="followUp"
          close={() => setDialog(null)}
          busy={busy}
          error={error}
          onSubmit={(body) => performAction("/follow-up", "POST", body, "Seguimiento creado en CRM.")}
        />
      ) : dialog === "cancel" ? (
        <ActionDialog
          kind="cancel"
          close={() => setDialog(null)}
          busy={busy}
          error={error}
          onSubmit={(body) =>
            performAction(
              "",
              "PATCH",
              { workflowStatus: "CANCELLED", reason: body.reason },
              "Cotización cancelada.",
            )
          }
        />
      ) : null}
      {editing ? (
        <EditQuoteDrawer
          detail={detail}
          close={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onEdited();
          }}
        />
      ) : null}
    </DrawerShell>
  );
}

function SummaryTab({ detail }: { detail: Detail }) {
  const quote = detail.quote;
  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Info label="Código" value={quote.trackingCode} mono />
        <Info label="Cliente" value={quote.name} />
        <Info label="Documento" value={quote.documentNumber || "Sin documento"} />
        <Info label="Contacto" value={quote.phone || quote.email || "Sin contacto"} />
        <Info label="Responsable" value={detail.seller?.name || "Sin asignar"} />
        <Info label="Vigencia" value={dateLabel(quote.validUntil)} />
      </div>
      <div className="flex flex-wrap gap-2">
        {detail.customer?.id ? (
          <Link href={`/admin/clientes?customerId=${encodeURIComponent(detail.customer.id)}`} className="text-xs font-bold text-blue-600 hover:underline">
            Ver cliente · {detail.customer.name}
          </Link>
        ) : null}
        {detail.opportunity?.id ? (
          <Link href={`/admin/crm?opportunityId=${encodeURIComponent(detail.opportunity.id)}`} className="text-xs font-bold text-blue-600 hover:underline">
            Ver oportunidad · {detail.opportunity.code}
          </Link>
        ) : null}
        {detail.commercial.sale?.id ? (
          <Link href={`/admin/ventas?saleId=${encodeURIComponent(detail.commercial.sale.id)}`} className="text-xs font-bold text-blue-600 hover:underline">
            Ver venta · {detail.commercial.sale.code}
          </Link>
        ) : null}
        {detail.commercial.order?.id ? (
          <Link href={`/admin/pedidos?orderId=${encodeURIComponent(detail.commercial.order.id)}`} className="text-xs font-bold text-blue-600 hover:underline">
            Ver pedido · {detail.commercial.order.code}
          </Link>
        ) : null}
        {detail.commercial.payment?.id ? (
          <Link href={`/admin/pagos?paymentId=${encodeURIComponent(detail.commercial.payment.id)}`} className="text-xs font-bold text-blue-600 hover:underline">
            Ver pago · {detail.commercial.payment.id}
          </Link>
        ) : null}
      </div>
      <div className="rounded-xl border border-[#e0eaf2] bg-[#fbfdff] p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900">Productos cotizados</h3>
          <span className="text-xs font-bold text-[#8195a8]">{detail.items.length} líneas</span>
        </div>
        <div className="mt-3 grid gap-2">
          {detail.items.length ? (
            detail.items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center justify-between gap-3 border-b border-[#edf2f6] py-2 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{item.productNameSnapshot}</p>
                  <p className="text-[11px] text-[#8195a8]">
                    {item.skuSnapshot} · x{item.quantity}
                  </p>
                </div>
                <p className="whitespace-nowrap text-sm font-black text-slate-900">
                  {amount(item.currency, item.lineTotal)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-[#8195a8]">Aún no hay productos.</p>
          )}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Subtotal" value={amount(quote.currency, quote.subtotal)} />
        <Metric label="Descuento" value={amount(quote.currency, quote.discountAmount)} />
        <Metric label="Total" value={amount(quote.currency, quote.total)} accent />
      </div>
      {quote.message ? (
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-[#8195a8]">
            Nota comercial
          </h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#536f87]">
            {quote.message}
          </p>
        </div>
      ) : null}
    </div>
  );
}
function PricingTab({
  detail,
  can,
  approveDiscount,
}: {
  detail: Detail;
  can: (permission: string) => boolean;
  approveDiscount: (approvalId: string, approved: boolean) => Promise<void>;
}) {
  const quote = detail.quote;
  const version =
    detail.versions.find((item) => item.id === quote.acceptedVersionId) || detail.versions[0];
  return (
    <div className="grid gap-5">
      <div className="rounded-xl border border-[#dceaf4] bg-[#f6fbff] p-4">
        <div className="flex items-center gap-3">
          <IconBox tone="blue">
            <ShieldCheck size={17} />
          </IconBox>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-blue-600">
              Snapshot comercial
            </p>
            <p className="mt-1 text-sm font-black text-slate-900">
              {version ? `Versión v${version.versionNumber}` : "Sin versión enviada"}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-[#657f96]">
          Los precios, descuentos, moneda y vigencia se congelan al enviar. La conversión no vuelve
          a aplicar promociones.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Info label="Moneda" value={quote.currency || "No definida"} />
        <Info
          label="Modo de impuesto"
          value={
            quote.taxMode === "INCLUDED"
              ? "Impuesto incluido"
              : quote.taxMode === "EXCLUDED"
                ? "Impuesto excluido"
                : "No configurado"
          }
        />
        <Info label="Fuente de precio" value="Precio vigente al versionar" />
        <Info label="Margen / costo" value="No visible en cotización pública" />
      </div>
      {detail.discountApprovals.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <p className="text-xs font-extrabold uppercase tracking-wide text-amber-700">
            Aprobaciones de descuento
          </p>
          <p className="mt-1 text-xs text-amber-800/80">
            El envío queda bloqueado mientras una aprobación permanezca pendiente.
          </p>
          <div className="mt-3 grid gap-2">
            {detail.discountApprovals.map((approval) => (
              <div key={approval.id} className="rounded-lg border border-amber-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {approval.percentage}% · {amount(quote.currency, approval.amount)}
                    </p>
                    <p className="mt-1 text-[11px] text-[#657f96]">
                      {approval.reason || "Sin motivo registrado"} · Estado: {approval.status}
                    </p>
                  </div>
                  {can("pricing.discount.approve") && approval.status === "PENDING" ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void approveDiscount(approval.id, true)}
                        className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700"
                      >
                        Aprobar
                      </button>
                      <button
                        type="button"
                        onClick={() => void approveDiscount(approval.id, false)}
                        className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-50"
                      >
                        Rechazar
                      </button>
                    </div>
                  ) : null}
                </div>
                {approval.note ? <p className="mt-2 text-[11px] text-[#536f87]">Nota: {approval.note}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {version ? (
        <div className="overflow-hidden rounded-xl border border-[#e0eaf2]">
          <div className="grid grid-cols-[1fr_75px_105px] gap-2 bg-[#fbfdff] px-3 py-3 text-[10px] font-extrabold uppercase tracking-wide text-[#8aa0b2]">
            <span>Producto</span>
            <span>Cant.</span>
            <span className="text-right">Total</span>
          </div>
          {version.items?.map((item) => (
            <div
              key={item.productId}
              className="grid grid-cols-[1fr_75px_105px] gap-2 border-t border-[#edf2f6] px-3 py-3 text-xs"
            >
              <span className="font-semibold text-slate-900">{item.skuSnapshot}</span>
              <span className="text-[#536f87]">{item.quantity}</span>
              <span className="text-right font-black text-slate-900">
                {amount(item.currency, item.lineTotal)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
function ActivityTab({ detail }: { detail: Detail }) {
  return (
    <div className="grid gap-4">
      {detail.activities.length || detail.followUps.length ? (
        <>
          {detail.followUps.map((item) => (
            <Timeline
              key={item.id}
              icon={<CalendarDays size={15} />}
              title={item.title}
              meta={`Seguimiento · ${dateLabel(item.dueAt, true)}`}
              body={`Estado: ${item.status}`}
            />
          ))}
          {detail.activities.map((item) => (
            <Timeline
              key={item.id}
              icon={
                item.type === "EMAIL" ? (
                  <Mail size={15} />
                ) : item.type === "CALL" ? (
                  <Phone size={15} />
                ) : (
                  <BellRing size={15} />
                )
              }
              title={item.subject}
              meta={`${item.type} · ${dateLabel(item.createdAt, true)}`}
              body={item.body}
            />
          ))}
        </>
      ) : (
        <EmptyInline text="No hay actividad registrada todavía." />
      )}
    </div>
  );
}
function VersionsTab({ detail }: { detail: Detail }) {
  return (
    <div className="grid gap-3">
      {detail.versions.length ? (
        detail.versions.map((version) => (
          <div key={version.id} className="rounded-xl border border-[#e0eaf2] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-900">Versión v{version.versionNumber}</p>
                <p className="mt-1 text-xs text-[#8195a8]">
                  Creada {dateLabel(version.createdAt, true)}
                </p>
              </div>
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${version.status === "ACCEPTED" ? "border-emerald-600/20 bg-emerald-600/10 text-emerald-600" : "border-[#dbe8f3] bg-[#f5f9fc] text-[#536f87]"}`}
              >
                {version.status === "ACCEPTED"
                  ? "Aceptada"
                  : version.status === "SENT"
                    ? "Enviada"
                    : version.status}
              </span>
            </div>
            <div className="mt-3 flex justify-between text-xs">
              <span className="text-[#8195a8]">
                {version.items?.length || 0} productos · {version.currency || "Moneda pendiente"}
              </span>
              <strong className="text-slate-900">{amount(version.currency, version.total)}</strong>
            </div>
          </div>
        ))
      ) : (
        <EmptyInline text="Las versiones se crean al enviar una cotización." />
      )}
    </div>
  );
}
function HistoryTab({ detail }: { detail: Detail }) {
  return (
    <div className="grid gap-3">
      {detail.history.length ? (
        detail.history.map((item) => (
          <Timeline
            key={item.id}
            icon={<Clock3 size={15} />}
            title={`${item.fromStatus ? statusLabel(item.fromStatus) : "Creada"} → ${statusLabel(item.toStatus)}`}
            meta={dateLabel(item.createdAt, true)}
            body={item.note || "Sin nota"}
          />
        ))
      ) : (
        <EmptyInline text="No hay cambios registrados." />
      )}
    </div>
  );
}
function Timeline({
  icon,
  title,
  meta,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  meta: string;
  body: string | null;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-[#e0eaf2] p-4">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#edf4ff] text-blue-600">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-black text-slate-900">{title}</p>
        <p className="mt-1 text-[11px] font-semibold text-[#8195a8]">{meta}</p>
        {body ? <p className="mt-2 text-xs leading-5 text-[#536f87]">{body}</p> : null}
      </div>
    </div>
  );
}
function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#8aa0b2]">{label}</p>
      <p className={`mt-1 truncate text-sm font-bold text-slate-900 ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  );
}
function Metric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#e0eaf2] p-3">
      <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#8aa0b2]">{label}</p>
      <p className={`mt-1 text-sm font-black ${accent ? "text-blue-600" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}
function EmptyInline({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-[#d8e5ee] px-4 py-8 text-center text-sm text-[#8195a8]">
      {text}
    </p>
  );
}

function ActionDialog({
  kind,
  close,
  busy,
  error,
  onSubmit,
}: {
  kind: Exclude<DialogKind, null>;
  close: () => void;
  busy: boolean;
  error: string;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const [channel, setChannel] = useState("WHATSAPP");
  const [response, setResponse] = useState("ACCEPTED");
  const [reason, setReason] = useState("");
  const [title, setTitle] = useState("Llamar al cliente");
  const [dueAt, setDueAt] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const heading =
    kind === "send"
      ? "Registrar envío"
      : kind === "response"
        ? "Registrar respuesta"
        : kind === "followUp"
          ? "Crear seguimiento"
          : "Cancelar cotización";
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-[#102a43]/35 p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (kind === "send")
            onSubmit({
              channel,
              providerConfirmed: channel !== "WHATSAPP" || confirmed,
              recipient: reason,
            });
          else if (kind === "response")
            onSubmit({
              response,
              channel,
              note: reason,
              rejectionCode: response === "REJECTED" ? "OTHER" : null,
            });
          else if (kind === "followUp") onSubmit({ title, dueAt, note: reason });
          else onSubmit({ reason });
        }}
        className="w-full max-w-md rounded-2xl border border-[#dbe7f0] bg-white p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-blue-600">
              Acción trazable
            </p>
            <h3 className="mt-1 font-display text-xl font-black text-slate-900">{heading}</h3>
          </div>
          <button type="button" onClick={close} aria-label="Cerrar">
            <X size={18} className="text-[#8195a8]" />
          </button>
        </div>
        {kind === "send" ? (
          <>
            <label className="mt-5 grid gap-2 text-sm font-bold text-slate-900">
              Canal
              <select
                value={channel}
                onChange={(event) => {
                  setChannel(event.target.value);
                  setConfirmed(false);
                }}
                className="h-11 rounded-lg border border-[#dfe9f1] px-3"
              >
                <option value="WHATSAPP">WhatsApp (registrar después de enviar)</option>
                <option value="EMAIL">Correo</option>
                <option value="PHONE">Teléfono</option>
                <option value="IN_PERSON">Presencial</option>
              </select>
            </label>
            <label className="mt-4 grid gap-2 text-sm font-bold text-slate-900">
              Destinatario / nota
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="min-h-20 rounded-lg border border-[#dfe9f1] p-3 font-normal"
                placeholder="Contacto o referencia del envío"
                maxLength={500}
              />
            </label>
            <label className="mt-4 flex items-start gap-2 text-xs font-semibold text-[#536f87]">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                className="mt-0.5 accent-blue-600"
              />
              Confirmo que el mensaje ya fue enviado y sólo estoy registrando la trazabilidad.
            </label>
          </>
        ) : kind === "response" ? (
          <>
            <label className="mt-5 grid gap-2 text-sm font-bold text-slate-900">
              Respuesta
              <select
                value={response}
                onChange={(event) => setResponse(event.target.value)}
                className="h-11 rounded-lg border border-[#dfe9f1] px-3"
              >
                <option value="ACCEPTED">Aceptada</option>
                <option value="REJECTED">Rechazada</option>
                <option value="NEEDS_CHANGES">Solicita cambios</option>
                <option value="NO_RESPONSE">Sin respuesta</option>
              </select>
            </label>
            <label className="mt-4 grid gap-2 text-sm font-bold text-slate-900">
              Canal
              <select
                value={channel}
                onChange={(event) => setChannel(event.target.value)}
                className="h-11 rounded-lg border border-[#dfe9f1] px-3"
              >
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">Correo</option>
                <option value="PHONE">Teléfono</option>
                <option value="IN_PERSON">Presencial</option>
                <option value="PORTAL">Portal</option>
                <option value="OTHER">Otro</option>
              </select>
            </label>
            <label className="mt-4 grid gap-2 text-sm font-bold text-slate-900">
              Nota {response === "REJECTED" ? "(obligatoria)" : ""}
              <textarea
                required={response === "REJECTED"}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="min-h-20 rounded-lg border border-[#dfe9f1] p-3 font-normal"
                maxLength={500}
              />
            </label>
          </>
        ) : kind === "followUp" ? (
          <>
            <label className="mt-5 grid gap-2 text-sm font-bold text-slate-900">
              Siguiente acción
              <input
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-11 rounded-lg border border-[#dfe9f1] px-3 font-normal"
                maxLength={180}
              />
            </label>
            <label className="mt-4 grid gap-2 text-sm font-bold text-slate-900">
              Fecha
              <input
                required
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                className="h-11 rounded-lg border border-[#dfe9f1] px-3 font-normal"
              />
            </label>
            <label className="mt-4 grid gap-2 text-sm font-bold text-slate-900">
              Nota
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="min-h-20 rounded-lg border border-[#dfe9f1] p-3 font-normal"
                maxLength={1000}
              />
            </label>
          </>
        ) : (
          <label className="mt-5 grid gap-2 text-sm font-bold text-slate-900">
            Motivo (obligatorio)
            <textarea
              required
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="min-h-24 rounded-lg border border-[#dfe9f1] p-3 font-normal"
              maxLength={500}
            />
          </label>
        )}
        {error ? (
          <p className="mt-4 text-xs font-semibold text-rose-600" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={busy || (kind === "send" && channel === "WHATSAPP" && !confirmed)}
          >
            {busy ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function NewQuoteDrawer({
  opportunityId,
  customerId,
  close,
  onSaved,
  can,
}: {
  opportunityId?: string | null;
  customerId?: string | null;
  close: () => void;
  onSaved: () => void;
  can: (permission: string) => boolean;
}) {
  const [customerQuery, setCustomerQuery] = useState("");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customer, setCustomer] = useState<CustomerOption | null>(null);
  const [productQuery, setProductQuery] = useState("");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [validUntil, setValidUntil] = useState("");
  const [taxMode, setTaxMode] = useState("UNCONFIGURED");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(Boolean(opportunityId || customerId));
  const lockedCustomer = Boolean(customerId && !opportunityId);
  useEffect(() => {
    if (!opportunityId) return;
    const controller = new AbortController();
    void fetch(`/api/admin/oportunidades/${encodeURIComponent(opportunityId)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          data?: {
            customerId?: string;
            customerName?: string | null;
            customerEmail?: string | null;
            customerPhone?: string | null;
            items?: Array<{
              productId: string;
              skuSnapshot: string;
              productNameSnapshot: string;
              quantity: number;
            }>;
          };
        };
        if (!response.ok)
          throw new Error("No se pudo cargar la oportunidad para preparar la cotización.");
        const source = payload.data;
        if (!source?.customerId) return;
        setCustomer({
          id: source.customerId,
          name: source.customerName || "Cliente de la oportunidad",
          email: source.customerEmail ?? null,
          phone: source.customerPhone ?? null,
          documentNumber: null,
        });
        setLines(
          (source.items ?? []).map((item) => ({
            productId: item.productId,
            sku: item.skuSnapshot,
            name: item.productNameSnapshot,
            quantity: item.quantity,
          })),
        );
      })
      .catch((loadError) => {
        if (!controller.signal.aborted)
          setError(
            loadError instanceof Error ? loadError.message : "No se pudo preparar la cotización.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setPrefillLoading(false);
      });
    return () => controller.abort();
  }, [opportunityId]);
  useEffect(() => {
    if (!customerId || opportunityId) return;
    const controller = new AbortController();
    void fetch(`/api/admin/clientes/${encodeURIComponent(customerId)}?pageSize=1`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          customer?: {
            name?: string | null;
            email?: string | null;
            phone?: string | null;
            documentNumber?: string | null;
          };
        };
        if (!response.ok || !payload.customer)
          throw new Error("No se pudo cargar el cliente seleccionado.");
        const selected = payload.customer;
        setCustomer({
          id: customerId,
          name: selected.name || "Cliente seleccionado",
          email: selected.email ?? null,
          phone: selected.phone ?? null,
          documentNumber: selected.documentNumber ?? null,
        });
      })
      .catch((loadError) => {
        if (!controller.signal.aborted)
          setError(
            loadError instanceof Error ? loadError.message : "No se pudo cargar el cliente.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setPrefillLoading(false);
      });
    return () => controller.abort();
  }, [customerId, opportunityId]);
  useEffect(() => {
    if (customerQuery.trim().length < 2 || customer) return;
    const controller = new AbortController();
    void fetch(`/api/admin/clientes?query=${encodeURIComponent(customerQuery)}&page=1&pageSize=8`, {
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((payload: { items?: CustomerOption[] }) => setCustomers(payload.items ?? []))
      .catch(() => undefined);
    return () => controller.abort();
  }, [customerQuery, customer]);
  useEffect(() => {
    if (productQuery.trim().length < 2) return;
    const controller = new AbortController();
    void fetch(`/api/admin/precios/productos?q=${encodeURIComponent(productQuery)}`, {
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((payload: { items?: ProductOption[] }) => setProducts(uniqueProductOptions(payload.items ?? [])))
      .catch(() => undefined);
    return () => controller.abort();
  }, [productQuery]);
  const addProduct = (product: ProductOption) => {
    setLines((current) =>
      current.some((line) => line.productId === product.productId)
        ? current
        : [
            ...current,
            {
              productId: product.productId,
              sku: product.sku,
              name: product.productName,
              quantity: 1,
            },
          ],
    );
    setProductQuery("");
    setProducts([]);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!customer || !can("quotes.create")) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/cotizaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          opportunityId: opportunityId || undefined,
          items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
          validUntil: validUntil || null,
          taxMode,
          message,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readApiError(payload, "No se pudo crear la cotización."));
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo crear la cotización.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <DrawerShell
      eyebrow={opportunityId ? "Desde oportunidad" : "Nueva propuesta"}
      title="Crear cotización"
      close={close}
    >
      <form onSubmit={save} className="flex-1 overflow-y-auto p-5 sm:p-7">
        <p className="text-sm leading-6 text-[#657f96]">
          {prefillLoading
            ? "Cargando cliente y productos de la oportunidad…"
            : "Selecciona un cliente y productos reales del catálogo. Los precios se resolverán y quedarán congelados al enviar."}
        </p>
        <label className="mt-6 grid gap-2 text-sm font-bold text-slate-900">
          Cliente
          {customer ? (
            <span className="flex items-center justify-between rounded-lg border border-emerald-600/20 bg-emerald-600/5 px-3 py-3 text-sm text-emerald-600">
              {customer.name}
              {lockedCustomer ? null : (
                <button
                  type="button"
                  onClick={() => {
                    setCustomer(null);
                    setCustomerQuery("");
                  }}
                  aria-label="Cambiar cliente"
                >
                  <X size={15} />
                </button>
              )}
            </span>
          ) : (
            <>
              <input
                required={!customer}
                value={customerQuery}
                onChange={(event) => setCustomerQuery(event.target.value)}
                className="h-11 rounded-lg border border-[#dfe9f1] px-3 font-normal"
                placeholder="Buscar por nombre, documento o correo"
              />
              {customers.length ? (
                <div className="grid gap-1 rounded-lg border border-[#dfe9f1] bg-white p-1">
                  {customers.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        setCustomer(item);
                        setCustomers([]);
                      }}
                      className="rounded-md px-3 py-2 text-left text-xs hover:bg-[#f4f8fb]"
                    >
                      <span className="block font-bold text-slate-900">{item.name}</span>
                      <span className="text-[#8195a8]">
                        {item.documentNumber || item.email || item.phone || "Sin identificador"}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </label>
        <label className="mt-5 grid gap-2 text-sm font-bold text-slate-900">
          Agregar producto
          <input
            value={productQuery}
            onChange={(event) => setProductQuery(event.target.value)}
            className="h-11 rounded-lg border border-[#dfe9f1] px-3 font-normal"
            placeholder="Buscar SKU, nombre, marca o familia"
          />
          {productQuery.trim().length >= 2 && products.length ? (
            <div className="grid gap-1 rounded-lg border border-[#dfe9f1] bg-white p-1">
              {products.map((product) => (
                <button
                  type="button"
                  key={product.productId}
                  onClick={() => addProduct(product)}
                  className="rounded-md px-3 py-2 text-left text-xs hover:bg-[#f4f8fb]"
                >
                  <span className="font-mono font-bold text-blue-600">{product.sku}</span>
                  <span className="ml-2 font-semibold text-slate-900">{product.productName}</span>
                </button>
              ))}
            </div>
          ) : null}
        </label>
        <div className="mt-4 grid gap-2">
          {lines.map((line, index) => (
            <div
              key={line.productId}
              className="flex items-center gap-3 rounded-lg border border-[#e0eaf2] p-3"
            >
              <PackageSearch size={16} className="shrink-0 text-blue-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-900">{line.name}</p>
                <p className="font-mono text-[10px] text-[#8195a8]">{line.sku}</p>
              </div>
              <input
                aria-label={`Cantidad ${line.sku}`}
                type="number"
                min={1}
                value={line.quantity}
                onChange={(event) =>
                  setLines((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, quantity: Math.max(1, Number(event.target.value)) }
                        : item,
                    ),
                  )
                }
                className="h-9 w-20 rounded-lg border border-[#dfe9f1] px-2 text-center text-sm"
              />
              <button
                type="button"
                onClick={() =>
                  setLines((current) => current.filter((_, itemIndex) => itemIndex !== index))
                }
                className="text-[#9aaebe] hover:text-rose-600"
                aria-label={`Quitar ${line.sku}`}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-slate-900">
            Vigencia
            <input
              type="date"
              value={validUntil}
              onChange={(event) => setValidUntil(event.target.value)}
              className="h-11 rounded-lg border border-[#dfe9f1] px-3 font-normal"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-900">
            Impuestos
            <select
              value={taxMode}
              onChange={(event) => setTaxMode(event.target.value)}
              className="h-11 rounded-lg border border-[#dfe9f1] px-3 font-normal"
            >
              <option value="UNCONFIGURED">Definir al enviar</option>
              <option value="INCLUDED">Incluidos</option>
              <option value="EXCLUDED">Excluidos</option>
            </select>
          </label>
        </div>
        <label className="mt-5 grid gap-2 text-sm font-bold text-slate-900">
          Nota comercial
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="min-h-24 rounded-lg border border-[#dfe9f1] p-3 font-normal"
            maxLength={2000}
          />
        </label>
        {error ? (
          <p
            className="mt-5 rounded-lg border border-rose-600/20 bg-rose-600/5 p-3 text-sm font-semibold text-rose-600"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <div className="mt-7 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || prefillLoading || !customer}>
            {saving ? "Creando…" : "Crear borrador"}
          </Button>
        </div>
      </form>
    </DrawerShell>
  );
}

function EditQuoteDrawer({
  detail,
  close,
  onSaved,
}: {
  detail: Detail;
  close: () => void;
  onSaved: () => void;
}) {
  const [lines, setLines] = useState<DraftLine[]>(
    detail.items.map((item) => ({
      productId: item.productId,
      sku: item.skuSnapshot,
      name: item.productNameSnapshot,
      quantity: item.quantity,
    })),
  );
  const [productQuery, setProductQuery] = useState("");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [validUntil, setValidUntil] = useState(
    detail.quote.validUntil ? detail.quote.validUntil.slice(0, 10) : "",
  );
  const [taxMode, setTaxMode] = useState(detail.quote.taxMode || "UNCONFIGURED");
  const [message, setMessage] = useState(detail.quote.message || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (productQuery.trim().length < 2) return;
    const controller = new AbortController();
    void fetch(`/api/admin/precios/productos?q=${encodeURIComponent(productQuery)}`, {
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((payload: { items?: ProductOption[] }) => setProducts(uniqueProductOptions(payload.items ?? [])))
      .catch(() => undefined);
    return () => controller.abort();
  }, [productQuery]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/cotizaciones/${encodeURIComponent(detail.quote.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
            validUntil: validUntil || null,
            taxMode,
            message,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readApiError(payload, "No se pudo guardar el borrador."));
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el borrador.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <DrawerShell
      eyebrow="Editor de borrador"
      title={`Editar ${detail.quote.trackingCode}`}
      close={close}
    >
      <form onSubmit={save} className="flex-1 overflow-y-auto p-5 sm:p-7">
        <p className="text-sm leading-6 text-[#657f96]">
          Los precios se vuelven a resolver en el servidor. Al enviar se creará una versión
          inmutable de esta propuesta.
        </p>
        <label className="mt-6 grid gap-2 text-sm font-bold text-slate-900">
          Agregar producto
          <input
            value={productQuery}
            onChange={(event) => setProductQuery(event.target.value)}
            className="h-11 rounded-lg border border-[#dfe9f1] px-3 font-normal"
            placeholder="Buscar SKU, nombre o familia"
          />
          {productQuery.trim().length >= 2 && products.length ? (
            <div className="grid gap-1 rounded-lg border border-[#dfe9f1] p-1">
              {products.map((product) => (
                <button
                  type="button"
                  key={product.productId}
                  onClick={() => {
                    if (!lines.some((line) => line.productId === product.productId))
                      setLines((current) => [
                        ...current,
                        {
                          productId: product.productId,
                          sku: product.sku,
                          name: product.productName,
                          quantity: 1,
                        },
                      ]);
                    setProductQuery("");
                    setProducts([]);
                  }}
                  className="rounded-md px-3 py-2 text-left text-xs hover:bg-[#f4f8fb]"
                >
                  <span className="font-mono font-bold text-blue-600">{product.sku}</span>
                  <span className="ml-2 font-semibold text-slate-900">{product.productName}</span>
                </button>
              ))}
            </div>
          ) : null}
        </label>
        <div className="mt-4 grid gap-2">
          {lines.map((line, index) => (
            <div
              key={line.productId}
              className="flex items-center gap-3 rounded-lg border border-[#e0eaf2] p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-900">{line.name}</p>
                <p className="font-mono text-[10px] text-[#8195a8]">{line.sku}</p>
              </div>
              <input
                aria-label={`Cantidad ${line.sku}`}
                type="number"
                min={1}
                value={line.quantity}
                onChange={(event) =>
                  setLines((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, quantity: Math.max(1, Number(event.target.value)) }
                        : item,
                    ),
                  )
                }
                className="h-9 w-20 rounded-lg border border-[#dfe9f1] px-2 text-center text-sm"
              />
              <button
                type="button"
                onClick={() =>
                  setLines((current) => current.filter((_, itemIndex) => itemIndex !== index))
                }
                className="text-[#9aaebe] hover:text-rose-600"
                aria-label={`Quitar ${line.sku}`}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-slate-900">
            Vigencia
            <input
              type="date"
              value={validUntil}
              onChange={(event) => setValidUntil(event.target.value)}
              className="h-11 rounded-lg border border-[#dfe9f1] px-3 font-normal"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-900">
            Impuestos
            <select
              value={taxMode}
              onChange={(event) => setTaxMode(event.target.value)}
              className="h-11 rounded-lg border border-[#dfe9f1] px-3 font-normal"
            >
              <option value="UNCONFIGURED">Definir al enviar</option>
              <option value="INCLUDED">Incluidos</option>
              <option value="EXCLUDED">Excluidos</option>
            </select>
          </label>
        </div>
        <label className="mt-5 grid gap-2 text-sm font-bold text-slate-900">
          Nota comercial
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="min-h-24 rounded-lg border border-[#dfe9f1] p-3 font-normal"
            maxLength={2000}
          />
        </label>
        {error ? (
          <p
            className="mt-5 rounded-lg border border-rose-600/20 bg-rose-600/5 p-3 text-sm font-semibold text-rose-600"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <div className="mt-7 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar borrador"}
          </Button>
        </div>
      </form>
    </DrawerShell>
  );
}
