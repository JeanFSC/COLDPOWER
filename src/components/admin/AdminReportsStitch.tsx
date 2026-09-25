import Link from "next/link";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Download,
  Filter,
  Info,
  Package,
  ShoppingCart,
  Target,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { AdminLineChart } from "@/components/admin/AdminChartsLazy";
import { ReportScheduleControls } from "@/components/admin/ReportScheduleControls";
import type { DashboardFilters } from "@/lib/dashboard-contract";
import { getOperationsDashboard } from "@/lib/operations-dashboard";
import { formatPeriodDelta } from "@/lib/period-metrics";

type DashboardData = Awaited<ReturnType<typeof getOperationsDashboard>>;
type MetricTone = "blue" | "orange" | "green" | "red" | "purple";
type ReportSchedule = {
  id: string;
  name: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  nextRunAt: Date | string;
  lastRunAt: Date | string | null;
  status: "ACTIVE" | "PAUSED" | "CANCELLED";
  recipientRoles: string[];
  recipientUserIds: string[];
  runCount: number;
  lastRun: { status: string; finishedAt: Date | string | null; error: string | null } | null;
};

const tone: Record<MetricTone, { icon: string; dot: string }> = {
  blue: { icon: "bg-blue-50 text-blue-600", dot: "bg-blue-600" },
  orange: { icon: "bg-orange-50 text-orange-600", dot: "bg-orange-500" },
  green: { icon: "bg-emerald-50 text-emerald-600", dot: "bg-emerald-500" },
  red: { icon: "bg-rose-50 text-rose-600", dot: "bg-rose-500" },
  purple: { icon: "bg-violet-50 text-violet-600", dot: "bg-violet-500" },
};

function money(value: number | null | undefined, currency: string | null | undefined) {
  if (value === null || value === undefined || !currency || !Number.isFinite(value)) return "N/D";
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
function number(value: number | null | undefined) {
  return new Intl.NumberFormat("es-PE").format(value ?? 0);
}
function dateLabel(value: string) {
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short" }).format(
    new Date(`${value}T12:00:00-05:00`),
  );
}

function MetricSparkline({ tone, values }: { tone: MetricTone; values: number[] | undefined }) {
  const palette: Record<MetricTone, string> = {
    blue: "#3b82f6", orange: "#f97316", green: "#10b981", red: "#f43f5e", purple: "#8b5cf6",
  };
  const series = values?.filter(Number.isFinite) ?? [];
  if (series.length < 2) {
    const visualPath: Record<MetricTone, string> = {
      blue: "M0,18 C15,22 25,10 45,15 C65,20 75,5 100,10",
      orange: "M0,16 C18,22 30,12 55,14 C75,16 85,8 100,16",
      green: "M0,19 C16,11 31,18 50,8 C68,2 83,12 100,7",
      red: "M0,9 C18,17 32,6 51,15 C70,22 84,8 100,14",
      purple: "M0,17 C17,8 31,20 49,10 C69,2 82,15 100,8",
    };
    return <svg className="mt-1 h-6 w-full" viewBox="0 0 100 24" preserveAspectRatio="none" aria-label="Visual de tendencia pendiente de serie historica"><path d={visualPath[tone]} fill="none" stroke={palette[tone]} strokeWidth="2" strokeLinecap="round" /></svg>;
  }
  const high = Math.max(...series);
  const low = Math.min(...series);
  const range = Math.max(1, high - low);
  const path = series.map((value, index) => {
    const x = (index / (series.length - 1)) * 100;
    const y = 21 - ((value - low) / range) * 17;
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
  return <svg className="mt-1 h-6 w-full" viewBox="0 0 100 24" preserveAspectRatio="none" aria-label="Tendencia del indicador"><path d={path} fill="none" stroke={palette[tone]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function AdminReportsStitch({
  data,
  metrics,
  controls,
  exportHref,
  error,
  schedules,
  reportFilters,
  currentUserId,
  canViewCatalog,
}: {
  data: DashboardData | null;
  metrics: Array<{ label: string; value: string | number; note?: string; tone?: MetricTone }>;
  controls?: ReactNode;
  exportHref?: string;
  error?: string;
  schedules: ReportSchedule[];
  reportFilters: DashboardFilters;
  currentUserId: string;
  canViewCatalog: boolean;
}) {
  const currency = data?.currency;
  const previousSales = data?.previousSalesSeries.reduce((sum, row) => sum + row.total, 0) ?? 0;
  const conversionDelta =
    data?.conversion.percentage != null && data.previousConversion != null
      ? formatPeriodDelta(data.conversion.percentage, data.previousConversion)
      : null;
  const salesTrend = data?.salesSeries.map((row) => row.total);
  const orderTrend = data?.salesSeries.map((row) => row.orders ?? 0);
  const marginTrend = data?.salesSeries.some((row) => row.margin !== null && row.margin !== undefined)
    ? data.salesSeries.map((row) => row.margin ?? 0)
    : undefined;
  const ticketTrend = data?.salesSeries.map((row) => row.count > 0 ? row.total / row.count : 0);
  const ticketNow = data?.salesRange.count ? data.salesRange.total / data.salesRange.count : null;
  const salesDelta = data ? formatPeriodDelta(data.salesRange.total, previousSales) : null;
  const grossDelta = data?.grossProfit != null && data.previousGrossProfit != null
    ? formatPeriodDelta(data.grossProfit, data.previousGrossProfit)
    : null;
  const ticketDelta = ticketNow !== null && data?.previousAverageTicket != null
    ? formatPeriodDelta(ticketNow, data.previousAverageTicket)
    : null;
  const stockDelta = data ? formatPeriodDelta(data.comparisons.criticalStock.current, data.comparisons.criticalStock.previous) : null;
  const categories = data?.categorySummary.slice(0, 6) ?? [];
  const maxCategoryRevenue = Math.max(1, ...categories.map((item) => item.revenue));
  const insights: Array<{
    title: string;
    detail: string;
    href: string;
    icon: LucideIcon;
    className: string;
  }> = [];
  if (currency && salesDelta && salesDelta.direction !== "unavailable")
    insights.push({
      title: salesDelta.direction === "down" ? "Variación de ventas" : "Crecimiento en ventas",
      detail: `Las ventas ${salesDelta.direction === "down" ? "disminuyeron" : "aumentaron"}: ${salesDelta.label}.`,
      href: "#sales-trend",
      icon: salesDelta.direction === "down" ? ArrowDownRight : ArrowUpRight,
      className: salesDelta.direction === "down" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600",
    });
  if (data?.criticalStock)
    insights.push({
      title: "Stock en riesgo",
      detail: `${data.criticalStock} producto${data.criticalStock === 1 ? "" : "s"} con stock crítico requiere${data.criticalStock === 1 ? "" : "n"} atención.`,
      href: "/admin/inventario",
      icon: AlertCircle,
      className: "bg-amber-50 text-amber-500",
    });
  if (conversionDelta && conversionDelta.direction !== "unavailable")
    insights.push({
      title: "Conversión comercial",
      detail: `La tasa de conversión se movió: ${conversionDelta.label}.`,
      href: "/admin/crm?view=pipeline",
      icon: BarChart3,
      className: "bg-violet-50 text-violet-600",
    });
  if (currency && categories[0])
    insights.push({
      title: "Familia con mayor aporte",
      detail: `${categories[0].categoryName} representa ${categories[0].percentage.toFixed(1)}% de las ventas del periodo.`,
      href: "#category-sales",
      icon: Target,
      className: "bg-blue-50 text-blue-600",
    });

  return (
    <div className="mx-auto max-w-[1680px] space-y-6 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="grid size-12 place-items-center rounded-xl bg-blue-100 text-blue-600 shadow-sm">
            <BarChart3 className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reportes</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Analiza el desempeño de tu negocio con datos en tiempo real.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="#report-filters"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <CalendarDays className="size-3.5 text-slate-500" />
            Período
          </a>
          <a
            href="#report-filters"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Filter className="size-3.5 text-slate-500" />
            Filtros
          </a>
          <a
            href={exportHref}
            download
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <Download className="size-3.5" />
            Exportar
          </a>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {metrics.map((item) => {
          const Icon = item.label.includes("margen")
            ? BarChart3
            : item.label.includes("Stock")
              ? Package
              : item.label.includes("Pedidos")
                ? ShoppingCart
                : CircleDollarSign;
          const style = tone[item.tone ?? "blue"];
          const metricTone = item.tone ?? "blue";
          const trend = item.label.startsWith("Ventas")
            ? salesTrend
            : item.label.includes("Margen")
              ? marginTrend
              : item.label.includes("Ticket")
                ? ticketTrend
                : item.label.includes("Pedidos")
                  ? orderTrend
                  : undefined;
          const delta = item.label.startsWith("Ventas")
            ? salesDelta
            : item.label.includes("Margen")
              ? grossDelta
              : item.label.includes("Ticket")
                ? ticketDelta
                : item.label.includes("Stock")
                  ? stockDelta
                  : null;
          const deltaIsGood = delta?.direction === (item.label.includes("Stock") ? "down" : "up");
          return (
            <article
              key={item.label}
              className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm"
            >
              <div className="flex items-start gap-2.5">
                <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${style.icon}`}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-500">{item.label}</p>
                  <p className="mt-0.5 truncate text-lg font-bold leading-tight text-slate-900">{item.value}</p>
                </div>
              </div>
              <div className="mt-3">
                {!delta || delta.value === null ? <p className="text-[10px] font-normal text-slate-400">{delta?.label ?? item.note ?? "Sin datos previos"}</p> : <p className={`flex items-center gap-1 text-[11px] font-semibold ${deltaIsGood ? "text-emerald-600" : "text-rose-600"}`}><span aria-hidden="true">{delta.direction === "down" ? "↘" : "↗"}</span><span>{delta.label}</span></p>}
                <MetricSparkline tone={metricTone} values={trend} />
              </div>
            </article>
          );
        })}
      </section>

      {controls ? (
        <details
          id="report-filters"
          className="group rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-2">
              <Filter className="size-4 text-blue-600" />
              Filtros avanzados
            </span>
            <ChevronRight className="size-4 text-slate-400 transition group-open:rotate-90" />
          </summary>
          <div className="border-t border-slate-100 px-5 py-4">{controls}</div>
        </details>
      ) : null}

      {error ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <h2 className="text-sm font-bold text-rose-900">Reporte no disponible</h2>
          <p className="mt-1 text-xs text-rose-700">{error}</p>
        </section>
      ) : (
        <>
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.85fr)]">
            <article
              id="sales-trend"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Ventas y margen bruto</h2>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {currency ? `Montos expresados en ${currency}.` : "Moneda no disponible."}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-medium text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <i className="size-2 rounded-full bg-blue-600" />
                    Ventas netas
                  </span>
                  <span className="flex items-center gap-1.5">
                    <i className="size-2 rounded-full bg-slate-300" />
                    Periodo anterior
                  </span>
                </div>
              </div>
              <div className="mt-4 h-[245px]">
                {data?.salesSeries.length ? (
                  <AdminLineChart
                    comparison
                    data={data.salesSeries.map((row) => row.total)}
                    previous={data.previousSalesSeries.map((row) => row.total)}
                    labels={data.salesSeries.map((row) => dateLabel(row.date))}
                    currencyAxis
                    currency={currency}
                    ariaLabel="Ventas y margen bruto por periodo"
                  />
                ) : (
                  <p className="grid h-full place-items-center text-xs text-slate-400">
                    Sin ventas confirmadas en el periodo.
                  </p>
                )}
              </div>
            </article>
            <article
              id="category-sales"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="text-sm font-bold text-slate-900">Ventas por familia de productos</h2>
              <p className="mt-1 text-[10px] text-slate-400">
                Comparación del periodo seleccionado.
              </p>
              {currency && categories.length ? (
                <div className="mt-7 flex h-[218px] items-end gap-3 border-b border-slate-100 px-1">
                  {categories.map((category, index) => (
                    <div
                      key={category.categoryId}
                      className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                    >
                      <span className="truncate text-[10px] font-bold text-slate-700">
                        {money(category.revenue, currency)}
                      </span>
                      <div
                        className={`w-full max-w-12 rounded-t-md ${["bg-blue-600", "bg-cyan-500", "bg-violet-500", "bg-amber-500", "bg-pink-500", "bg-slate-400"][index]}`}
                        style={{
                          height: `${Math.max(12, (category.revenue / maxCategoryRevenue) * 154)}px`,
                        }}
                      />
                      <span
                        title={category.categoryName}
                        className="w-full truncate text-center text-[9px] font-medium text-slate-500"
                      >
                        {category.categoryName}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="grid h-[218px] place-items-center text-center text-xs text-slate-400">
                  {currency
                    ? "Sin familias con ventas."
                    : "Selecciona una moneda para comparar ventas por familia."}
                </p>
              )}
            </article>
          </section>
          <section className="grid gap-6 xl:grid-cols-12">
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-6">
              <div className="flex gap-6 border-b border-slate-100 px-5 pt-4 text-xs font-semibold">
                <span className="border-b-2 border-blue-600 pb-3 text-blue-600">Ventas</span>
                <span className="pb-3 text-slate-400">Inventario</span>
                <span className="pb-3 text-slate-400">Clientes</span>
              </div>
              <div className="flex items-center justify-between gap-3 px-5 py-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Detalle de ventas</h2>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Transacciones, montos y variación por periodo.
                  </p>
                </div>
                <a
                  href={exportHref}
                  download
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                >
                  <Download className="size-3" />
                  Exportar
                </a>
              </div>
              <div tabIndex={0} role="region" aria-label="Tabla de reportes por período" className="overflow-x-auto">
                <table className="w-full min-w-[570px] text-left text-[11px]">
                  <thead className="border-y border-slate-100 bg-slate-50/80 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Periodo</th>
                      <th className="px-3 py-3">Ventas netas</th>
                      <th className="px-3 py-3">Margen bruto</th>
                      <th className="px-3 py-3">Pedidos</th>
                      <th className="px-4 py-3 text-right">Variación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {(data?.salesSeries ?? [])
                      .slice(-6)
                      .reverse()
                      .map((row, index) => {
                        const previous = data?.previousSalesSeries.at(-(index + 1))?.total ?? 0;
                        const variation =
                          previous > 0 ? ((row.total - previous) / previous) * 100 : null;
                        return (
                          <tr key={row.date} className="hover:bg-slate-50/70">
                            <td className="px-4 py-3 font-medium text-slate-800">
                              {dateLabel(row.date)}
                            </td>
                            <td className="px-3 py-3 font-semibold text-slate-900">
                              {money(row.total, currency)}
                            </td>
                            <td className="px-3 py-3">
                              {data?.grossProfit == null
                                ? "N/D"
                                : money(data.grossProfit, currency)}
                            </td>
                            <td className="px-3 py-3">{number(row.orders)}</td>
                            <td
                              className={`px-4 py-3 text-right font-semibold ${variation == null ? "text-slate-400" : variation >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                            >
                              {variation == null
                                ? "N/D"
                                : `${variation >= 0 ? "+" : ""}${variation.toFixed(1)}%`}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
              <h2 className="text-sm font-bold text-slate-900">Productos más vendidos</h2>
              <p className="mt-1 border-b border-slate-100 pb-3 text-[10px] text-slate-400">
                Por monto facturado en el periodo.
              </p>
              <div className="mt-2 divide-y divide-slate-100">
                {currency ? (
                  (data?.topProducts ?? []).slice(0, 5).map((product, index) => (
                    <div
                      key={product.id}
                      className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2 py-3 text-[10px]"
                    >
                      <span className="font-semibold text-slate-400">{index + 1}</span>
                      {canViewCatalog ? (
                        <Link href={`/admin/catalogo/${product.id}`} className="truncate font-medium text-slate-800 hover:text-blue-600" title={product.name}>
                          {product.name}
                        </Link>
                      ) : (
                        <span className="truncate font-medium text-slate-800" title={product.name}>{product.name}</span>
                      )}
                      <span className="font-semibold text-slate-800">
                        {money(product.revenue, currency)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="py-6 text-center text-xs text-slate-400">
                    Selecciona una moneda para ordenar productos por monto.
                  </p>
                )}
              </div>
              {canViewCatalog ? (
                <Link href="/admin/catalogo" className="mt-4 inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700">
                  Ver todos los productos <ChevronRight className="ml-1 size-3.5" />
                </Link>
              ) : null}
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900">Insights y recomendaciones</h2>
                <Info className="size-4 text-slate-400" />
              </div>
              <div className="mt-4 space-y-4">
                {insights.length ? (
                  insights.map((insight) => {
                    const Icon = insight.icon;
                    return (
                      <div key={insight.title} className="flex items-start gap-3">
                        <span
                          className={`grid size-7 shrink-0 place-items-center rounded-full ${insight.className}`}
                        >
                          <Icon className="size-3.5" />
                        </span>
                        <div>
                          <p className="text-[11px] font-bold text-slate-900">{insight.title}</p>
                          <p className="mt-0.5 text-[10px] leading-snug text-slate-500">
                            {insight.detail}
                          </p>
                          <Link
                            href={insight.href}
                            className="mt-1 inline-flex items-center text-[10px] font-semibold text-blue-600 hover:underline"
                          >
                            Ver detalle <ChevronRight className="size-3" />
                          </Link>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400">
                    Sin evidencia suficiente para generar recomendaciones.
                  </p>
                )}
              </div>
            </article>
          </section>
          <details open className="group rounded-[14px] border border-[#e2eaf1] bg-white shadow-[0_1px_3px_rgba(16,42,67,0.035)]">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 text-xs font-semibold text-[#102a43]">
              <span>Reportes programados</span>
              <ChevronRight className="size-4 text-slate-400 transition group-open:rotate-90" />
            </summary>
            <div className="border-t border-[#edf2f6] px-5 py-4">
              <ReportScheduleControls
                schedules={schedules}
                filters={reportFilters}
                currentUserId={currentUserId}
              />
            </div>
          </details>
        </>
      )}
    </div>
  );
}
