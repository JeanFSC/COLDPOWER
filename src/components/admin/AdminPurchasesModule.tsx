import { formatPurchaseMoney as money } from "@/lib/purchase-money-display";
import Link from "next/link";
import { InventoryCatalogLink } from "@/components/admin/InventoryCatalogLink";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Boxes,
  Clock,
  Eye,
  FileText,
  Package,
  PackageCheck,
  ShoppingCart,
  Truck,
  UsersRound,
} from "lucide-react";
import { AdminSparkline } from "@/components/admin/AdminChartsLazy";
import { PurchaseActions } from "@/components/admin/PurchaseActions";
import { PurchaseRequestActions } from "@/components/admin/PurchaseRequestActions";
import { purchaseOrderHref, purchaseReceiptHref, purchaseRequestPageHref } from "@/lib/purchases-navigation";
import { filterOptionsWithSelection } from "@/lib/filter-options";
import type {
  PurchaseListItem,
  PurchaseRequestListItem,
  PurchasesFilters,
  PurchasesPageResponse,
  PurchaseRequestsPageResponse,
} from "@/lib/purchases-contract";
import type { getPurchaseAlerts, getPurchasesKpiSeries, getSupplierScorecard } from "@/lib/purchases-repository";

const statusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  PENDING: "Pendiente",
  PARTIAL_RECEIVED: "Parcial",
  RECEIVED: "Recibida",
  CANCELLED: "Cancelada",
  SUBMITTED: "En revisión",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  CONVERTED: "Convertida",
};
function statusLabel(value: string) {
  return statusLabels[value] ?? value;
}
function statusBadge(value: string) {
  if (value === "RECEIVED" || value === "APPROVED" || value === "CONVERTED") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (value === "PARTIAL_RECEIVED") return "bg-orange-50 text-orange-700 border-orange-100";
  if (value === "PENDING" || value === "SUBMITTED") return "bg-amber-50 text-amber-700 border-amber-100";
  if (value === "CANCELLED" || value === "REJECTED") return "bg-rose-50 text-rose-700 border-rose-100";
  return "bg-slate-100 text-slate-600 border-slate-200";
}
function attentionFor(purchase: PurchaseListItem, supplierStatus: string | undefined) {
  if (supplierStatus === "INACTIVE") return "Incidencia";
  if (purchase.status === "PARTIAL_RECEIVED") return "Parcial";
  if (
    purchase.expectedDeliveryAt &&
    new Date(purchase.expectedDeliveryAt) < new Date() &&
    ["DRAFT", "PENDING", "PARTIAL_RECEIVED"].includes(purchase.status)
  )
    return "Retrasada";
  return "Normal";
}
function attentionBadge(value: string) {
  if (value === "Retrasada" || value === "Incidencia") return "bg-rose-50 text-rose-600";
  if (value === "Parcial") return "bg-orange-50 text-orange-600";
  return "bg-emerald-50 text-emerald-600";
}

function dateLabel(value: Date | string | null | undefined) {
  if (!value) return "N/D";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "N/D" : date.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}
function pageNumbers(current: number, total: number) {
  const width = Math.min(5, total);
  const start = Math.max(1, Math.min(current - 2, total - width + 1));
  return Array.from({ length: width }, (_, index) => start + index);
}

const categoryColors = [
  { stroke: "stroke-blue-600", dot: "bg-blue-600" },
  { stroke: "stroke-emerald-500", dot: "bg-emerald-500" },
  { stroke: "stroke-amber-500", dot: "bg-amber-500" },
  { stroke: "stroke-rose-500", dot: "bg-rose-500" },
  { stroke: "stroke-purple-500", dot: "bg-purple-500" },
  { stroke: "stroke-slate-400", dot: "bg-slate-400" },
];
const supplierColors = ["bg-blue-600", "bg-blue-500", "bg-blue-400", "bg-sky-400", "bg-sky-300", "bg-slate-400"];

type KpiSeries = Awaited<ReturnType<typeof getPurchasesKpiSeries>>;
type Scorecard = Awaited<ReturnType<typeof getSupplierScorecard>>;
type Alerts = Awaited<ReturnType<typeof getPurchaseAlerts>>;
type CategorySpendItem = { categoryId: string; categoryName: string; currency: string; amount: number };
type SupplierSpendItem = { supplierId: string; supplierName: string; currency: string; amount: number };

export function AdminPurchasesModule({
  suppliers,
  locations,
  purchasePage,
  requestPage,
  categorySpend,
  supplierRanking,
  scorecard,
  alerts,
  series,
  selectedRequest,
  selectedPurchase,
  selectedReceiptId,
  filters,
  queryString,
  exportHref,
  filterNotice,
  canManage,
  canReceive,
  canApprove,
  canViewCosts,
  controls,
}: {
  suppliers: Array<{ id: string; name: string; currency: string; status: string }>;
  locations: Array<{ id: string; name: string }>;
  purchasePage: PurchasesPageResponse;
  requestPage: PurchaseRequestsPageResponse;
  categorySpend: CategorySpendItem[];
  supplierRanking: SupplierSpendItem[];
  scorecard: Scorecard;
  alerts: Alerts;
  series: KpiSeries;
  selectedRequest?: {
    request: { id: string; code: string; status: string; source: string; locationId: string | null; notes: string | null; rejectionReason: string | null; convertedPurchaseId?: string | null; createdAt: Date | string };
    items: Array<{ id: string; productId: string; skuSnapshot: string; productNameSnapshot: string; quantityRequested: number; notes: string | null }>;
  } | null;
  selectedPurchase?: {
    purchase: { id: string; code: string; status: string; currency: string; subtotal: string; createdAt: Date | string; issuedAt: Date | string | null; expectedDeliveryAt: Date | string | null; cancellationReason: string | null; notes: string | null };
    supplierName: string;
    locationName: string;
    items: Array<{ id: string; productId: string; skuSnapshot: string; productNameSnapshot: string; quantityOrdered: number; quantityReceived: number; unitCost: string; currency: string }>;
    receipts: Array<{ id: string; code: string; purchaseId: string; receivedAt: Date | string; status: string; items: Array<{ id: string; sku: string | null; name: string | null; quantity: number }> }>;
  } | null;
  selectedReceiptId?: string;
  filters: PurchasesFilters;
  queryString: string;
  exportHref: string;
  filterNotice?: string;
  canManage: boolean;
  canReceive: boolean;
  canApprove: boolean;
  canViewCosts: boolean;
  controls: ReactNode;
}) {
  const locationById = new Map(locations.map((location) => [location.id, location.name]));
  const supplierStatusById = new Map(suppliers.map((supplier) => [supplier.id, supplier.status]));
  const metrics = purchasePage.metrics;
  const openPurchases = Math.max(0, metrics.total - metrics.received - metrics.cancelled);
  const amountLabel = canViewCosts ? (
    metrics.amountsByCurrency.map((row) => row.currency + " " + money(row.amount, row.currency)).join(" · ") || "N/D") : "Restringido";

  const kpis: Array<{ key: string; label: string; value: string; note: string; iconBg: string; iconInk: string; icon: typeof ShoppingCart; tone: "blue" | "orange" | "green" | "red" | "purple"; sparkline: number[] | null }> = [
    { key: "open", label: "Órdenes abiertas", value: String(openPurchases), note: "Sin recibir ni cancelar", icon: FileText, iconBg: "bg-blue-50", iconInk: "text-blue-600", tone: "blue", sparkline: series.openPurchases },
    { key: "requests", label: "Solicitudes pendientes", value: String(requestPage.metrics.pending), note: "En revisión", icon: Boxes, iconBg: "bg-indigo-50", iconInk: "text-indigo-600", tone: "purple", sparkline: series.requests },
    { key: "receptions", label: "Recepciones pendientes", value: String(metrics.pending + metrics.partialReceived), note: "OC pendientes o parciales", icon: PackageCheck, iconBg: "bg-orange-50", iconInk: "text-orange-600", tone: "orange", sparkline: series.receptions },
    { key: "spend", label: "Subtotal de órdenes", value: amountLabel, note: series.spend ? "OC del alcance filtrado · tendencia 14 días" : "Importes separados por moneda", icon: Truck, iconBg: "bg-emerald-50", iconInk: "text-emerald-600", tone: "green", sparkline: series.spend },
    { key: "leadTime", label: "Lead time promedio", value: metrics.leadTimeDays == null ? "N/D" : `${metrics.leadTimeDays} días`, note: metrics.leadTimeDays == null ? "Sin OC emitida y recibida con fechas" : "Emisión a recepción final", icon: Clock, iconBg: "bg-purple-50", iconInk: "text-purple-600", tone: "purple", sparkline: null },
    { key: "incidents", label: "OC con proveedor inactivo", value: String(metrics.incidents), note: "Todos los estados del alcance", icon: AlertTriangle, iconBg: "bg-rose-50", iconInk: "text-rose-600", tone: "red", sparkline: series.incidentPurchases },
  ];

  const categoryCurrencies = [...new Set(categorySpend.map((row) => row.currency))];
  const categoryTotal = Math.max(1, categorySpend.reduce((sum, row) => sum + row.amount, 0));
  const categoryTotalByCurrency = new Map(
    categoryCurrencies.map((currency) => [
      currency,
      categorySpend.filter((row) => row.currency === currency).reduce((sum, row) => sum + row.amount, 0),
    ]),
  );
  const topCategories = categorySpend.slice(0, 5);
  const otherCategoryAmount = categorySpend.slice(5).reduce((sum, row) => sum + row.amount, 0);
  const categoryRows = categoryCurrencies.length === 1 && otherCategoryAmount > 0
    ? [...topCategories, { categoryId: "other", categoryName: "Otros", currency: categoryCurrencies[0], amount: otherCategoryAmount }]
    : topCategories;
  const categorySegments = categoryRows.map((row, index) => {
    const start = categoryRows.slice(0, index).reduce((sum, previous) => sum + previous.amount, 0);
    return { ...row, color: categoryColors[index % categoryColors.length], dasharray: `${(row.amount / categoryTotal) * 251.2} 251.2`, offset: `${-(start / categoryTotal) * 251.2}` };
  });

  const supplierCurrencies = [...new Set(supplierRanking.map((row) => row.currency))];
  const supplierTotalByCurrency = new Map(
    supplierCurrencies.map((currency) => [
      currency,
      supplierRanking.filter((row) => row.currency === currency).reduce((sum, row) => sum + row.amount, 0),
    ]),
  );
  const topSuppliers = supplierCurrencies.flatMap((currency) =>
    supplierRanking.filter((row) => row.currency === currency).slice(0, 5),
  );
  const supplierRows = topSuppliers;

  const activeQuery = new URLSearchParams(queryString);
  const pendingRequestQuery = new URLSearchParams(activeQuery);
  pendingRequestQuery.delete("requestId");
  pendingRequestQuery.delete("purchaseId");
  pendingRequestQuery.delete("receiptId");
  pendingRequestQuery.set("requestStatus", "SUBMITTED");
  pendingRequestQuery.set("requestPage", "1");
  const purchaseCurrency = purchasePage.items[0]?.currency ?? "PEN";

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 shadow-xs">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-900">Compras y proveedores</h1>
            <p className="text-xs font-normal text-slate-500">Gestiona tus proveedores, órdenes de compra y recepciones en un solo lugar.</p>
          </div>
        </div>
        {canManage || canReceive ? (
          <div className="flex items-center gap-2.5">
            {canManage ? <Link prefetch={false} href="#supplier-tools" className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:border-slate-300">
              <UsersRound className="h-3.5 w-3.5 text-slate-500" />
              Nuevo proveedor
            </Link> : null}
            {canManage ? <Link prefetch={false} href="#purchase-order-tools" className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:border-slate-300">
              <FileText className="h-3.5 w-3.5 text-slate-500" />
              Crear OC
            </Link> : null}
            {canReceive ? <Link prefetch={false} href="#purchase-receipt-tools" className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-xs shadow-blue-500/25 transition-colors hover:bg-blue-700">
              <PackageCheck className="h-3.5 w-3.5" />
              Registrar recepción
            </Link> : null}
          </div>
        ) : null}
      </header>

      {filterNotice ? (
        <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
          {filterNotice}
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${item.iconBg} ${item.iconInk}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <span className="block text-[11px] font-medium text-slate-500">{item.label}</span>
                </div>
              </div>
              <p className="mt-3 break-words text-lg font-bold leading-snug text-slate-900">{item.value}</p>
              {item.sparkline ? (
                <AdminSparkline
                  tone={item.tone}
                  data={item.sparkline}
                  ariaLabel={`${item.key === "spend" ? "Subtotal de OC" : item.key === "incidents" ? "OC con proveedor actualmente inactivo" : item.key === "open" ? "OC actualmente abiertas" : item.key === "requests" ? "Solicitudes actualmente en revisión" : "OC actualmente pendientes de recepción"} por fecha de creación (últimos 14 días${item.key === "requests" ? "" : ", filtros seleccionados"})${item.sparkline.every((value) => value === 0) ? "; todos los valores son cero" : ""}`}
                />
              ) : (
                <div className="mt-3 h-8" aria-hidden="true" />
              )}
              <p className="mt-1 text-[10.5px] font-semibold text-slate-400">{item.note}</p>
            </div>
          );
        })}
      </section>

      {canViewCosts ? <section className="grid gap-4 xl:grid-cols-12">
        <div className="flex flex-col rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs xl:col-span-4">
          <h2 className="text-sm font-bold tracking-tight text-slate-900">Subtotal de OC por categoría</h2>
          {categoryRows.length ? (
            <div className="flex flex-1 items-center gap-4 pt-3">
              {categoryCurrencies.length === 1 ? (
                <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
                  <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" className="fill-none stroke-slate-100" r="40" strokeWidth={16} />
                    {categorySegments.map((segment) => (
                      <circle key={segment.categoryId} cx="50" cy="50" className={`fill-none ${segment.color.stroke}`} r="40" strokeDasharray={segment.dasharray} strokeDashoffset={segment.offset} strokeWidth={16} />
                    ))}
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-bold text-slate-900">{money(categoryTotal, purchaseCurrency)}</span>
                    <span className="text-[10px] text-slate-400">Total filtrado</span>
                  </div>
                </div>
              ) : (
                <div className="flex h-32 w-32 shrink-0 flex-col items-center justify-center rounded-full border-[16px] border-slate-100 text-center">
                  <span className="text-xs font-bold text-slate-900">{categoryCurrencies.length} monedas</span>
                  <span className="text-[10px] text-slate-400">Detalle separado</span>
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-1.5">
                {categorySegments.map((row) => (
                  <div key={row.categoryId} className="flex items-center justify-between gap-2 text-[11px]">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${row.color.dot}`} />
                      <span className="truncate text-slate-600">{row.categoryName} · {row.currency}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 font-medium">
                      <span className="text-slate-800">{money(row.amount, row.currency)}</span>
                      <span className="w-8 text-right text-slate-400">{((row.amount / (categoryTotalByCurrency.get(row.currency) ?? 1)) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-[11px] text-slate-400">Sin compras registradas en este alcance.</p>
          )}
        </div>

        <div className="flex flex-col rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs xl:col-span-5">
          <h2 className="text-sm font-bold tracking-tight text-slate-900">Top 5 proveedores por moneda</h2>
          <p className="pt-1 text-[10.5px] font-medium text-slate-400">Participación sobre el total de OC de la misma moneda.</p>
          {supplierRows.length ? (
            <div className="flex-1 space-y-2.5 pt-3">
              <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(88px,0.8fr)_minmax(0,1fr)_42px] items-center gap-3 px-0.5 text-[10.5px] font-medium text-slate-400">
                <span>Proveedor</span>
                <span>Subtotal</span>
                <span>Participación</span>
                <span className="text-right">%</span>
              </div>
              {supplierRows.map((row, index) => (
                <div key={row.supplierId} className="grid grid-cols-[minmax(0,1.25fr)_minmax(88px,0.8fr)_minmax(0,1fr)_42px] items-center gap-3 text-xs">
                  <span className="min-w-0 truncate font-medium text-slate-700" title={`${row.supplierName} · ${row.currency}`}>{row.supplierName} · {row.currency}</span>
                  <span className="whitespace-nowrap font-medium text-slate-900">{money(row.amount, row.currency)}</span>
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-2 rounded-full ${supplierColors[index % supplierColors.length]}`} style={{ width: `${Math.max(2, (row.amount / (supplierTotalByCurrency.get(row.currency) ?? 1)) * 100)}%` }} />
                    </div>
                  </div>
                  <span className="text-right text-[11px] font-medium text-slate-500">{((row.amount / (supplierTotalByCurrency.get(row.currency) ?? 1)) * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-[11px] text-slate-400">Sin proveedores con compras en este alcance.</p>
          )}
        </div>

        <div className="flex flex-col rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs xl:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-tight text-slate-900">Indicadores globales</h2>
            <a href="#suppliers-panel" className="text-xs font-medium text-blue-600 hover:underline">Ver todos</a>
          </div>
          <p className="pt-1 text-[10.5px] font-medium text-slate-400">Histórico de todos los proveedores; no cambia con los filtros.</p>
          <div className="grid flex-1 grid-cols-2 gap-2.5 pt-3">
            <ScoreTile icon={Clock} tone="emerald" label="Puntualidad" value={scorecard.onTimeRate == null ? "Sin fechas" : `${scorecard.onTimeRate}%`} note={`${scorecard.evaluatedOrders} con fechas · ${scorecard.completedOrders} recibidas`} />
            <ScoreTile icon={PackageCheck} tone="emerald" label="Fill rate" value={scorecard.fillRate == null ? "N/D" : `${scorecard.fillRate}%`} />
            <ScoreTile icon={AlertTriangle} tone="rose" label="Incidencias" value={String(scorecard.incidents)} />
            <ScoreTile icon={UsersRound} tone="blue" label="Proveedores activos" value={`${scorecard.activeSuppliers}/${scorecard.totalSuppliers}`} />
          </div>
        </div>
      </section> : (
        <section className="rounded-xl border border-slate-200/90 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
          Los importes y métricas de costo requieren permiso financiero.
        </section>
      )}

      <PurchasesFilterBar filters={filters} suppliers={suppliers} locations={locations} facets={purchasePage.facets} />

      <section className="grid gap-4 xl:grid-cols-12">
        <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs xl:col-span-8">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Órdenes de compra</h2>
              <span className="text-xs font-normal text-slate-400">{purchasePage.totalItems} resultados</span>
            </div>
            <a href={exportHref} download className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-2xs transition-colors hover:bg-slate-50">
              Exportar
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  {["OC", "Proveedor", "Local", "Creada", "Esperada", "Monto", "Estado", "Atención", "Acciones"].map((heading) => (
                    <th key={heading} className="px-3 py-3 font-medium">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {purchasePage.items.map((purchase) => {
                  const attention = attentionFor(purchase, supplierStatusById.get(purchase.supplierId));
                  return (
                    <tr key={purchase.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-3 py-3">
                        <Link prefetch={false} href={purchaseOrderHref(queryString, purchase.id)} className="font-semibold text-blue-600 hover:underline">
                          {purchase.code}
                        </Link>
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-900"><Link prefetch={false} href={`/admin/compras/proveedores/${encodeURIComponent(purchase.supplierId)}`} className="text-blue-600 hover:underline">{purchase.supplierName}</Link></td>
                      <td className="px-3 py-3 text-slate-500"><Link prefetch={false} href={`/admin/compras?locationId=${encodeURIComponent(purchase.locationId)}`} className="hover:text-blue-600 hover:underline">{locationById.get(purchase.locationId) ?? "N/D"}</Link></td>
                      <td className="px-3 py-3 text-slate-500">{dateLabel(purchase.createdAt)}</td>
                      <td className="px-3 py-3 text-slate-500">{dateLabel(purchase.expectedDeliveryAt)}</td>
                      <td className="px-3 py-3 font-semibold text-slate-900">{canViewCosts ? money(purchase.subtotal, purchase.currency) : "—"}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10.5px] font-medium ${statusBadge(purchase.status)}`}>{statusLabel(purchase.status)}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-medium ${attentionBadge(attention)}`}>{attention}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Link prefetch={false} href={purchaseOrderHref(queryString, purchase.id)} className="inline-flex rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label={`Ver OC ${purchase.code}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!purchasePage.items.length ? (
              <div className="p-10 text-center">
                <p className="text-sm font-bold text-slate-700">{purchasePage.totalItems ? "No hay órdenes en esta página." : "No hay órdenes de compra con estos filtros."}</p>
              </div>
            ) : null}
          </div>
          <PurchasesPager page={purchasePage.page} total={purchasePage.totalPages} queryString={queryString} totalItems={purchasePage.totalItems} pageSize={purchasePage.pageSize} />
        </section>

        <div className="min-w-0 space-y-4 xl:col-span-4">
          <PanelCard title="Solicitudes de compra" action={<Link prefetch={false} href={`/admin/compras?${pendingRequestQuery.toString()}`} className="text-xs font-medium text-blue-600 hover:underline">Ver pendientes</Link>}>
            {requestPage.items.length ? (
              <div className="space-y-2">
                {requestPage.items.map((request) => (
                  <RequestRow key={request.id} request={request} locationById={locationById} queryString={queryString} />
                ))}
                <RequestsPager page={requestPage.page} total={requestPage.totalPages} queryString={queryString} totalItems={requestPage.totalItems} />
              </div>
            ) : (
              <EmptyRow icon={Boxes} title="No hay solicitudes" description="Las solicitudes creadas aparecerán aquí con su estado." />
            )}
          </PanelCard>

          <PanelCard title="Alertas de compras">
            <div className="space-y-3">
              <AlertRow icon={AlertTriangle} tone="rose" text={`${alerts.delayed} ${alerts.delayed === 1 ? "orden" : "órdenes"} con retraso en la entrega`} />
              <AlertRow icon={UsersRound} tone="rose" text={`${alerts.supplierIncidents} ${alerts.supplierIncidents === 1 ? "proveedor" : "proveedores"} con incidencia activa`} />
              <AlertRow icon={Package} tone="blue" text={`${alerts.criticalInTransit} ${alerts.criticalInTransit === 1 ? "producto" : "productos"} en stock crítico dentro de OC en tránsito`} />
              <AlertRow icon={Boxes} tone="blue" text={`${alerts.pendingRequests} ${alerts.pendingRequests === 1 ? "solicitud pendiente" : "solicitudes pendientes"} de aprobación`} />
            </div>
          </PanelCard>

          {selectedRequest ? (
            <PanelCard title={`Solicitud ${selectedRequest.request.code}`} subtitle={`${selectedRequest.request.source} · ${statusLabel(selectedRequest.request.status)}`}>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-semibold text-slate-500">
                  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 ${statusBadge(selectedRequest.request.status)}`}>{statusLabel(selectedRequest.request.status)}</span>
                  <span>{locationById.get(selectedRequest.request.locationId ?? "") ?? "N/D"}</span>
                  <span>{dateLabel(selectedRequest.request.createdAt)}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[300px] text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400">
                        <th className="px-2 py-1.5">SKU</th>
                        <th className="px-2 py-1.5">Producto</th>
                        <th className="px-2 py-1.5">Cant.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRequest.items.map((item) => (
                        <tr key={item.id} className="border-b border-slate-50 last:border-0">
                          <td className="px-2 py-1.5 font-mono text-slate-500"><InventoryCatalogLink productId={item.productId} className="text-blue-600 hover:underline">{item.skuSnapshot}</InventoryCatalogLink></td>
                          <td className="px-2 py-1.5 font-semibold text-slate-800"><InventoryCatalogLink productId={item.productId} className="hover:text-blue-600 hover:underline">{item.productNameSnapshot}</InventoryCatalogLink></td>
                          <td className="px-2 py-1.5 text-slate-600">{item.quantityRequested}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {selectedRequest.request.rejectionReason ? (
                  <p className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-[10.5px] font-medium text-rose-700">Motivo de rechazo: {selectedRequest.request.rejectionReason}</p>
                ) : null}
                {selectedRequest.request.convertedPurchaseId ? (
                  <Link prefetch={false} href={purchaseOrderHref(queryString, selectedRequest.request.convertedPurchaseId)} className="inline-flex rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-700 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                    Ver orden de compra creada
                  </Link>
                ) : null}
                <PurchaseRequestActions
                  requestId={selectedRequest.request.id}
                  status={selectedRequest.request.status}
                  locationId={selectedRequest.request.locationId}
                  items={selectedRequest.items.map((item) => ({ productId: item.productId, quantityRequested: item.quantityRequested, skuSnapshot: item.skuSnapshot, productNameSnapshot: item.productNameSnapshot }))}
                  suppliers={suppliers}
                  canApprove={canApprove}
                  canManage={canManage}
                />
              </div>
            </PanelCard>
          ) : null}

          {selectedPurchase ? (
            <PanelCard title={`Orden ${selectedPurchase.purchase.code}`} subtitle={`${selectedPurchase.supplierName} · ${statusLabel(selectedPurchase.purchase.status)}`}>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-semibold text-slate-500">
                  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 ${statusBadge(selectedPurchase.purchase.status)}`}>{statusLabel(selectedPurchase.purchase.status)}</span>
                  <span>{selectedPurchase.locationName}</span>
                  <span>Entrega: {dateLabel(selectedPurchase.purchase.expectedDeliveryAt)}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[380px] text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400">
                        <th className="px-2 py-1.5">Producto</th>
                        <th className="px-2 py-1.5">Pedido</th>
                        <th className="px-2 py-1.5">Recibido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPurchase.items.map((item) => (
                        <tr key={item.id} className="border-b border-slate-50 last:border-0">
                          <td className="px-2 py-1.5 font-semibold text-slate-800"><InventoryCatalogLink productId={item.productId} className="hover:text-blue-600 hover:underline">{item.productNameSnapshot}</InventoryCatalogLink></td>
                          <td className="px-2 py-1.5 text-slate-600">{item.quantityOrdered}</td>
                          <td className="px-2 py-1.5 text-slate-600">{item.quantityReceived}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {selectedPurchase.purchase.cancellationReason ? (
                  <p className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-[10.5px] font-medium text-rose-700">Motivo de cancelación: {selectedPurchase.purchase.cancellationReason}</p>
                ) : null}
                {selectedPurchase.receipts.length ? (
                  <div className="space-y-2 text-[10.5px] font-medium text-slate-500">
                    <p>Recepciones: {selectedPurchase.receipts.map((receipt) => <Link prefetch={false} key={receipt.id} href={purchaseReceiptHref(queryString, selectedPurchase.purchase.id, receipt.id)} aria-current={receipt.id === selectedReceiptId ? "true" : undefined} className="mr-1 text-blue-600 hover:underline">{receipt.code}</Link>)}</p>
                    {selectedPurchase.receipts.filter(receipt => receipt.id === selectedReceiptId).map(receipt => <section key={receipt.id} aria-label={`Recepción ${receipt.code}`} className="rounded-lg border border-blue-100 bg-blue-50/40 p-3">
                      <h3 className="font-bold text-slate-800">Recepción {receipt.code}</h3>
                      <p className="mt-1">{new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(receipt.receivedAt))} · {receipt.status === "POSTED" ? "Registrada" : receipt.status}</p>
                      <table className="mt-2 w-full text-left"><caption className="sr-only">Cantidades de esta entrega</caption><thead><tr><th className="py-1">Producto</th><th className="py-1 text-right">Recibido</th></tr></thead><tbody>{receipt.items.map(item => <tr key={item.id} className="border-t border-blue-100"><td className="py-2 pr-2"><span className="block break-words text-slate-700">{item.name ?? "Sin nombre en el registro"}</span><span className="break-all">{item.sku ?? "Sin SKU en el registro"}</span></td><td className="py-2 text-right font-bold text-slate-700">{item.quantity}</td></tr>)}</tbody></table>
                      {!receipt.items.length ? <p className="mt-2">Esta recepción no tiene líneas registradas.</p> : null}
                    </section>)}
                  </div>
                ) : null}
                <PurchaseActions key={`${selectedPurchase.purchase.id}:${selectedPurchase.purchase.status}`} purchaseId={selectedPurchase.purchase.id} status={selectedPurchase.purchase.status} canManage={canManage} />
              </div>
            </PanelCard>
          ) : null}

          <PanelCard title="Proveedores" id="suppliers-panel">
            {suppliers.length ? (
              <div className="space-y-2">
                {suppliers.map((supplier) => (
                  <Link prefetch={false} key={supplier.id} href={`/admin/compras/proveedores/${encodeURIComponent(supplier.id)}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 transition-colors hover:border-slate-200">
                    <span className="min-w-0">
                      <strong className="block truncate text-[11.5px] font-semibold text-slate-800">{supplier.name}</strong>
                      <small className="mt-0.5 block text-[10px] text-slate-400">{supplier.currency}</small>
                    </span>
                    <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-medium ${supplier.status === "ACTIVE" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-700"}`}>{supplier.status === "ACTIVE" ? "Activo" : "Inactivo"}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyRow icon={UsersRound} title="No hay proveedores" description="Registra un proveedor desde el flujo de compras." />
            )}
          </PanelCard>
        </div>
      </section>

      {canManage || canReceive ? (
        <section id="purchase-tools" className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <h2 className="mb-3 text-sm font-bold tracking-tight text-slate-900">Flujo de compras</h2>
          {controls}
        </section>
      ) : null}
    </div>
  );
}

function ScoreTile({ icon: Icon, tone, label, value, note }: { icon: typeof Clock; tone: "emerald" | "rose" | "blue"; label: string; value: string; note?: string }) {
  const toneClasses = tone === "emerald" ? "bg-emerald-50 text-emerald-600" : tone === "rose" ? "bg-rose-50 text-rose-500" : "bg-blue-50 text-blue-600";
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${toneClasses}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-medium text-slate-400">{label}</p>
        <p className="text-base font-bold leading-tight text-slate-900">{value}</p>
        {note ? <p className="mt-1 text-[10px] leading-4 text-slate-600">{note}</p> : null}
      </div>
    </div>
  );
}

function PanelCard({ title, subtitle, action, id, children }: { title: string; subtitle?: string; action?: ReactNode; id?: string; children: ReactNode }) {
  return (
    <div id={id} className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div>
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-[10.5px] text-slate-400">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="pt-3">{children}</div>
    </div>
  );
}

function EmptyRow({ icon: Icon, title, description }: { icon: typeof Boxes; title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
      <Icon className="mx-auto h-5 w-5 text-slate-300" />
      <p className="mt-1.5 text-[11.5px] font-semibold text-slate-600">{title}</p>
      <p className="mt-0.5 text-[10.5px] text-slate-400">{description}</p>
    </div>
  );
}

function AlertRow({ icon: Icon, tone, text }: { icon: typeof AlertTriangle; tone: "rose" | "blue"; text: string }) {
  return (
    <div className="flex items-start gap-2.5 text-xs">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone === "rose" ? "text-rose-500" : "text-blue-500"}`} />
      <p className="font-medium leading-snug text-slate-700">{text}</p>
    </div>
  );
}

function RequestRow({ request, locationById, queryString }: { request: PurchaseRequestListItem; locationById: Map<string, string>; queryString: string }) {
  const params = new URLSearchParams(queryString);
  params.set("requestId", request.id);
  return (
    <Link prefetch={false} href={`/admin/compras?${params.toString()}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 transition-colors hover:border-slate-200">
      <span className="min-w-0">
        <strong className="block truncate text-[11.5px] font-semibold text-slate-800">{request.code}</strong>
        <small className="mt-0.5 block truncate text-[10px] text-slate-400">{locationById.get(request.locationId ?? "") ?? "N/D"} · {request.itemCount} {request.itemCount === 1 ? "línea" : "líneas"}</small>
      </span>
      <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-medium ${statusBadge(request.status)}`}>{statusLabel(request.status)}</span>
    </Link>
  );
}

function PurchasesPager({ page, total, queryString, totalItems, pageSize }: { page: number; total: number; queryString: string; totalItems: number; pageSize: number }) {
  const href = (value: number) => {
    const params = new URLSearchParams(queryString);
    params.set("page", String(value));
    return `/admin/compras?${params.toString()}`;
  };
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(totalItems, page * pageSize);
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 sm:flex-row">
      <span className="text-xs text-slate-500">Mostrando {from} a {to} de {totalItems} órdenes</span>
      {total > 1 ? (
        <nav aria-label="Paginación de órdenes de compra" className="flex items-center gap-1">
          {pageNumbers(page, total).map((value) => (
            <Link prefetch={false} key={value} href={href(value)} aria-current={value === page ? "page" : undefined} className={value === page ? "flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-semibold text-white" : "flex h-7 w-7 items-center justify-center rounded-lg text-xs text-slate-600 hover:text-slate-900"}>
              {value}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

function RequestsPager({
  page,
  total,
  queryString,
  totalItems,
}: {
  page: number;
  total: number;
  queryString: string;
  totalItems: number;
}) {
  const href = (value: number) => purchaseRequestPageHref(queryString, value);
  return (
    <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
      <span>{totalItems} {totalItems === 1 ? "solicitud" : "solicitudes"}</span>
      {total > 1 ? (
        <div className="flex gap-1">
          {page > 1 ? <Link prefetch={false} href={href(page - 1)} className="rounded-md border border-slate-200 px-2 py-1">Anterior</Link> : <span role="link" aria-disabled="true" className="rounded-md border border-slate-200 px-2 py-1 opacity-50">Anterior</span>}
          <span className="px-2 py-1 font-semibold">{page}/{total}</span>
          {page < total ? <Link prefetch={false} href={href(page + 1)} className="rounded-md border border-slate-200 px-2 py-1">Siguiente</Link> : <span role="link" aria-disabled="true" className="rounded-md border border-slate-200 px-2 py-1 opacity-50">Siguiente</span>}
        </div>
      ) : null}
    </div>
  );
}

function PurchasesFilterBar({
  filters,
  suppliers,
  locations,
  facets,
}: {
  filters: PurchasesFilters;
  suppliers: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string }>;
  facets: PurchasesPageResponse["facets"];
}) {
  return (
    <form method="get" className="flex flex-wrap items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
      <label className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3">
        <input name="query" defaultValue={filters.query ?? ""} placeholder="Buscar por OC, proveedor, producto o referencia..." className="w-full bg-transparent text-xs font-medium text-slate-700 outline-none placeholder:text-slate-400" />
      </label>
      <select aria-label="Filtrar por estado" name="status" defaultValue={filters.status ?? ""} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700">
        <option value="">Todos los estados</option>
        {filterOptionsWithSelection(facets.statuses, filters.status ?? "").map((value) => (
          <option key={value} value={value}>{statusLabel(value)}</option>
        ))}
      </select>
      <select aria-label="Filtrar por proveedor" name="supplierId" defaultValue={filters.supplierId ?? ""} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700">
        <option value="">Todos los proveedores</option>
        {suppliers.map((supplier) => (
          <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
        ))}
      </select>
      <select aria-label="Filtrar por local" name="locationId" defaultValue={filters.locationId ?? ""} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700">
        <option value="">Todos los almacenes</option>
        {locations.map((location) => (
          <option key={location.id} value={location.id}>{location.name}</option>
        ))}
      </select>
      <details className="relative">
        <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700">Más filtros</summary>
        <div className="absolute right-0 z-30 mt-2 grid w-[min(92vw,560px)] gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl sm:grid-cols-2">
          <select name="currency" defaultValue={filters.currency ?? ""} className="h-10 rounded-lg border border-slate-200 px-2 text-xs">
            <option value="">Todas las monedas</option>
            {filterOptionsWithSelection(facets.currencies, filters.currency ?? "").map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <select name="attention" defaultValue={filters.attention ?? ""} className="h-10 rounded-lg border border-slate-200 px-2 text-xs">
            <option value="">Atención</option>
            <option value="DELAYED">Retrasada</option>
            <option value="PARTIAL">Parcial</option>
            <option value="INCIDENT">Incidencia</option>
            <option value="NORMAL">Normal</option>
          </select>
          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Creada desde<input type="date" name="createdFrom" defaultValue={filters.createdFrom ?? ""} className="h-10 rounded-lg border border-slate-200 px-2 text-xs font-medium normal-case text-slate-700" /></label>
          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Creada hasta<input type="date" name="createdTo" defaultValue={filters.createdTo ?? ""} className="h-10 rounded-lg border border-slate-200 px-2 text-xs font-medium normal-case text-slate-700" /></label>
          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Entrega desde<input type="date" name="expectedFrom" defaultValue={filters.expectedFrom ?? ""} className="h-10 rounded-lg border border-slate-200 px-2 text-xs font-medium normal-case text-slate-700" /></label>
          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Entrega hasta<input type="date" name="expectedTo" defaultValue={filters.expectedTo ?? ""} className="h-10 rounded-lg border border-slate-200 px-2 text-xs font-medium normal-case text-slate-700" /></label>
          <button className="h-10 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-blue-700 sm:col-span-2">Aplicar filtros</button>
        </div>
      </details>
      <button className="h-10 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-blue-700">Filtrar</button>
      <Link prefetch={false} href="/admin/compras" className="h-10 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 leading-10 transition-colors hover:bg-slate-50">Limpiar</Link>
    </form>
  );
}
