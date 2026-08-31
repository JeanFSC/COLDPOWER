import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  Boxes,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  CircleOff,
  Clock3,
  Download,
  FileText,
  Headphones,
  Image as ImageIcon,
  Minus,
  Package,
  PackageCheck,
  Plus,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Tag,
  Target,
  TriangleAlert,
  UserRound,
  Warehouse,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { can, type AppRole } from "@/lib/roles";
import type { DashboardRange } from "@/lib/dashboard-contract";
import { getOperationsDashboard } from "@/lib/operations-dashboard";
import { getOperationsWorkspace } from "@/lib/operations-workspace";
import { AdminLineChart, AdminSparkline } from "@/components/admin/AdminCharts";

type DashboardData = Awaited<ReturnType<typeof getOperationsDashboard>>;
type OperationsSnapshot = Awaited<ReturnType<typeof getOperationsWorkspace>>;

type AdminDashboardViewProps = {
  role: AppRole;
  data: DashboardData | null;
  snapshot: OperationsSnapshot | null;
  view?: "dashboard" | "operations";
  range?: DashboardRange;
  actorName?: string | null;
};

const panelClass =
  "min-w-0 rounded-xl border border-[#e3ebf2] bg-white shadow-[0_1px_2px_rgba(16,42,67,0.03)]";
const mutedClass = "text-[#8195aa]";
const money = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  maximumFractionDigits: 0,
});

const toneClasses = {
  blue: { bubble: "bg-[#e8f1ff] text-[#2277ee]", line: "text-[#2277ee]" },
  orange: { bubble: "bg-[#fff0df] text-[#f08b2d]", line: "text-[#f08b2d]" },
  green: { bubble: "bg-[#e0f7ee] text-[#1aa873]", line: "text-[#1aa873]" },
  red: { bubble: "bg-[#ffe5e5] text-[#ed4545]", line: "text-[#ed4545]" },
  purple: { bubble: "bg-[#eee8ff] text-[#8057e8]", line: "text-[#8057e8]" },
};

export function AdminDashboardView({
  role,
  data,
  snapshot,
  view = "dashboard",
  range = "month",
  actorName,
}: AdminDashboardViewProps) {
  if (
    view === "operations" ||
    role === "OPERACIONES_VENTAS" ||
    role === "ADMIN" ||
    role === "VENTAS" ||
    role === "ALMACEN" ||
    role === "COMPRAS"
  ) {
    return <OperationsDashboard snapshot={snapshot} role={role} range={range} actorName={actorName} />;
  }
  return (
    <ManagementDashboard
      variant={role === "GERENCIA" ? "gerencia" : "superadmin"}
      data={data}
      range={range}
      actorName={actorName}
    />
  );
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

function ExportButton({ range }: { range: DashboardRange }) {
  return (
    <a
      href={`/api/admin/dashboard/export?range=${encodeURIComponent(range)}`}
      download="coldpower-dashboard.csv"
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#dce6ee] bg-white px-3.5 text-[11px] font-extrabold text-[#304b66] transition hover:border-[#2277ee] hover:text-[#2277ee]"
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      Exportar reporte
    </a>
  );
}

type DashboardComparison = {
  current: number;
  previous: number;
  percentage: number | null;
};

function ComparisonIndicator({ comparison }: { comparison?: DashboardComparison }) {
  if (!comparison || comparison.percentage === null) {
    return <span className="mt-2 block text-[10px] font-bold text-[#8195aa]">— Sin comparación disponible</span>;
  }
  const isPositive = comparison.percentage > 0;
  const isNeutral = comparison.percentage === 0;
  const Icon = isNeutral ? Minus : isPositive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`mt-2 inline-flex items-center gap-1 text-[10px] font-bold ${
        isNeutral ? "text-[#8195aa]" : isPositive ? "text-[#1aa873]" : "text-[#ed4545]"
      }`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {Math.abs(comparison.percentage).toFixed(1)}% vs. período anterior
    </span>
  );
}

const sparklinePattern = [0, -0.62, 0.22, -0.34, 0.68, -0.12, 0.5, -0.55, 0.18, -0.28, 0.58, 0];

function comparisonSparkline(comparison?: DashboardComparison, phase = 0) {
  if (!comparison) return undefined;
  if (comparison.previous === 0 && comparison.current === 0) return [0, 0];
  const amplitude = Math.max(Math.max(comparison.previous, comparison.current) * 0.08, Math.abs(comparison.current - comparison.previous) * 0.035);
  return sparklinePattern.map((value, index) => {
    if (index === 0) return comparison.previous;
    if (index === sparklinePattern.length - 1) return comparison.current;
    const progress = index / (sparklinePattern.length - 1);
    const trend = comparison.previous + (comparison.current - comparison.previous) * progress;
    const wave = sparklinePattern[(index + phase) % sparklinePattern.length] ?? value;
    return Math.max(0, trend + wave * amplitude);
  });
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
  comparison,
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon: LucideIcon;
  tone?: keyof typeof toneClasses;
  sparkline?: number[];
  comparison?: DashboardComparison;
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
          {comparison ? <ComparisonIndicator comparison={comparison} /> : detail ? <p className={`mt-2 text-[10px] font-bold ${colors.line}`}>{detail}</p> : null}
        </div>
      </div>
      <AdminSparkline tone={tone} data={sparkline} />
    </article>
  );
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

function formatSalesDateLabel(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
    timeZone: "America/Lima",
  })
    .format(date)
    .replace(".", "");
}

function ManagementDashboard({
  variant,
  data,
  range,
  actorName,
}: {
  variant: "superadmin" | "gerencia";
  data: DashboardData | null;
  range: DashboardRange;
  actorName?: string | null;
}) {
  const isGerencia = variant === "gerencia";
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
  const sales = money.format(data?.salesRange.total ?? 0);
  const salesLabel = range === "month" ? "Ventas del mes" : "Ventas del período";
  const openQuotes = data?.quotes ?? 0;
  const orders = data?.orders.total ?? 0;
  const criticalStock = data?.criticalStock ?? 0;
  const customers = data?.topCustomers ?? [];
  const salesSeries = data?.salesSeries.map((row) => row.total);
  const salesLabels = data?.salesSeries.map((row) => formatSalesDateLabel(row.date));
  const comparisons = data.comparisons;
  const hasConfirmedSales = Boolean(data?.salesRange.count);

  return (
    <div className="space-y-4">
      <PageHeader role={variant} actorName={actorName}>
        <DashboardRangePicker range={range} filters={data.filters} />
        <ExportButton range={range} />
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={salesLabel}
          value={sales}
          comparison={comparisons?.sales}
          detail={hasConfirmedSales ? "Ventas confirmadas" : "Sin ventas confirmadas en el período"}
          icon={CircleDollarSign}
          tone="blue"
          sparkline={salesSeries?.some((value) => value > 0) ? salesSeries : undefined}
        />
        <MetricCard
          label={isGerencia ? "Ingresos" : "Cotizaciones abiertas"}
          value={isGerencia ? sales : openQuotes}
          detail={isGerencia ? (hasConfirmedSales ? "Ingresos confirmados" : "Sin ingresos confirmados") : openQuotes ? "Requieren seguimiento" : "Sin cotizaciones abiertas"}
          icon={isGerencia ? ReceiptText : FileText}
          comparison={isGerencia ? comparisons?.sales : comparisons?.quotes}
          tone="orange"
          sparkline={comparisonSparkline(isGerencia ? comparisons?.sales : comparisons?.quotes, 1)}
        />
        <MetricCard
          label={isGerencia ? "Cotizaciones abiertas" : "Pedidos activos"}
          value={isGerencia ? openQuotes : orders}
          detail={isGerencia ? (openQuotes ? "Requieren seguimiento" : "Sin cotizaciones abiertas") : orders ? "Requieren atención" : "Sin pedidos activos"}
          icon={isGerencia ? Tag : ShoppingCart}
          comparison={isGerencia ? comparisons?.quotes : comparisons?.orders}
          tone="green"
          sparkline={comparisonSparkline(isGerencia ? comparisons?.quotes : comparisons?.orders, 2)}
        />
        <MetricCard
          label="Stock crítico"
          value={criticalStock}
          detail={criticalStock ? "Requiere revisión de inventario" : "Sin alertas críticas"}
          icon={TriangleAlert}
          comparison={comparisons?.criticalStock}
          tone="red"
          sparkline={comparisonSparkline(comparisons?.criticalStock, 3)}
        />
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[1.45fr_1fr_1.12fr]">
        <section className={`${panelClass} min-h-[320px] p-4`}>
          <PanelHeader
            title={isGerencia ? "Evolución de ventas e ingresos" : "Ventas"}
            subtitle={
              isGerencia
                ? "Comparativo de los últimos 30 días"
                : "Últimos 30 días vs. período anterior"
            }
            action={<SalesGranularitySelect />}
          />
          <div className="mt-3 flex items-center gap-4 text-[10px] font-semibold text-[#71869c]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-5 bg-[#2277ee]" />
              {isGerencia ? "Ventas" : "Actual"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-5 border-t border-dashed border-[#8fbaf6]" />
              {isGerencia ? "Ingresos" : "Anterior"}
            </span>
          </div>
          {data?.salesSeries.some((row) => row.total > 0) ? (
            <div className="mt-1">
              <AdminLineChart
                comparison
                accent={isGerencia ? "orange" : "blue"}
                data={data.salesSeries.map((row) => row.total)}
                previous={data.previousSalesSeries.map((row) => row.total)}
                labels={salesLabels}
                currencyAxis
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
          {isGerencia ? (
            <div className="grid grid-cols-1 gap-2 rounded-lg border border-[#e5edf3] px-3 py-3 text-[10px] sm:grid-cols-3">
              <MiniStat
                label="Margen bruto"
                value={
                  data?.margin === null || data?.margin === undefined
                    ? "N/D"
                    : money.format(data.margin)
                }
              />
              <MiniStat label="Costo de ventas" value="N/D" />
              <MiniStat label="Utilidad operativa" value="N/D" />
            </div>
          ) : null}
        </section>
        {isGerencia ? <GerenciaPipelineRows data={data} /> : <PipelinePanel data={data} />}
        {isGerencia ? <GerenciaProductsPanel data={data} /> : <TopProductsPanel data={data} gerencia={false} />}
      </div>

      {isGerencia ? (
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.25fr_1fr]">
          <ApprovalsPanel data={data} />
          <CustomersPanel customers={customers} />
          <ActivityPanel activities={data?.recentActivity ?? []} />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.25fr_1fr_1.15fr]">
          <InventoryAlerts data={data} />
          <ActivityPanel activities={data?.recentActivity ?? []} />
          <UsersSummary data={data} />
          <QuickActions />
        </div>
      )}
      <BottomKpis data={data} />
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

function SalesGranularitySelect() {
  return (
    <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#dfe8ef] bg-white px-2.5 text-[10px] font-bold text-[#304b66]">
      <span className="sr-only">Agrupar ventas</span>
      <select
        aria-label="Agrupar ventas"
        defaultValue="daily"
        className="bg-transparent outline-none"
      >
        <option value="daily">Diario</option>
        <option value="weekly">Semanal</option>
        <option value="monthly">Mensual</option>
      </select>
    </label>
  );
}

function DashboardRangePicker({
  range,
  filters,
}: {
  range: DashboardRange;
  filters: DashboardData["filters"];
}) {
  const labels: Record<DashboardRange, string> = {
    today: "Hoy",
    yesterday: "Ayer",
    week: "Últimos 7 días",
    month: "Últimos 30 días",
    custom: filters.from && filters.to ? `${filters.from} – ${filters.to}` : "Personalizado",
  };
  return (
    <form action="/admin/dashboard" method="get" className="flex items-center gap-2">
      <label htmlFor="dashboard-range" className="sr-only">Período del dashboard</label>
      <span className="hidden items-center gap-1.5 text-[10px] font-bold text-[#526b84] sm:inline-flex">
        <CalendarDays className="h-4 w-4 text-[#526b84]" aria-hidden="true" />
        {labels[range]}
      </span>
      <select
        id="dashboard-range"
        name="range"
        defaultValue={range}
        className="h-9 rounded-lg border border-[#dfe8ef] bg-white px-2.5 text-[10px] font-bold text-[#304b66] outline-none focus:border-[#2277ee]"
      >
        <option value="today">Hoy</option>
        <option value="yesterday">Ayer</option>
        <option value="week">Últimos 7 días</option>
        <option value="month">Últimos 30 días</option>
        <option value="custom">Personalizado</option>
      </select>
      <button
        type="submit"
        className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#102a43] px-2.5 text-[10px] font-extrabold text-white transition hover:bg-[#1e4668]"
      >
        Aplicar <ChevronDown className="h-3 w-3 rotate-[-90deg]" aria-hidden="true" />
      </button>
    </form>
  );
}

const superadminStageGroups: ReadonlyArray<{ label: string; codes: readonly string[] }> = [
  { label: "Proyección", codes: ["NEW", "CONTACTED", "NO_RESPONSE"] },
  { label: "Calificación", codes: ["QUOTING"] },
  { label: "Propuesta", codes: ["QUOTE_SENT", "FOLLOW_UP"] },
  { label: "Negociación", codes: ["NEGOTIATION"] },
  { label: "Cierre ganado", codes: ["ACCEPTED", "SALE", "PAYMENT_PENDING", "PAID", "PREPARING", "DELIVERED"] },
] as const;

function superadminStageLabel(stageCode: string, fallback: string) {
  const normalized = stageCode.toUpperCase();
  return superadminStageGroups.find((group) => group.codes.includes(normalized))?.label ?? fallback;
}

function getSuperadminPipelineRows(stages: DashboardData["pipelineSummary"]) {
  return superadminStageGroups.map((group) => {
    const matchingStages = stages.filter((stage) => group.codes.includes(stage.stageCode.toUpperCase()));
    return {
      stageLabel: superadminStageLabel(group.codes[0], group.label),
      count: matchingStages.reduce((total, stage) => total + stage.count, 0),
      amount: matchingStages.reduce((total, stage) => total + stage.amount, 0),
    };
  });
}

function PipelinePanel({ data }: { data: DashboardData | null }) {
  const total = data?.opportunities ?? 0;
  const stages = data?.pipelineSummary ?? [];
  const rows = getSuperadminPipelineRows(stages);
  const stageTones = ["bg-[#eaf2ff]", "bg-[#e8f7fb]", "bg-[#e8f7ee]", "bg-[#fff4e6]", "bg-[#fff0e4]"];
  return (
    <section className={`${panelClass} min-h-[320px] p-4`}>
      <PanelHeader title="Pipeline de ventas" subtitle="Resumen por etapa" />
      {stages.length ? (
        <div className="mt-4 grid gap-2">
          {rows.map((stage, index) => (
            <div
              key={stage.stageLabel}
              className={`grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded-lg px-3 py-2.5 ${stageTones[index % stageTones.length]}`}
            >
              <span className="min-w-0 truncate text-[10px] font-bold text-[#304b66]">{stage.stageLabel}</span>
              <strong className="text-[10px] font-extrabold text-[#102a43]">{stage.count}</strong>
              <span className="min-w-[76px] text-right text-[9px] font-semibold text-[#526b84]">{money.format(stage.amount)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <EmptyRow text="Aún no hay oportunidades registradas en este período. Puedes iniciar una desde Cotizaciones." />
        </div>
      )}
      <div className="mt-4 flex items-center justify-between border-t border-[#edf2f6] pt-3 text-[11px] font-extrabold text-[#102a43]">
        <span>Total pipeline</span>
        <span>
          {total}{" "}
          <span className="ml-3 font-semibold text-[#526b84]">
            {data?.pipelineValue === undefined ? "N/D" : money.format(data.pipelineValue)}
          </span>
        </span>
      </div>
    </section>
  );
}

function GerenciaPipelineRows({ data }: { data: DashboardData | null }) {
  const stages = data?.pipelineSummary ?? [];
  const stageTones = ["bg-[#eaf2ff]", "bg-[#e8f7fb]", "bg-[#e8f7ee]", "bg-[#fff4e6]", "bg-[#fff0e4]"];

  return (
    <section className={`${panelClass} min-h-[320px] p-4`}>
      <PanelHeader title="Pipeline por etapa" subtitle="Resumen de oportunidades" />
      {stages.length ? (
        <div className="mt-4 grid gap-2">
          {stages.slice(0, 5).map((stage, index) => (
            <div key={stage.stageCode ?? stage.stageLabel} className={`grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded-lg px-3 py-2.5 ${stageTones[index % stageTones.length]}`}>
              <span className="min-w-0 truncate text-[10px] font-bold text-[#304b66]">{stage.stageLabel}</span>
              <strong className="text-[10px] font-extrabold text-[#102a43]">{stage.count}</strong>
              <span className="min-w-[76px] text-right text-[9px] font-semibold text-[#526b84]">{money.format(stage.amount)}</span>
            </div>
          ))}
        </div>
      ) : <div className="mt-4"><EmptyRow text="Aún no hay oportunidades registradas para estos filtros." /></div>}
      <div className="mt-4 flex items-center justify-between border-t border-[#edf2f6] pt-3 text-[11px] font-extrabold text-[#102a43]">
        <span>Total pipeline</span>
        <span>
          {data?.opportunities ?? 0}
          <span className="ml-3 font-semibold text-[#526b84]">{data?.pipelineValue === undefined ? "N/D" : money.format(data.pipelineValue)}</span>
        </span>
      </div>
    </section>
  );
}

function GerenciaProductsPanel({ data }: { data: DashboardData | null }) {
  const products = data?.topProducts ?? [];
  const categories = data?.categorySummary ?? [];
  return (
    <section className={`${panelClass} min-h-[320px] p-4`}>
      <PanelHeader title="Productos y categorías más vendidos" subtitle="Este mes" />
      <div className="mt-4 flex items-center gap-5 border-b border-[#edf2f6] text-[10px] font-extrabold">
        <span className="border-b-2 border-[#2277ee] pb-2 text-[#2277ee]">Productos</span>
        <span className="pb-2 text-[#8195aa]">Categorías</span>
      </div>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-2 border-b border-[#edf2f6] pb-2 text-[9px] font-bold text-[#8195aa]">
        <span>Producto</span><span>Unidades</span><span>Ventas</span><span>Margen</span>
      </div>
      {products.length ? (
        <div className="grid gap-0.5">
          {products.slice(0, 5).map((row) => (
            <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-2 border-b border-[#f0f4f7] py-2 last:border-0">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#f5f8fa]">
                  <Image src={row.primaryImageUrl ?? "/images/product-placeholder-repuesto.svg"} alt="" width={26} height={26} className="h-6 w-6 object-contain" />
                </div>
                <span className="min-w-0 truncate text-[9px] font-bold text-[#304b66]">{row.name}</span>
              </div>
              <span className="text-[9px] font-semibold text-[#526b84]">{row.units}</span>
              <span className="text-[9px] font-semibold text-[#526b84]">{money.format(row.revenue)}</span>
              <span className="text-[9px] font-semibold text-[#8195aa]">—</span>
            </div>
          ))}
        </div>
      ) : <div className="mt-3"><EmptyRow text="Aún no hay productos vendidos para estos filtros." /></div>}
      {categories.length ? (
        <div className="mt-3 border-t border-[#edf2f6] pt-3">
          <p className="text-[9px] font-extrabold text-[#526b84]">Categorías</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {categories.slice(0, 4).map((category) => (
              <span key={category.categoryId} className="rounded-full bg-[#f3f7fb] px-2 py-1 text-[8px] font-bold text-[#526b84]">{category.categoryName} · {category.units} uds</span>
            ))}
          </div>
        </div>
      ) : null}
      <Link href="/admin/catalogo" className="mt-3 flex items-center justify-center border-t border-[#edf2f6] pt-3 text-[10px] font-extrabold text-[#2277ee]">
        Ver todos los productos <ArrowUpRight className="ml-1 h-3 w-3" aria-hidden="true" />
      </Link>
    </section>
  );
}

function TopProductsPanel({ data, gerencia }: { data: DashboardData | null; gerencia: boolean }) {
  const rows = data?.topProducts ?? [];
  return (
    <section className={`${panelClass} min-h-[320px] p-4`}>
      <PanelHeader title={gerencia ? "Productos y categorías más vendidos" : "Productos más vendidos"} subtitle="Este mes" />
      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-b border-[#edf2f6] pb-2 text-[9px] font-bold text-[#8195aa]">
        <span>Producto</span>
        <span>Ventas</span>
        <span>Ingresos</span>
      </div>
      {rows.length ? (
        <div className="grid gap-0.5">
          {rows.slice(0, 5).map((row) => (
            <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-b border-[#f0f4f7] py-2 last:border-0">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#f5f8fa]">
                  <Image src={row.primaryImageUrl ?? "/images/product-placeholder-repuesto.svg"} alt="" width={26} height={26} className="h-6 w-6 object-contain" />
                </div>
                <span className="min-w-0 truncate text-[9px] font-bold text-[#304b66]">{row.name}</span>
              </div>
              <span className="text-[9px] font-semibold text-[#526b84]">{row.units}</span>
              <span className="text-[9px] font-semibold text-[#526b84]">{money.format(row.revenue)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3">
          <EmptyRow text="Aún no hay productos vendidos en este período. El catálogo sigue disponible para revisión." />
        </div>
      )}
      <Link href="/admin/catalogo" className="mt-3 flex items-center justify-center border-t border-[#edf2f6] pt-3 text-[10px] font-extrabold text-[#2277ee]">
        Ver todos los productos <ArrowUpRight className="ml-1 h-3 w-3" aria-hidden="true" />
      </Link>
    </section>
  );
}

function ApprovalsPanel({ data }: { data: DashboardData | null }) {
  const rows = [
    ["Pagos pendientes", data?.pendingPayments ?? 0, "Pendientes de verificación"],
    ["Alertas de stock crítico", data?.criticalStock ?? 0, "Productos"],
    ["Seguimientos vencidos", data?.overdueFollowUps ?? 0, "Requieren atención"],
  ] as const;
  return (
    <section className={`${panelClass} p-4`}>
      <PanelHeader title="Solicitudes y aprobaciones" subtitle="Pendientes de tu revisión" />
      <div className="mt-3 grid gap-2">
        {rows.map(([label, value, detail], index) => (
          <div key={label} className="flex items-center gap-2.5 rounded-lg border border-[#e6edf3] px-3 py-2.5">
            <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${index === 1 ? "bg-[#ffe8e8] text-[#ed4545]" : "bg-[#fff0df] text-[#f08b2d]"}`}>
              {index === 1 ? <TriangleAlert className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            </span>
            <span className="min-w-0 flex-1 text-[10px] font-bold text-[#304b66]">{label}<small className="mt-1 block text-[9px] font-semibold text-[#8aa0b6]">{detail}</small></span>
            <strong className="text-[14px] text-[#ed4545]">{value}</strong>
          </div>
        ))}
      </div>
      <Link href="/admin/notificaciones" className="mt-4 flex justify-center text-[10px] font-extrabold text-[#2277ee]">Ver todas las solicitudes</Link>
    </section>
  );
}

function CustomersPanel({ customers }: { customers: DashboardData["topCustomers"] }) {
  return (
    <section className={`${panelClass} p-4`}>
      <PanelHeader title="Clientes y ventas recientes" subtitle="Últimas ventas cerradas" />
      <div className="mt-4 grid gap-1">
        {customers.length ? customers.map((customer) => (
          <div key={customer.id} className="flex items-center gap-2.5 border-b border-[#f0f4f7] py-2 last:border-0">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e8f1ff] text-[10px] font-extrabold text-[#2277ee]">{customer.name.slice(0, 1).toUpperCase()}</span>
            <span className="min-w-0 flex-1 truncate text-[10px] font-bold text-[#304b66]">{customer.name}<small className="mt-0.5 block text-[9px] font-semibold text-[#8aa0b6]">{customer.orders} pedidos</small></span>
            <span className="text-[10px] font-bold text-[#526b84]">{money.format(customer.revenue)}</span>
          </div>
        )) : <EmptyRow text="Aún no hay ventas confirmadas en este período." />}
      </div>
      <Link href="/admin/ventas" className="mt-3 flex justify-center border-t border-[#edf2f6] pt-3 text-[10px] font-extrabold text-[#2277ee]">Ver todas las ventas</Link>
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

function ActivityPanel({ activities }: { activities: DashboardData["recentActivity"] }) {
  return (
    <section className={`${panelClass} min-h-[320px] p-4`}>
      <PanelHeader title="Actividad reciente" subtitle="Últimas acciones en la plataforma" />
      <div className="mt-3 grid">
        {activities.length ? activities.slice(0, 5).map((activity) => {
          const tone = activityTone(activity);
          return (
            <div key={activity.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-[#edf2f6] py-2.5 last:border-0">
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
            </div>
          );
        }) : <EmptyRow text="Aún no hay actividad comercial confirmada en este período." />}
      </div>
      <Link href="/admin/auditoria" className="mt-3 flex justify-center border-t border-[#edf2f6] pt-3 text-[10px] font-extrabold text-[#2277ee]">Ver toda la actividad</Link>
    </section>
  );
}

function UsersSummary({ data }: { data: DashboardData | null }) {
  const rows = data?.userSummary ?? [];
  return (
    <section className={`${panelClass} min-h-[320px] p-4`}>
      <PanelHeader title="Resumen de usuarios" subtitle="Información de cuentas" />
      <div className="mt-3 grid">
        {rows.length ? rows.map((row) => (
          <div key={`${row.roleCode ?? "none"}-${row.statusCode ?? row.status}`} title={row.statusLabel} className="flex items-center gap-2 border-b border-[#edf2f6] py-2.5 last:border-0">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e8f1ff] text-[#2277ee]"><UsersRound className="h-4 w-4" aria-hidden="true" /></span>
            <span className="min-w-0 flex-1 truncate text-[10px] font-bold text-[#526b84]">{row.roleLabel}</span>
            <strong className="text-[11px] font-extrabold text-[#102a43]">{row.count}</strong>
            <span className="w-7 text-right text-[9px] font-extrabold text-[#8195aa]">—</span>
          </div>
        )) : <EmptyRow text="Sin usuarios registrados." />}
      </div>
      <Link href="/admin/usuarios" className="mt-3 flex justify-center border-t border-[#edf2f6] pt-3 text-[10px] font-extrabold text-[#2277ee]">Ver todos los usuarios</Link>
    </section>
  );
}

function InventoryAlerts({ data }: { data: DashboardData | null }) {
  const rows = [
    { label: "Stock crítico", value: data?.criticalStock ?? 0, tone: "red", icon: TriangleAlert },
    { label: "Sin movimiento", value: data?.noMovement ?? 0, tone: "orange", icon: TriangleAlert },
    { label: "Sin stock", value: data?.noStock ?? 0, tone: "red", icon: CircleOff },
    { label: "Stock pendiente de sincronizar", value: data?.unknownStock ?? 0, tone: "blue", icon: FileText },
  ] as const;
  return (
    <section className={`${panelClass} min-h-[320px] p-4`}>
      <PanelHeader title="Alertas de inventario" subtitle="Productos que requieren atención" />
      <div className="mt-3 grid gap-1.5">
        {rows.map(({ label, value, tone, icon: Icon }) => (
          <div
            key={label}
            className="flex items-center gap-2.5 rounded-lg border border-[#e6edf3] px-3 py-2.5"
          >
            <span
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${tone === "red" ? "bg-[#ffe7e7] text-[#ed4545]" : tone === "orange" ? "bg-[#fff0df] text-[#f08b2d]" : "bg-[#e8f1ff] text-[#2277ee]"}`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="flex-1 text-[10px] font-semibold text-[#526b84]">{label}</span>
            <strong
              className={`text-[14px] ${tone === "red" ? "text-[#ed4545]" : tone === "orange" ? "text-[#f08b2d]" : "text-[#2277ee]"}`}
            >
              {value}
            </strong>
          </div>
        ))}
      </div>
      <Link
        href="/admin/inventario"
        className="mt-4 flex justify-center border-t border-[#edf2f6] pt-3 text-[10px] font-extrabold text-[#2277ee]"
      >
        Ver todas las alertas
      </Link>
    </section>
  );
}

function QuickActions() {
  const actions = [
    ["Nuevo producto", "/admin/catalogo", Package],
    ["Nueva cotización", "/admin/cotizaciones", FileText],
    ["Nuevo cliente", "/admin/crm?view=clientes", UsersRound],
    ["Crear pedido", "/admin/pedidos", ReceiptText],
    ["Ajustar inventario", "/admin/inventario", Boxes],
    ["Reporte de ventas", "/admin/reportes", BarChart3],
  ] as const;
  return (
    <section className={`${panelClass} p-4`}>
      <PanelHeader title="Acciones rápidas" subtitle="Accesos directos a funciones frecuentes" />
      <div className="mt-4 grid grid-cols-2 gap-2">
        {actions.map(([label, href, Icon]) => (
          <Link
            key={label}
            href={href}
            className="flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-lg border border-[#e3ebf2] text-center text-[9px] font-extrabold text-[#304b66] transition hover:border-[#3986c0] hover:bg-[#f7fbff]"
          >
            <Icon className="h-5 w-5 text-[#496f94]" strokeWidth={1.8} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </div>
      <Link
        href="/admin"
        className="mt-3 flex items-center justify-center gap-1 border-t border-[#edf2f6] pt-3 text-[10px] font-extrabold text-[#2277ee]"
      >
        Ver todas las acciones <ArrowUpRight className="h-3 w-3" />
      </Link>
    </section>
  );
}

function compactComparison(comparison?: DashboardComparison) {
  if (!comparison || comparison.percentage === null) return "—";
  const prefix = comparison.percentage > 0 ? "↗" : comparison.percentage < 0 ? "↘" : "→";
  return `${prefix} ${Math.abs(comparison.percentage).toFixed(1)}%`;
}

type DashboardBottomKpis = {
  customersTotal: number;
  salesYtd: number;
  ordersYtd: number;
  averageTicket: number;
  activeProducts: number;
  totalCategories: number;
  comparisons?: Partial<Record<"customers" | "sales" | "orders" | "ticket" | "products", DashboardComparison>>;
};

type DashboardWithBottomKpis = DashboardData & { bottomKpis?: DashboardBottomKpis };
type BottomKpiTone = "blue" | "slate" | "green" | "orange";

const preciseMoney = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function BottomKpis({ data }: { data: DashboardData | null }) {
  const source = data as DashboardWithBottomKpis | null;
  const summary = source?.bottomKpis;
  const sales = data?.salesRange.total ?? 0;
  const salesCount = data?.salesRange.count ?? 0;
  const items: Array<{ label: string; value: string; comparison?: DashboardComparison; icon: LucideIcon; tone: BottomKpiTone }> = summary
    ? [
        { label: "Clientes totales", value: String(summary.customersTotal), comparison: summary.comparisons?.customers, icon: UsersRound, tone: "blue" },
        { label: "Ventas YTD", value: money.format(summary.salesYtd), comparison: summary.comparisons?.sales, icon: BarChart3, tone: "blue" },
        { label: "Órdenes YTD", value: String(summary.ordersYtd), comparison: summary.comparisons?.orders, icon: ReceiptText, tone: "slate" },
        { label: "Ticket promedio", value: preciseMoney.format(summary.averageTicket), comparison: summary.comparisons?.ticket, icon: Tag, tone: "green" },
        { label: "Productos activos", value: String(summary.activeProducts), comparison: summary.comparisons?.products, icon: Package, tone: "orange" },
        { label: "Categorías", value: String(summary.totalCategories), comparison: undefined, icon: Boxes, tone: "slate" },
      ]
    : [
        { label: "Clientes nuevos", value: String(data?.newCustomers ?? 0), comparison: undefined, icon: UsersRound, tone: "blue" },
        { label: "Ventas del período", value: money.format(sales), comparison: data?.comparisons?.sales, icon: BarChart3, tone: "blue" },
        { label: "Órdenes del período", value: String(data?.orders.total ?? 0), comparison: data?.comparisons?.orders, icon: ReceiptText, tone: "slate" },
        { label: "Ticket promedio", value: salesCount ? money.format(sales / salesCount) : "N/D", comparison: undefined, icon: Tag, tone: "green" },
        { label: "Productos vendidos", value: String(data?.productsSold ?? 0), comparison: undefined, icon: Package, tone: "orange" },
        { label: "Categorías con ventas", value: String(data?.categorySummary.length ?? 0), comparison: undefined, icon: Boxes, tone: "slate" },
      ];
  const toneClass = {
    blue: "bg-[#eaf2ff] text-[#2277ee]",
    slate: "bg-[#eef3f7] text-[#526b84]",
    green: "bg-[#e0f7ee] text-[#1aa873]",
    orange: "bg-[#fff0df] text-[#f08b2d]",
  } as const;

  return (
    <section className={`${panelClass} grid divide-y divide-[#edf2f6] overflow-hidden sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-6`}>
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 items-center gap-2.5 px-4 py-3.5">
          <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${toneClass[item.tone]}`}>
            <item.icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <small className="block truncate text-[9px] font-semibold text-[#8195aa]">{item.label}</small>
            <strong className="mt-1 block truncate text-[12px] font-black text-[#102a43]">{item.value}</strong>
            <em className={`mt-0.5 block text-[9px] font-extrabold not-italic ${(item.comparison?.percentage ?? 0) < 0 ? "text-[#ed4545]" : "text-[#1aa873]"}`}>
              {item.comparison ? compactComparison(item.comparison) : "—"}
            </em>
          </span>
        </div>
      ))}
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-r border-[#e5edf3] pr-2 last:border-0 last:pr-0">
      <p className="truncate text-[9px] font-semibold text-[#8195aa]">{label}</p>
      <strong className="mt-1 block truncate text-[10px] text-[#304b66]">{value}</strong>
    </div>
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
