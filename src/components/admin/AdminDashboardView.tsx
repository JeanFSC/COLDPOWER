import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Download,
  FileText,
  Image as ImageIcon,
  Info,
  Minus,
  Package,
  PackageCheck,
  Plus,
  ReceiptText,
  ShoppingCart,
  Tag,
  Target,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { can, type AppRole } from "@/lib/roles";
import { dashboardFiltersToQuery, type DashboardFilters, type DashboardRange } from "@/lib/dashboard-contract";
import { getOperationsDashboard } from "@/lib/operations-dashboard";
import { getOperationsWorkspace } from "@/lib/operations-workspace";
import type { OperationsFilters } from "@/lib/operations-contract";
import { AdminLineChart, AdminSparkline } from "@/components/admin/AdminChartsLazy";
import { AdminDashboardControls, DashboardGranularitySelect, type DashboardFilterOptions } from "@/components/admin/AdminDashboardControls";
import { AdminDashboardFooter } from "@/components/admin/AdminDashboardFooter";
import { AdminPendingActions } from "@/components/admin/AdminPendingActions";
import { AdminTooltip } from "@/components/admin/AdminTooltip";
import { Tanda2Dashboard, Tanda2Operations } from "@/components/admin/AdminTanda2Workspaces";

type DashboardData = Awaited<ReturnType<typeof getOperationsDashboard>>;
type OperationsSnapshot = Awaited<ReturnType<typeof getOperationsWorkspace>>;
type OperationsFilterOptions = {
  locations: Array<{ id: string; label: string }>;
  sellers: Array<{ id: string; label: string }>;
};

type AdminDashboardViewProps = {
  role: AppRole;
  data: DashboardData | null;
  snapshot: OperationsSnapshot | null;
  view?: "dashboard" | "operations";
  range?: DashboardRange | "all";
  selectedQueue?: keyof OperationsSnapshot["queues"];
  actorName?: string | null;
  operationsFilters?: OperationsFilters;
  operationsFilterOptions?: OperationsFilterOptions | null;
  filterOptions?: DashboardFilterOptions | null;
  loadedAt?: string;
};

const panelClass =
  "min-w-0 rounded-xl border border-[#e3ebf2] bg-white shadow-[0_1px_2px_rgba(16,42,67,0.03)]";
const mutedClass = "text-[#8195aa]";

const toneClasses = {
  blue: { bubble: "bg-[#e8f1ff] text-[#2277ee]", line: "text-[#2277ee]" },
  orange: { bubble: "bg-[#fff0df] text-[#f08b2d]", line: "text-[#f08b2d]" },
  green: { bubble: "bg-[#e0f7ee] text-[#1aa873]", line: "text-[#1aa873]" },
  red: { bubble: "bg-[#ffe5e5] text-[#ed4545]", line: "text-[#ed4545]" },
  purple: { bubble: "bg-[#eee8ff] text-[#8057e8]", line: "text-[#8057e8]" },
};

const emptyFilterOptions: DashboardFilterOptions = {
  locations: [],
  sellers: [],
  customers: [],
  products: [],
  categories: [],
  families: [],
  brands: [],
};

export function AdminDashboardView({
  role,
  data,
  snapshot,
  view = "dashboard",
  range = "month",
  selectedQueue,
  actorName,
  operationsFilters,
  operationsFilterOptions,
  filterOptions,
  loadedAt,
}: AdminDashboardViewProps) {
  if (
    view === "operations" ||
    role === "OPERACIONES_VENTAS" ||
    role === "ADMIN" ||
    role === "VENTAS" ||
    role === "ALMACEN" ||
    role === "COMPRAS"
  ) {
    return <Tanda2Operations snapshot={snapshot} role={role} range={range} selectedQueue={selectedQueue} actorName={actorName} filters={operationsFilters} filterOptions={operationsFilterOptions} />;
  }
  return <Tanda2Dashboard data={data} role={role} filterOptions={filterOptions} loadedAt={loadedAt} />;
}
function PageHeader({
  role,
  actorName,
  children,
}: {
  role: "superadmin" | "gerencia" | "operaciones";
  actorName?: string | null;
  children?: React.ReactNode;
}) {
  const displayName =
    actorName?.trim() ||
    (role === "superadmin" ? "Superadmin" : role === "gerencia" ? "Gerencia" : "Operaciones");
  const copy = {
    superadmin: {
      title: `Bienvenido, ${displayName} 👋`,
      subtitle: "Resumen operativo de la plataforma ColdPower",
    },
    gerencia: { title: `Bienvenido, ${displayName} 👋`, subtitle: "Resumen ejecutivo del negocio" },
    operaciones: {
      title: `Bienvenido, ${displayName} 👋`,
      subtitle: "Aquí tienes tus tareas y pendientes para hoy",
    },
  }[role];

  return (
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div>
        <h1 className="font-display text-[24px] font-black tracking-[-0.025em] text-[#102a43] sm:text-[25px]">
          {copy.title}
        </h1>
        <p className={`mt-1.5 text-[12px] font-semibold ${mutedClass}`}>{copy.subtitle}</p>
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

function ExportButton({ filters }: { filters: DashboardFilters }) {
  const query = dashboardFiltersToQuery(filters);
  return (
    <a
      href={`/api/admin/dashboard/export?${query.toString()}`}
      download="coldpower-dashboard.csv"
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#dce6ee] bg-white px-3.5 text-[11px] font-extrabold text-[#304b66] transition hover:border-[#2277ee] hover:text-[#2277ee]"
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      Exportar reporte
    </a>
  );
}

function NewQuoteButton() {
  return (
    <Link
      href="/admin/cotizaciones"
      className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#ff830e] px-4 text-[11px] font-extrabold text-white shadow-[0_5px_12px_rgba(255,131,14,0.18)] transition hover:bg-[#e97400]"
    >
      <Plus className="h-4 w-4" aria-hidden="true" />
      Nueva cotización
    </Link>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "blue",
  sparkline,
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon: LucideIcon;
  tone?: keyof typeof toneClasses;
  sparkline?: number[];
}) {
  const colors = toneClasses[tone];
  return (
    <article className={`${panelClass} min-h-[154px] p-4`}>
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${colors.bubble}`}
        >
          <Icon className="h-[21px] w-[21px]" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div className="min-w-0 pt-0.5">
          <p className={`text-[11px] font-semibold ${mutedClass}`}>{label}</p>
          <p className="mt-1 font-display text-[20px] font-black tracking-[-0.025em] text-[#102a43] sm:text-[21px]">
            {value}
          </p>
          {detail ? <p className={`mt-2 text-[10px] font-bold ${colors.line}`}>{detail}</p> : null}
        </div>
      </div>
      <AdminSparkline tone={tone} data={sparkline} />
    </article>
  );
}

function formatDashboardMoney(value: number, currency: string | null | undefined) {
  if (!currency) return "N/D";
  return new Intl.NumberFormat("es-PE", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function KpiComparisonIndicator({ comparison }: { comparison: DashboardData["kpiView"]["sales"]["comparison"] }) {
  if (!comparison?.comparisonAvailable || comparison.relativeDelta === null) {
    return <span className="mt-2 block text-[10px] font-bold text-[#8195aa]">Sin base comparable</span>;
  }
  const isPositive = comparison.relativeDelta > 0;
  const Icon = isPositive ? ArrowUpRight : comparison.relativeDelta < 0 ? ArrowDownRight : Minus;
  return <span className={`mt-2 inline-flex items-center gap-1 text-[10px] font-bold ${isPositive ? "text-[#1aa873]" : comparison.relativeDelta < 0 ? "text-[#ed4545]" : "text-[#8195aa]"}`}><Icon className="h-3 w-3" aria-hidden="true" />{Math.abs(comparison.relativeDelta).toFixed(1)}% vs. período anterior</span>;
}

function ExecutiveKpiCard({
  label,
  value,
  tone,
  icon: Icon,
  definition,
  detail,
  href,
  comparison,
  sparkline,
}: {
  label: string;
  value: string | number;
  tone: keyof typeof toneClasses;
  icon: LucideIcon;
  definition: string;
  detail: string;
  href?: string;
  comparison?: DashboardData["kpiView"]["sales"]["comparison"];
  sparkline?: number[];
}) {
  const colors = toneClasses[tone];
  const card = <article className={`${panelClass} min-h-[173px] p-4 transition ${href ? "hover:-translate-y-0.5 hover:border-[#b9d2eb] hover:shadow-[0_8px_20px_rgba(16,42,67,0.08)]" : ""}`}>
    <div className="flex items-start gap-3">
      <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${colors.bubble}`}><Icon className="h-[21px] w-[21px]" strokeWidth={1.8} aria-hidden="true" /></span>
      <div className="min-w-0 pt-0.5">
        <div className="flex items-center gap-1.5"><p className={`text-[11px] font-semibold ${mutedClass}`}>{label}</p><AdminTooltip label={definition}><Info className="h-3.5 w-3.5 text-[#9aabba]" aria-hidden="true" /></AdminTooltip></div>
        <p className="mt-1 font-display text-[23px] font-black tracking-[-0.025em] text-[#102a43]">{value}</p>
        {comparison ? <KpiComparisonIndicator comparison={comparison} /> : <p className={`mt-2 text-[10px] font-bold ${colors.line}`}>{detail}</p>}
      </div>
    </div>
    <AdminSparkline tone={tone} data={sparkline} ariaLabel={sparkline?.some((item) => item > 0) ? `Tendencia real de ${label.toLowerCase()}` : `${detail}; sin serie histórica comparable`} />
  </article>;
  return href ? <Link href={href} aria-label={`${label}: ${value}`}>{card}</Link> : card;
}

function PanelHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-[14px] font-extrabold text-[#102a43]">{title}</h2>
        {subtitle ? (
          <p className={`mt-1 text-[10px] font-semibold ${mutedClass}`}>{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function formatSalesDateLabel(value: string, granularity: DashboardData["granularity"]) {
  const isHour = value.includes("T");
  const date = new Date(isHour ? `${value}:00-05:00` : `${value}T12:00:00-05:00`);
  if (granularity === "hour") {
    return new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Lima" }).format(date);
  }
  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
    timeZone: "America/Lima",
  }).format(date).replace(".", "");
}

function ManagementDashboard({
  variant,
  data,
  range,
  actorName,
  filterOptions,
  loadedAt,
}: {
  variant: "superadmin" | "gerencia";
  data: DashboardData | null;
  range: DashboardRange;
  actorName?: string | null;
  filterOptions?: DashboardFilterOptions | null;
  loadedAt?: string;
}) {
  if (!data) {
    return (
      <div className="space-y-4">
        <PageHeader role={variant} actorName={actorName} />
        <section className={`${panelClass} flex min-h-[260px] flex-col items-center justify-center px-5 py-12 text-center`} role="alert" aria-live="assertive">
          <TriangleAlert className="h-8 w-8 text-[#ed4545]" aria-hidden="true" />
          <h2 className="mt-4 text-[15px] font-extrabold text-[#304b66]">No pudimos cargar el dashboard</h2>
          <p className="mt-2 max-w-md text-[11px] font-semibold leading-5 text-[#8195aa]">No mostramos métricas de respaldo porque la fuente persistente no respondió. Intenta nuevamente para consultar datos reales.</p>
          <Link href="/admin/dashboard" className="mt-4 inline-flex h-10 items-center rounded-lg bg-[#102a43] px-4 text-[11px] font-extrabold text-white transition hover:bg-[#1e4668]">Reintentar</Link>
        </section>
      </div>
    );
  }
  const sales = formatDashboardMoney(data.salesRange.total, data.currency);
  const salesLabel = range === "month" ? "Ventas del mes" : "Ventas del período";
  const salesSeries = data.salesSeries.map((row) => row.total);
  const salesLabels = data.salesSeries.map((row) => formatSalesDateLabel(row.date, data.granularity));
  const salesPointDetails = data.salesSeries.map((row, index) => {
    const date = row.date.slice(0, 10);
    return {
      ...row,
      previousTotal: data.previousSalesSeries[index]?.total ?? 0,
      href: `/admin/ventas?createdFrom=${encodeURIComponent(date)}&createdTo=${encodeURIComponent(date)}${data.currency ? `&currency=${encodeURIComponent(data.currency)}` : ""}`,
    };
  });
  const kpiView = data.kpiView;

  return (
    <div className="space-y-4">
      <PageHeader role={variant} actorName={actorName}>
        <AdminDashboardControls
          filters={data.filters}
          availableCurrencies={data.availableCurrencies}
          options={filterOptions ?? emptyFilterOptions}
        />
        <ExportButton filters={data.filters} />
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ExecutiveKpiCard label={salesLabel} value={sales} tone="blue" icon={CircleDollarSign} definition="Ventas confirmadas en el período seleccionado, respetando todos los filtros activos y una sola moneda." detail={data.salesRange.count ? "Ventas confirmadas" : "Sin ventas confirmadas en el período"} comparison={kpiView.sales.comparison} sparkline={salesSeries} />
        <ExecutiveKpiCard label="Cotizaciones abiertas" value={kpiView.openQuotes.value} tone="orange" icon={FileText} definition="Cotizaciones que no están rechazadas, vencidas, convertidas ni canceladas en el alcance actual." detail="Estado actual" href="/admin/cotizaciones?status=open" />
        <ExecutiveKpiCard label="Pedidos activos" value={kpiView.activeOrders.value} tone="green" icon={ShoppingCart} definition="Pedidos cuyo estado aún requiere operación; entregados y cancelados quedan fuera." detail="Estado actual" href="/admin/pedidos?status=active" />
        <ExecutiveKpiCard label="Stock crítico" value={kpiView.criticalStock.value} tone="red" icon={TriangleAlert} definition="Productos cuyo stock disponible está en cero o por debajo del mínimo configurado." detail="Estado actual" href="/admin/inventario?critical=true" />
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_270px]">
        <div className="grid min-w-0 gap-4">
          <section className={`${panelClass} min-h-[330px] p-4 sm:p-5`}>
          <PanelHeader title="Evolución de ventas" subtitle="Ventas confirmadas vs. período anterior" action={<DashboardGranularitySelect filters={data.filters} value={data.granularity} />} />
          <div className="mt-3 flex items-center gap-4 text-[10px] font-semibold text-[#71869c]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-5 bg-[#2277ee]" />
              Actual
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-5 border-t border-dashed border-[#8fbaf6]" />
              Anterior
            </span>
          </div>
          {data.salesSeries.some((row) => row.total > 0) ? (
            <div className="mt-1">
              <AdminLineChart
                comparison
                accent="blue"
                data={salesSeries}
                previous={data.previousSalesSeries.map((row) => row.total)}
                labels={salesLabels}
                currencyAxis
                currency={data.currency}
                pointDetails={salesPointDetails}
                ariaLabel="Evolución de ventas confirmadas y comparación con el período anterior"
              />
            </div>
          ) : (
            <div className="mt-4 flex min-h-[190px] flex-col items-center justify-center rounded-lg border border-dashed border-[#d6e2eb] bg-[#f8fafc] px-5 text-center">
              <BarChart3 className="h-7 w-7 text-[#9db0c1]" aria-hidden="true" />
              <p className="mt-3 text-[11px] font-extrabold text-[#304b66]">
                Aún no hay ventas confirmadas en este período.
              </p>
              <p className="mt-1 max-w-xs text-[10px] font-semibold leading-5 text-[#8195aa]">
                Cuando exista actividad comercial, la evolución aparecerá aquí con su comparación.
              </p>
              <Link
                href="/admin/cotizaciones"
                className="mt-3 inline-flex items-center gap-1 text-[10px] font-extrabold text-[#2277ee]"
              >
                Revisar cotizaciones <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </div>
          )}
          </section>
          <PipelinePanel data={data} />
          <TopProductsPanel data={data} />
        </div>
        <aside className="grid min-w-0 content-start gap-4">
          <AdminPendingActions actions={data.pendingActions} />
          <ActivityPanel activities={data.recentActivity} />
        </aside>
      </div>
      <AdminDashboardFooter loadedAt={loadedAt} />
    </div>
  );
}

function OperationsRangePicker({ range }: { range: DashboardRange }) {
  return (
    <form action="/admin/operaciones" method="get" className="flex items-center gap-2">
      <label htmlFor="operations-range" className="sr-only">Período operativo</label>
      <span className="hidden items-center gap-1.5 text-[10px] font-bold text-[#526b84] sm:inline-flex">
        <CalendarDays className="h-4 w-4 text-[#526b84]" aria-hidden="true" />
        Período operativo
      </span>
      <select id="operations-range" name="range" defaultValue={range} className="h-9 rounded-lg border border-[#dfe8ef] bg-white px-2.5 text-[10px] font-bold text-[#304b66] outline-none focus:border-[#2277ee]">
        <option value="today">Hoy</option>
        <option value="yesterday">Ayer</option>
        <option value="week">Últimos 7 días</option>
        <option value="month">Últimos 30 días</option>
        <option value="all">Todo</option>
        <option value="custom">Personalizado</option>
      </select>
      <button type="submit" className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#102a43] px-2.5 text-[10px] font-extrabold text-white transition hover:bg-[#1e4668]">
        Aplicar <ChevronDown className="h-3 w-3 rotate-[-90deg]" aria-hidden="true" />
      </button>
    </form>
  );
}

function PipelinePanel({ data }: { data: DashboardData | null }) {
  const rows = data?.pipelineMacroSummary ?? [];
  const total = data?.pipelineActiveTotal ?? { count: 0, amount: 0 };
  const currency = data?.currency;
  const hasActivePipeline = rows.some((row) => row.count > 0);
  const stageTones = ["bg-[#eaf2ff]", "bg-[#e8f7fb]", "bg-[#e8f7ee]", "bg-[#fff4e6]", "bg-[#fff0e4]"];
  return (
    <section className={`${panelClass} min-h-[320px] p-4`}>
      <PanelHeader title="Pipeline de ventas" subtitle="Oportunidades activas por macroetapa" action={<AdminTooltip label="Incluye oportunidades activas. Perdidas y canceladas no forman parte del total activo."><Info className="h-3.5 w-3.5 text-[#9aabba]" aria-label="Definición del pipeline" /></AdminTooltip>} />
      {hasActivePipeline ? (
        <div className="mt-4 grid gap-2">
          {rows.map((stage, index) => {
            const stageQuery = stage.stages.join(",");
            return (
              <Link key={stage.macroStage} href={`/admin/crm?view=pipeline&stage=${encodeURIComponent(stageQuery)}`} className={`group rounded-lg px-3 py-2.5 ${stageTones[index % stageTones.length]} transition hover:ring-1 hover:ring-[#2277ee]/40`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-[10px] font-bold text-[#304b66]">{stage.macroStageLabel}</span>
                  <span className="shrink-0 text-[9px] font-extrabold text-[#526b84]">{stage.count} · {stage.share.toFixed(0)}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70">
                  <span className="block h-full rounded-full bg-[#2277ee] transition group-hover:bg-[#102a43]" style={{ width: `${Math.min(100, Math.max(0, stage.share * 100))}%` }} />
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2 text-[9px] font-semibold text-[#526b84]">
                  <span>{stage.stages.length} {stage.stages.length === 1 ? "etapa" : "etapas"}</span>
                  <span>{formatDashboardMoney(stage.amount, currency)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-4">
          <EmptyRow text="No hay oportunidades activas con este alcance." />
          <Link href="/admin/crm?view=pipeline" className="mt-3 flex justify-center text-[10px] font-extrabold text-[#2277ee]">Abrir pipeline</Link>
        </div>
      )}
      <div className="mt-4 flex items-center justify-between border-t border-[#edf2f6] pt-3 text-[11px] font-extrabold text-[#102a43]">
        <span>Total pipeline</span>
        <span>
          {total.count}{" "}
          <span className="ml-3 font-semibold text-[#526b84]">{formatDashboardMoney(total.amount, currency)}</span>
        </span>
      </div>
      {data?.pipelineLostTotal.count ? <p className="mt-2 text-right text-[9px] font-semibold text-[#9aabba]">{data.pipelineLostTotal.count} perdidas/canceladas excluidas</p> : null}
    </section>
  );
}

function TopProductsPanel({ data }: { data: DashboardData | null }) {
  const rows = data?.topProducts ?? [];
  return (
    <section className={`${panelClass} min-h-[320px] p-4`}>
      <PanelHeader title="Productos más vendidos" subtitle="Ventas confirmadas del período" />
      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_auto_96px] items-center gap-2 border-b border-[#edf2f6] pb-2 text-[9px] font-bold text-[#8195aa]">
        <span>Producto</span>
        <span title="Unidades vendidas">Ventas</span>
        <span>Ingresos</span>
        <span>Tendencia</span>
      </div>
      {rows.length ? (
        <div className="grid gap-0.5">
          {rows.slice(0, 5).map((row, index) => (
            <Link key={row.id} href={`/admin/catalogo?query=${encodeURIComponent(row.sku)}`} className="grid grid-cols-[minmax(0,1fr)_auto_auto_96px] items-center gap-2 border-b border-[#f0f4f7] py-2 last:border-0 hover:bg-[#fbfdff]">
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex h-6 w-5 shrink-0 items-center justify-center text-[10px] font-black text-[#8195aa]">{index + 1}</span>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#f5f8fa]">
                  <Image src={row.primaryImageUrl ?? "/images/product-placeholder-repuesto.svg"} alt="" width={26} height={26} className="h-6 w-6 object-contain" />
                </div>
                <span className="min-w-0 truncate text-[9px] font-bold text-[#304b66]">{row.name}<small className="mt-0.5 block truncate text-[8px] font-semibold text-[#9aabba]">{row.sku}{row.categoryName ? ` · ${row.categoryName}` : ""}</small></span>
              </div>
              <span className="text-[9px] font-semibold text-[#526b84]">{row.units}</span>
              <span className="text-[9px] font-semibold text-[#526b84]">{formatDashboardMoney(row.revenue, data?.currency)}</span>
              <span className="flex w-24 items-center" title={row.trend?.length ? "Tendencia de ingresos confirmados del período" : "Sin datos históricos suficientes para representar una tendencia"}>
                <AdminSparkline tone="blue" data={row.trend} ariaLabel={row.trend?.length ? `Tendencia de ingresos de ${row.name}` : `Sin tendencia histórica suficiente para ${row.name}`} />
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-3">
          <EmptyRow text="Todavía no existen ventas confirmadas en este período." />
        </div>
      )}
      <Link href="/admin/catalogo" className="mt-3 flex items-center justify-center border-t border-[#edf2f6] pt-3 text-[10px] font-extrabold text-[#2277ee]">
        Ver todos los productos <ArrowUpRight className="ml-1 h-3 w-3" aria-hidden="true" />
      </Link>
    </section>
  );
}

function activityTone(activity: DashboardData["recentActivity"][number]) {
  const value = `${activity.actionLabel} ${activity.entityLabel} ${activity.entityType}`.toLowerCase();
  if (value.includes("cotiz")) return { avatar: "bg-[#fff0df] text-[#f08b2d]", badge: "bg-[#fff6ec] text-[#f08b2d]" };
  if (value.includes("pedido") || value.includes("venta")) return { avatar: "bg-[#e0f7ee] text-[#1aa873]", badge: "bg-[#eafaf3] text-[#1aa873]" };
  if (value.includes("invent") || value.includes("stock")) return { avatar: "bg-[#e4f7f2] text-[#1aa873]", badge: "bg-[#eafaf3] text-[#1aa873]" };
  if (value.includes("cliente") || value.includes("customer")) return { avatar: "bg-[#eee8ff] text-[#8057e8]", badge: "bg-[#f4f0ff] text-[#8057e8]" };
  return { avatar: "bg-[#e8f1ff] text-[#2277ee]", badge: "bg-[#edf4ff] text-[#2277ee]" };
}

function activitySectionLabel(activity: DashboardData["recentActivity"][number]) {
  const value = `${activity.actionLabel} ${activity.entityLabel} ${activity.entityType}`.toLowerCase();
  if (value.includes("precio") || value.includes("price")) return "Precios";
  if (value.includes("cotiz")) return "Cotizaciones";
  if (value.includes("invent") || value.includes("stock")) return "Inventario";
  if (value.includes("pedido") || value.includes("venta")) return "Pedidos";
  if (value.includes("cliente") || value.includes("customer")) return "Clientes";
  if (value.includes("editorial") || value.includes("producto")) return "Productos";
  return "Actividad";
}

function activityTimeLabel(value: string | Date) {
  const createdAt = new Date(value).getTime();
  if (!Number.isFinite(createdAt)) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - createdAt) / 60000));
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
  const days = Math.floor(hours / 24);
  return `Hace ${days} ${days === 1 ? "día" : "días"}`;
}

function activityInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "CP";
}

function activityHref(activity: DashboardData["recentActivity"][number]) {
  const entityId = encodeURIComponent(activity.entityId);
  if (activity.entityType === "product") return `/admin/catalogo/${entityId}`;
  if (activity.entityType === "opportunity") return `/admin/crm?view=pipeline&query=${encodeURIComponent(activity.entityLabel)}`;
  if (activity.entityType === "payment") return `/admin/pagos?orderId=${entityId}`;
  if (activity.entityType === "customer") return `/admin/clientes?query=${encodeURIComponent(activity.entityLabel)}`;
  if (activity.entityType === "user") return `/admin/usuarios?query=${encodeURIComponent(activity.entityLabel)}`;
  if (activity.entityType === "quote") return "/admin/cotizaciones";
  if (activity.entityType === "order") return "/admin/pedidos";
  if (activity.entityType === "sale") return "/admin/ventas";
  return "/admin/auditoria";
}

function ActivityPanel({ activities }: { activities: DashboardData["recentActivity"] }) {
  return (
    <section className={`${panelClass} min-h-[320px] p-4`}>
      <PanelHeader title="Actividad reciente" subtitle="Últimas acciones en la plataforma" />
      <div className="mt-3 grid">
        {activities.length ? activities.slice(0, 5).map((activity) => {
          const tone = activityTone(activity);
          return (
            <Link href={activityHref(activity)} key={activity.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-[#edf2f6] py-2.5 last:border-0 hover:bg-[#fbfdff]">
              <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-extrabold ${tone.avatar}`}>
                {activityInitials(activity.actorName)}
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-[9px] font-extrabold text-[#526b84]">{activity.actionLabel}</strong>
                <small className="mt-0.5 block truncate text-[9px] font-semibold text-[#304b66]">{activity.entityLabel} · {activity.actorName}</small>
              </span>
              <span className="shrink-0 text-right">
                <time className="block text-[8px] font-semibold text-[#9aabba]">{activityTimeLabel(activity.createdAt)}</time>
                <small className={`mt-1 inline-flex rounded-md px-1.5 py-1 text-[8px] font-extrabold ${tone.badge}`}>{activitySectionLabel(activity)}</small>
              </span>
            </Link>
          );
        }) : <EmptyRow text="Aún no hay actividad comercial confirmada en este período." />}
      </div>
      <Link href="/admin/auditoria" className="mt-3 flex justify-center border-t border-[#edf2f6] pt-3 text-[10px] font-extrabold text-[#2277ee]">Ver toda la actividad</Link>
    </section>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <p className="rounded-lg bg-[#f8fafc] px-3 py-5 text-center text-[10px] font-semibold text-[#8195aa]">
      {text}
    </p>
  );
}

function formatOperationsDate(value: unknown) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", timeZone: "America/Lima" })
    .format(date)
    .replace(".", "");
}

function OperationsDashboard({
  snapshot,
  role,
  range,
  actorName,
}: {
  snapshot: OperationsSnapshot | null;
  role: AppRole;
  range: DashboardRange;
  actorName?: string | null;
}) {
  const cards = [
    ["Cotizaciones pendientes", snapshot?.metrics.openQuotes ?? 0, "Datos operativos", ReceiptText, "blue"],
    ["Seguimientos vencidos", snapshot?.metrics.overdueTasks ?? 0, "Requieren atención", Clock3, "green"],
    [
      "Oportunidades abiertas",
      snapshot?.metrics.openOpportunities ?? 0,
      "Datos operativos",
      Target,
      "purple",
    ],
    [
      "Pedidos por preparar",
      snapshot?.metrics.preparingOrders ?? 0,
      "Estado operativo",
      ShoppingCart,
      "orange",
    ],
    [
      "Alertas de stock",
      snapshot?.metrics.criticalStock ?? 0,
      "Productos en nivel crítico",
      PackageCheck,
      "red",
    ],
    [
      "Productos sin stock",
      snapshot?.metrics.noStockProducts ?? 0,
      "Revisión de inventario",
      Tag,
      "orange",
    ],
  ] as const;
  return (
    <div className="space-y-4">
      <PageHeader role="operaciones" actorName={actorName}>
        <OperationsRangePicker range={range} />
        {can(role, "quotes.create") ? <NewQuoteButton /> : null}
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {cards.map(([label, value, detail, Icon, tone]) => (
          <MetricCard
            key={label}
            label={label}
            value={value}
            detail={detail}
            icon={Icon}
            tone={tone}
          />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.9fr_1fr]">
        <div className="min-w-0">
          <OperationsKanban snapshot={snapshot} />
          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <OperationsList
              title="Cotizaciones pendientes"
              count={snapshot?.metrics.openQuotes ?? 0}
              href="/admin/cotizaciones"
              icon={ReceiptText}
              action="Ver todas"
              items={snapshot?.queues.quotes}
              kind="quotes"
            />
            <OperationsList
              title="Seguimientos de hoy"
              count={snapshot?.metrics.overdueTasks ?? 0}
              href="/admin/crm"
              icon={Clock3}
              action="Ver todos"
              items={snapshot?.queues.followUps}
              kind="followUps"
            />
            <OperationsList
              title="Alertas de stock"
              count={snapshot?.metrics.criticalStock ?? 0}
              href="/admin/inventario"
              icon={TriangleAlert}
              action="Ver alertas"
              items={snapshot?.queues.inventoryAlerts}
              kind="inventoryAlerts"
            />
          </div>
        </div>
        <div className="min-w-0">
          <OperationsAwaitingOrders snapshot={snapshot} />
          <div className="mt-4">
            <OperationsQuickActions role={role} />
          </div>
          {can(role, "cms.view") ? (
            <div className="mt-4">
              <ContentBanner />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function OperationsKanban({ snapshot }: { snapshot: OperationsSnapshot | null }) {
  const total = snapshot?.metrics.openOpportunities ?? 0;
  const opportunities = snapshot?.queues.opportunities ?? [];
  const columns = [
    { key: "NEW", label: "Nuevo", tone: "bg-[#edf4ff]", dot: "bg-[#2277ee]" },
    { key: "QUOTING", label: "Cotizando", tone: "bg-[#fff4e6]", dot: "bg-[#ff830e]" },
    { key: "FOLLOW_UP", label: "Seguimiento", tone: "bg-[#edf9f3]", dot: "bg-[#1aa873]" },
    { key: "SALE", label: "Venta", tone: "bg-[#eef4ff]", dot: "bg-[#2277ee]" },
  ] as const;
  const stageFor = (stage?: string) => {
    const normalized = String(stage ?? "").toUpperCase().replace(/[^A-Z_]/g, "_");
    if (normalized.includes("COTIZ")) return "QUOTING";
    if (normalized.includes("SEGU")) return "FOLLOW_UP";
    if (normalized.includes("VENT") || normalized.includes("SALE") || normalized.includes("GAN")) return "SALE";
    return "NEW";
  };

  return (
    <section className={`${panelClass} min-w-0 p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-extrabold text-[#102a43]">
            Pipeline de oportunidades{" "}
            <span className="ml-1 rounded-full bg-[#eef3f8] px-1.5 py-0.5 text-[9px] text-[#8195aa]">{total}</span>
          </h2>
          <p className={`mt-1 text-[10px] font-semibold ${mutedClass}`}>Arrastra y suelta para avanzar las oportunidades.</p>
        </div>
        <div className="flex gap-2">
          <label className="inline-flex h-9 items-center rounded-lg border border-[#dfe8ef] bg-white px-2.5 text-[10px] font-bold text-[#304b66]">
            <span className="sr-only">Ordenar oportunidades</span>
            <select aria-label="Ordenar oportunidades" defaultValue="potential" className="bg-transparent outline-none">
              <option value="potential">Valor potencial</option>
              <option value="age">Antigüedad</option>
              <option value="recent">Más recientes</option>
            </select>
          </label>
          <button type="button" disabled title="Más opciones" className="inline-flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-lg border border-[#dfe8ef] bg-[#f7fafc] text-[#a9bac8]" aria-label="Más opciones">…</button>
        </div>
      </div>
      <div className="mt-4 grid gap-2 overflow-x-auto pb-1 md:grid-cols-4">
        {columns.map((column) => {
          const rows = opportunities.filter((item) => stageFor(String(item.stage)) === column.key).slice(0, 3);
          return (
            <div key={column.key} className="min-w-0 rounded-lg border border-[#e5edf3] bg-[#fbfdff] p-2">
              <div className={`flex items-center justify-between rounded-md px-2 py-2 ${column.tone}`}>
                <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#304b66]"><span className={`h-1.5 w-1.5 rounded-full ${column.dot}`} />{column.label}</span>
                <span className="text-[9px] font-extrabold text-[#526b84]">{rows.length}</span>
              </div>
              <div className="mt-2 grid gap-2">
                {rows.length ? rows.map((item) => {
                  const row = item as { id: string; code?: string; customer?: string | null; seller?: string | null; nextAction?: string | null; due?: unknown };
                  return (
                    <Link key={row.id} href={`/admin/crm?view=pipeline&opportunityId=${encodeURIComponent(row.id)}`} className="block rounded-md border border-[#e3ebf2] bg-white p-2.5 shadow-[0_1px_2px_rgba(16,42,67,0.03)] hover:border-[#2277ee]">
                      <strong className="block truncate text-[9px] text-[#304b66]">{row.customer ?? "Cliente no identificado"}</strong>
                      <span className="mt-1 block truncate text-[9px] font-semibold text-[#8195aa]">{row.code ?? "Oportunidad"}</span>
                      <span className="mt-2 block truncate text-[9px] font-semibold text-[#526b84]">{row.nextAction ?? "Sin próxima acción"}</span>
                      <span className="mt-2 flex items-center justify-between gap-1 text-[8px] font-bold text-[#9aabba]"><span>{row.seller ?? "Sin vendedor"}</span><span>{formatOperationsDate(row.due) || "Hoy"}</span></span>
                    </Link>
                  );
                }) : <p className="rounded-md border border-dashed border-[#d6e2eb] px-2 py-5 text-center text-[9px] font-semibold text-[#9aabba]">Sin oportunidades</p>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function OperationsAwaitingOrders({ snapshot }: { snapshot: OperationsSnapshot | null }) {
  const orders = snapshot?.queues.orders ?? [];
  const priorityLabel = (priority?: string, status?: string) => {
    const value = `${priority ?? ""} ${status ?? ""}`.toUpperCase();
    if (value.includes("ALTA") || value.includes("URG")) return "Prioritario";
    if (value.includes("MEDIA") || value.includes("MEDIO")) return "Medio";
    return "Bajo";
  };
  const priorityClass = (label: string) =>
    label === "Prioritario"
      ? "border-[#ffc9c9] bg-[#fff0f0] text-[#ed4545]"
      : label === "Medio"
        ? "border-[#ffd8ac] bg-[#fff7ec] text-[#f08b2d]"
        : "border-[#bce6d0] bg-[#effaf4] text-[#1a9d68]";

  return (
    <section className={`${panelClass} p-4`}>
      <PanelHeader
        title="Pedidos por atender"
        subtitle={`${snapshot?.metrics.activeOrders ?? 0} pendientes`}
        action={<Link href="/admin/pedidos" className="text-[10px] font-extrabold text-[#2277ee]">Ver todos</Link>}
      />
      <div className="mt-4 grid gap-0">
        {orders.length ? orders.slice(0, 5).map((item) => {
          const row = item as { id: string; code?: string; customer?: string; status?: string; location?: string; priority?: string; date?: unknown };
          const priority = priorityLabel(row.priority, row.status);
          return (
            <Link key={row.id} href={`/admin/pedidos?orderId=${encodeURIComponent(row.id)}`} className="flex items-center gap-2 border-b border-[#edf2f6] py-3 last:border-0 hover:bg-[#fbfdff]">
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-[9px] text-[#304b66]">{row.code ?? "Pedido"}</strong>
                <span className="mt-1 block truncate text-[9px] font-semibold text-[#8195aa]">{row.customer ?? "Cliente no identificado"}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-[9px] font-semibold text-[#526b84]">{formatOperationsDate(row.date) || row.location || "Pendiente"}</span>
                <span className={`mt-1 inline-flex rounded-md border px-2 py-1 text-[8px] font-extrabold ${priorityClass(priority)}`}>{priority}</span>
              </span>
            </Link>
          );
        }) : <EmptyRow text="No hay pedidos pendientes para estos filtros." />}
      </div>
      <Link href="/admin/pedidos" className="mt-3 flex justify-center border-t border-[#edf2f6] pt-3 text-[10px] font-extrabold text-[#2277ee]">
        + Ver {Math.max(0, orders.length - 5)} pedidos más
      </Link>
    </section>
  );
}

function OperationsList({
  title,
  count,
  href,
  icon: Icon,
  action,
  items = [],
  kind,
}: {
  title: string;
  count: number;
  href: string;
  icon: LucideIcon;
  action: string;
  items?: Array<Record<string, unknown>>;
  kind: "quotes" | "followUps" | "inventoryAlerts";
}) {
  return (
    <section className={`${panelClass} p-4`}>
      <PanelHeader
        title={title}
        subtitle={`${count} pendientes`}
        action={
          <Link href={href} className="text-[10px] font-extrabold text-[#2277ee]">
            {action}
          </Link>
        }
      />
      <div className="mt-3">
        {items.length ? <div className="grid gap-2">{items.slice(0, 5).map((item, index) => {
          const id = String(item.id ?? index);
          const title = String(item.customer ?? item.product ?? item.title ?? item.code ?? "Registro operativo");
          const detail = kind === "inventoryAlerts" ? `${String(item.sku ?? "Sin SKU")} · ${String(item.severity ?? "ALERTA")} · disponible ${String(item.available ?? "0")}` : kind === "followUps" ? `${String(item.opportunity ?? "Sin oportunidad")} · ${item.due ? new Date(String(item.due)).toLocaleDateString("es-PE") : "Sin vencimiento"}` : `${String(item.code ?? "Sin código")} · ${String(item.status ?? "Pendiente")}`;
          const itemHref = kind === "inventoryAlerts" ? `/admin/inventario?productId=${encodeURIComponent(id)}` : kind === "followUps" ? `/admin/crm?view=pipeline&taskId=${encodeURIComponent(id)}` : `/admin/cotizaciones?quoteId=${encodeURIComponent(id)}`;
          return <Link key={id} href={itemHref} className="flex items-center gap-2 rounded-lg border border-[#edf2f6] px-3 py-2.5 hover:border-[#2277ee]"><Icon className="h-4 w-4 shrink-0 text-[#8195aa]" /><span className="min-w-0"><strong className="block truncate text-[10px] text-[#304b66]">{title}</strong><small className="mt-0.5 block truncate text-[9px] font-semibold text-[#8195aa]">{detail}</small></span></Link>;
        })}</div> : <div className="flex items-center gap-2 rounded-lg border border-dashed border-[#d6e2eb] bg-[#f8fafc] px-3 py-4"><Icon className="h-4 w-4 shrink-0 text-[#8195aa]" /><p className="text-[10px] font-semibold text-[#8195aa]">No hay registros pendientes para estos filtros.</p></div>}
      </div>
      <Link
        href={href}
        className="mt-3 flex justify-center border-t border-[#edf2f6] pt-3 text-[10px] font-extrabold text-[#2277ee]"
      >
        Ver pendientes
      </Link>
    </section>
  );
}

function OperationsQuickActions({ role }: { role: AppRole }) {
  const actions: Array<[string, string, LucideIcon]> = [];
  if (can(role, "quotes.create")) actions.push(["Crear cotización", "/admin/cotizaciones", FileText]);
  if (can(role, "inventory.adjust")) actions.push(["Ajustar inventario", "/admin/inventario", Boxes]);
  if (can(role, "catalog.product.create")) actions.push(["Nuevo producto", "/admin/catalogo", Package]);
  if (can(role, "orders.create")) actions.push(["Nuevo pedido", "/admin/pedidos", ShoppingCart]);
  if (can(role, "cms.edit")) actions.push(["Subir banner", "/admin/cms", ImageIcon]);
  return (
    <section className={`${panelClass} p-4`}>
      <PanelHeader title="Acciones rápidas" />
      <div className="mt-4 grid grid-cols-2 gap-2">
        {actions.map(([label, href, Icon]) => (
          <Link
            key={label}
            href={href}
            className="flex min-h-[62px] flex-col items-center justify-center gap-2 rounded-lg border border-[#e3ebf2] text-center text-[9px] font-extrabold text-[#304b66] hover:border-[#3986c0]"
          >
            <Icon className="h-5 w-5 text-[#496f94]" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </div>
    </section>
  );
}

function ContentBanner() {
  return (
    <section className={`${panelClass} flex min-h-[140px] flex-col justify-between p-5 sm:p-6`}>
      <div>
        <h2 className="text-[15px] font-extrabold text-[#102a43]">Contenido y recursos</h2>
        <p className="mt-2 max-w-[520px] text-[10px] leading-4 text-[#8195aa]">
          La vista previa de materiales se mostrará cuando el contenido publicado esté conectado.
        </p>
      </div>
      <Link
        href="/admin/cms"
        className="mt-4 inline-flex h-9 w-fit items-center rounded-lg bg-[#ff830e] px-3.5 text-[10px] font-extrabold text-white"
      >
        Ir a contenido
      </Link>
    </section>
  );
}
