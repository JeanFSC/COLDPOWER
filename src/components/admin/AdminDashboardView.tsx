import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  Boxes,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Download,
  FileText,
  Image as ImageIcon,
  Package,
  PackageCheck,
  Plus,
  ReceiptText,
  ShoppingCart,
  Tag,
  Target,
  TriangleAlert,
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
}: AdminDashboardViewProps) {
  if (
    view === "operations" ||
    role === "OPERACIONES_VENTAS" ||
    role === "ADMIN" ||
    role === "VENTAS" ||
    role === "ALMACEN" ||
    role === "COMPRAS"
  ) {
    return <OperationsDashboard snapshot={snapshot} role={role} range={range} />;
  }
  return (
    <ManagementDashboard variant={role === "GERENCIA" ? "gerencia" : "superadmin"} data={data} range={range} />
  );
}

function PageHeader({
  role,
  children,
}: {
  role: "superadmin" | "gerencia" | "operaciones";
  children?: React.ReactNode;
}) {
  const copy = {
    superadmin: {
      title: "Panel Superadmin",
      subtitle: "Resumen operativo de la plataforma ColdPower",
    },
    gerencia: { title: "Panel de gerencia", subtitle: "Resumen ejecutivo del negocio" },
    operaciones: {
      title: "Operaciones y ventas",
      subtitle: "Cotizaciones, pedidos, stock y seguimientos",
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

function ManagementDashboard({
  variant,
  data,
  range,
}: {
  variant: "superadmin" | "gerencia";
  data: DashboardData | null;
  range: DashboardRange;
}) {
  const isGerencia = variant === "gerencia";
  if (!data) {
    return (
      <div className="space-y-4">
        <PageHeader role={variant} />
        <section className={`${panelClass} flex min-h-[260px] flex-col items-center justify-center px-5 py-12 text-center`} role="alert" aria-live="assertive">
          <TriangleAlert className="h-8 w-8 text-[#ed4545]" aria-hidden="true" />
          <h2 className="mt-4 text-[15px] font-extrabold text-[#304b66]">No pudimos cargar el dashboard</h2>
          <p className="mt-2 max-w-md text-[11px] font-semibold leading-5 text-[#8195aa]">No mostramos métricas de respaldo porque la fuente persistente no respondió. Intenta nuevamente para consultar datos reales.</p>
          <Link href="/admin/dashboard" className="mt-4 inline-flex h-10 items-center rounded-lg bg-[#102a43] px-4 text-[11px] font-extrabold text-white transition hover:bg-[#1e4668]">Reintentar</Link>
        </section>
      </div>
    );
  }
  const sales = money.format(data?.salesMonth.total ?? 0);
  const openQuotes = data?.quotes ?? 0;
  const orders = data?.orders.total ?? 0;
  const criticalStock = data?.criticalStock ?? 0;
  const customers = data?.topCustomers ?? [];
  const salesSeries = data?.salesSeries.map((row) => row.total);
  const hasConfirmedSales = Boolean(data?.salesMonth.count);

  return (
    <div className="space-y-4">
      <PageHeader role={variant}>
        <ExportButton range={range} />
      </PageHeader>
      <DashboardControlHint range={range} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Ventas del mes"
          value={sales}
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
          tone="orange"
        />
        <MetricCard
          label={isGerencia ? "Cotizaciones abiertas" : "Pedidos activos"}
          value={isGerencia ? openQuotes : orders}
          detail={isGerencia ? (openQuotes ? "Requieren seguimiento" : "Sin cotizaciones abiertas") : orders ? "Requieren atención" : "Sin pedidos activos"}
          icon={isGerencia ? Tag : ShoppingCart}
          tone="green"
        />
        <MetricCard
          label="Stock crítico"
          value={criticalStock}
          detail={criticalStock ? "Requiere revisión de inventario" : "Sin alertas críticas"}
          icon={TriangleAlert}
          tone="red"
        />
      </div>
      <DashboardReadiness data={data} />

      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr_1.12fr]">
        <section className={`${panelClass} p-4`}>
          <PanelHeader
            title={isGerencia ? "Evolución de ventas e ingresos" : "Ventas"}
            subtitle={
              isGerencia
                ? "Comparativo de los últimos 30 días"
                : "Últimos 30 días vs. período anterior"
            }
            action={<ChartSelect range={range} />}
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
        <PipelinePanel data={data} />
        <TopProductsPanel data={data} gerencia={isGerencia} />
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
      <BottomKpis data={data} gerencia={isGerencia} />
      <DashboardCompleteness data={data} />
    </div>
  );
}

function ChartSelect({ range }: { range: DashboardRange }) {
  return (
    <form action="/admin/dashboard" method="get" className="flex items-center gap-2">
      <label htmlFor="dashboard-range" className="sr-only">Período del dashboard</label>
      <select id="dashboard-range" name="range" defaultValue={range} className="h-9 rounded-lg border border-[#dfe8ef] bg-white px-2.5 text-[10px] font-bold text-[#304b66] outline-none focus:border-[#2277ee]">
        <option value="today">Hoy</option>
        <option value="yesterday">Ayer</option>
        <option value="week">Últimos 7 días</option>
        <option value="month">Últimos 30 días</option>
        <option value="custom">Personalizado</option>
      </select>
      <button type="submit" className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#102a43] px-2.5 text-[10px] font-extrabold text-white transition hover:bg-[#1e4668]">
        Aplicar <ChevronDown className="h-3 w-3 rotate-[-90deg]" aria-hidden="true" />
      </button>
    </form>
  );
}

function DashboardControlHint({ range }: { range: DashboardRange }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[#dfe8ef] bg-[#f8fafc] px-3.5 py-3 text-[10px] font-semibold leading-5 text-[#71869c] sm:flex-row sm:items-center sm:justify-between">
      <p>
        <span className="font-extrabold text-[#304b66]">Exportación:</span> Descarga el CSV generado con los datos disponibles para este alcance.
      </p>
      <p>
        <span className="font-extrabold text-[#304b66]">Período:</span> {range === "month" ? "Últimos 30 días." : "Filtro aplicado desde el selector."}
      </p>
    </div>
  );
}

function DashboardReadiness({ data }: { data: DashboardData | null }) {
  const hasQuotes = (data?.quotes ?? 0) > 0;
  const hasOrders = (data?.orders.total ?? 0) > 0;
  const hasInventoryUnknown = (data?.unknownStock ?? 0) > 0;
  const items = [
    {
      label: "Actividad comercial",
      description:
        hasQuotes || hasOrders
          ? "Hay actividad disponible para revisar."
          : "Aún no hay actividad comercial confirmada en este período.",
      href: "/admin/cotizaciones",
      action: "Abrir cotizaciones",
    },
    {
      label: "Catálogo e inventario",
      description: hasInventoryUnknown
        ? "Parte del stock todavía no tiene dato conectado."
        : "Revisa el estado de tus referencias y existencias.",
      href: "/admin/inventario",
      action: "Revisar inventario",
    },
    {
      label: "Reportes del panel",
      description: "Los reportes y períodos se habilitan al contar con sus series conectadas.",
      href: "/admin/reportes",
      action: "Ver reportes",
    },
  ] as const;

  return (
    <section className={`${panelClass} p-4`} aria-label="Estado del panel">
      <PanelHeader title="Estado del panel" subtitle="Qué puedes revisar ahora con los datos disponibles" />
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg border border-[#e5edf3] bg-[#fbfcfd] p-3">
            <p className="text-[10px] font-extrabold text-[#304b66]">{item.label}</p>
            <p className="mt-1 min-h-10 text-[10px] font-semibold leading-5 text-[#8195aa]">
              {item.description}
            </p>
            <Link
              href={item.href}
              className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-[#2277ee]"
            >
              {item.action} <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function PipelinePanel({ data }: { data: DashboardData | null }) {
  const total = data?.opportunities ?? 0;
  const stages = data?.pipelineSummary ?? [];
  return (
    <section className={`${panelClass} p-4`}>
      <PanelHeader title="Pipeline de ventas" subtitle="Resumen del pipeline disponible" />
      {stages.length ? (
        <div className="mt-3 grid gap-2">
          {stages.map((stage) => (
            <div
              key={stage.stage}
              className="flex items-center gap-2 rounded-lg border border-[#e5edf3] px-3 py-2"
            >
              <span className="min-w-0 flex-1 text-[10px] font-bold text-[#304b66]">
                {stage.stage}
                <small className="mt-0.5 block text-[9px] font-semibold text-[#8195aa]">
                  {money.format(stage.amount)} · ponderado {money.format(stage.weightedValue)}
                </small>
              </span>
              <strong className="text-[11px] text-[#526b84]">{stage.count}</strong>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-dashed border-[#d6e2eb] bg-[#f8fafc] px-3 py-5 text-center text-[10px] font-semibold text-[#8195aa]">
          Aún no hay oportunidades registradas en este período. Puedes iniciar una desde Cotizaciones.
        </div>
      )}
      <div className="mt-4 flex items-center justify-between border-t border-[#edf2f6] pt-3 text-[11px] font-extrabold text-[#102a43]">
        <span>Oportunidades abiertas</span>
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

function TopProductsPanel({ data, gerencia }: { data: DashboardData | null; gerencia: boolean }) {
  const rows = data?.topProducts ?? [];
  return (
    <section className={`${panelClass} p-4`}>
      <PanelHeader
        title={gerencia ? "Productos y categorías más vendidos" : "Productos más vendidos"}
        subtitle="Este período"
      />
      {gerencia ? (
        <div className="mt-4 flex gap-5 border-b border-[#edf2f6] text-[10px] font-extrabold">
          <button type="button" className="border-b-2 border-[#2277ee] pb-2 text-[#2277ee]">
            Productos
          </button>
          <button
            type="button"
            disabled
            title="El resumen de categorías todavía no está conectado"
            className="cursor-not-allowed pb-2 text-[#b0bfcb]"
          >
            Categorías
          </button>
        </div>
      ) : null}
      <div className="mt-3 grid gap-1">
        {rows.length ? (
          rows.map((row) => (
            <ProductRow
              key={row.id}
              name={String(row.name)}
              detail={`${row.units} uds`}
              value={money.format(row.revenue)}
            />
          ))
        ) : (
          <EmptyRow text="Aún no hay productos vendidos en este período. El catálogo sigue disponible para revisión." />
        )}
      </div>
      <Link
        href="/admin/catalogo"
        className="mt-3 flex items-center justify-center border-t border-[#edf2f6] pt-3 text-[10px] font-extrabold text-[#2277ee]"
      >
        Ver todos los productos <ArrowUpRight className="ml-1 h-3 w-3" aria-hidden="true" />
      </Link>
    </section>
  );
}

function ProductRow({ name, detail, value }: { name: string; detail: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-[#f0f4f7] py-2 last:border-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#f5f8fa]">
        <Image
          src="/images/product-placeholder-repuesto.svg"
          alt=""
          width={28}
          height={28}
          className="h-7 w-7 object-contain"
        />
      </div>
      <p className="min-w-0 flex-1 truncate text-[10px] font-bold text-[#304b66]">
        {name}
        <span className="mt-0.5 block text-[9px] font-semibold text-[#8aa0b6]">{detail}</span>
      </p>
      <span className="shrink-0 text-[10px] font-bold text-[#526b84]">{value}</span>
    </div>
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
          <div
            key={label}
            className="flex items-center gap-2.5 rounded-lg border border-[#e6edf3] px-3 py-2.5"
          >
            <span
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${index === 1 ? "bg-[#ffe8e8] text-[#ed4545]" : "bg-[#fff0df] text-[#f08b2d]"}`}
            >
              {index === 1 ? (
                <TriangleAlert className="h-4 w-4" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
            </span>
            <span className="min-w-0 flex-1 text-[10px] font-bold text-[#304b66]">
              {label}
              <small className="mt-1 block text-[9px] font-semibold text-[#8aa0b6]">{detail}</small>
            </span>
            <strong className="text-[14px] text-[#ed4545]">{value}</strong>
          </div>
        ))}
      </div>
      <Link
        href="/admin/notificaciones"
        className="mt-4 flex justify-center text-[10px] font-extrabold text-[#2277ee]"
      >
        Ver todas las solicitudes
      </Link>
    </section>
  );
}

function CustomersPanel({ customers }: { customers: DashboardData["topCustomers"] }) {
  return (
    <section className={`${panelClass} p-4`}>
      <PanelHeader title="Clientes y ventas recientes" subtitle="Últimas ventas cerradas" />
      <div className="mt-4 grid gap-1">
        {customers.length ? (
          customers.map((customer) => (
            <div
              key={customer.id}
              className="flex items-center gap-2.5 border-b border-[#f0f4f7] py-2 last:border-0"
            >
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e8f1ff] text-[10px] font-extrabold text-[#2277ee]">
                {customer.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate text-[10px] font-bold text-[#304b66]">
                {customer.name}
                <small className="mt-0.5 block text-[9px] font-semibold text-[#8aa0b6]">
                  {customer.orders} pedidos
                </small>
              </span>
              <span className="text-[10px] font-bold text-[#526b84]">
                {money.format(customer.revenue)}
              </span>
            </div>
          ))
        ) : (
          <EmptyRow text="Aún no hay ventas confirmadas en este período." />
        )}
      </div>
      <Link
        href="/admin/ventas"
        className="mt-3 flex justify-center border-t border-[#edf2f6] pt-3 text-[10px] font-extrabold text-[#2277ee]"
      >
        Ver todas las ventas
      </Link>
    </section>
  );
}

function ActivityPanel({ activities }: { activities: DashboardData["recentActivity"] }) {
  return (
    <section className={`${panelClass} p-4`}>
      <PanelHeader title="Actividad reciente" subtitle="Últimas acciones en la plataforma" />
      <div className="mt-3 grid gap-2">
        {activities.length ? (
          activities.slice(0, 5).map((activity) => (
            <div key={activity.id} className="rounded-lg border border-[#e6edf3] px-3 py-2">
              <p className="truncate text-[10px] font-bold text-[#304b66]">{activity.action}</p>
              <small className="mt-0.5 block text-[9px] font-semibold text-[#8195aa]">
                {activity.entityType} ·{" "}
                {new Date(activity.createdAt).toLocaleString("es-PE", { timeZone: "America/Lima" })}
              </small>
            </div>
          ))
        ) : (
          <EmptyRow text="Aún no hay actividad comercial confirmada en este período." />
        )}
      </div>
      <Link
        href="/admin/auditoria"
        className="mt-3 flex justify-center border-t border-[#edf2f6] pt-3 text-[10px] font-extrabold text-[#2277ee]"
      >
        Ver toda la actividad
      </Link>
    </section>
  );
}

function UsersSummary({ data }: { data: DashboardData | null }) {
  const rows = data?.userSummary ?? [];
  return (
    <section className={`${panelClass} p-4`}>
      <PanelHeader title="Resumen de usuarios" subtitle="Información de cuentas" />
      <div className="mt-3 grid gap-2">
        {rows.length ? (
          rows.map((row) => (
            <div
              key={`${row.role ?? "none"}-${row.status}`}
              className="flex items-center justify-between rounded-lg border border-[#e6edf3] px-3 py-2"
            >
              <span className="text-[10px] font-semibold text-[#526b84]">
                {row.role ?? "Sin rol"} · {row.status}
              </span>
              <strong className="text-[12px] text-[#102a43]">{row.count}</strong>
            </div>
          ))
        ) : (
          <EmptyRow text="Sin usuarios registrados." />
        )}
      </div>
      <Link
        href="/admin/usuarios"
        className="mt-3 flex justify-center border-t border-[#edf2f6] pt-3 text-[10px] font-extrabold text-[#2277ee]"
      >
        Ver todos los usuarios
      </Link>
    </section>
  );
}

function InventoryAlerts({ data }: { data: DashboardData | null }) {
  const rows = [
    ["Stock crítico (≤ mínimo)", data?.criticalStock ?? 0, "red"],
    ["Sin movimiento", data?.noMovement ?? 0, "orange"],
    ["Sin stock", data?.noStock ?? 0, "red"],
    ["Stock desconocido", data?.unknownStock ?? 0, "blue"],
  ] as const;
  return (
    <section className={`${panelClass} p-4`}>
      <PanelHeader title="Alertas de inventario" subtitle="Productos que requieren atención" />
      <div className="mt-3 grid gap-2">
        {rows.map(([label, value, tone]) => (
          <div
            key={label}
            className="flex items-center gap-2.5 rounded-lg border border-[#e6edf3] px-3 py-2.5"
          >
            <span
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${tone === "red" ? "bg-[#ffe7e7] text-[#ed4545]" : tone === "orange" ? "bg-[#fff0df] text-[#f08b2d]" : "bg-[#e8f1ff] text-[#2277ee]"}`}
            >
              {tone === "blue" ? (
                <FileText className="h-4 w-4" />
              ) : (
                <TriangleAlert className="h-4 w-4" />
              )}
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
            className="flex min-h-[64px] flex-col items-center justify-center gap-2 rounded-lg border border-[#e3ebf2] text-center text-[9px] font-extrabold text-[#304b66] transition hover:border-[#3986c0] hover:bg-[#f7fbff]"
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

function BottomKpis({ data, gerencia }: { data: DashboardData | null; gerencia: boolean }) {
  const items = gerencia
    ? ([
        ["Clientes nuevos", String(data?.newCustomers ?? 0), "Datos del período", UsersRound],
        [
          "Ventas del período",
          money.format(data?.salesMonth.total ?? 0),
          "Datos del período",
          BarChart3,
        ],
        ["Órdenes del período", String(data?.orders.total ?? 0), "Datos del período", ReceiptText],
        [
          "Ticket promedio",
          data?.salesMonth.count
            ? money.format(data.salesMonth.total / data.salesMonth.count)
            : "N/D",
          data?.salesMonth.count ? "Ventas confirmadas" : "Sin ventas confirmadas",
          Tag,
        ],
        [
          "Margen",
          data?.margin === null || data?.margin === undefined ? "N/D" : money.format(data.margin),
          "Costo incompleto o no disponible",
          CircleDollarSign,
        ],
        ["Rentabilidad", "N/D", "Sin dato conectado", BarChart3],
      ] as const)
    : ([
        ["Clientes nuevos", String(data?.newCustomers ?? 0), "Datos del período", UsersRound],
        [
          "Ventas del período",
          money.format(data?.salesMonth.total ?? 0),
          "Datos del período",
          BarChart3,
        ],
        ["Órdenes del período", String(data?.orders.total ?? 0), "Datos del período", ReceiptText],
        [
          "Ticket promedio",
          data?.salesMonth.count
            ? money.format(data.salesMonth.total / data.salesMonth.count)
            : "N/D",
          data?.salesMonth.count ? "Ventas confirmadas" : "Sin ventas confirmadas",
          Tag,
        ],
        ["Productos vendidos", String(data?.productsSold ?? 0), "Datos del período", Package],
        ["Categorías", "N/D", "Sin dato conectado", Boxes],
      ] as const);
  return (
    <section
      className={`${panelClass} grid divide-y divide-[#edf2f6] overflow-hidden sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-6`}
    >
      {items.map(([label, value, trend, Icon]) => (
        <div key={label} className="flex items-center gap-2.5 px-4 py-3.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eaf2ff] text-[#2277ee]">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <small className="block truncate text-[9px] font-semibold text-[#8195aa]">
              {label}
            </small>
            <strong className="mt-1 block truncate text-[12px] font-black text-[#102a43]">
              {value}
            </strong>
            <em className="mt-0.5 block text-[9px] font-extrabold not-italic text-[#1aa873]">
              {trend}
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

function OperationsDashboard({ snapshot, role, range }: { snapshot: OperationsSnapshot | null; role: AppRole; range: DashboardRange }) {
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
      <PageHeader role="operaciones">
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
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <OperationsPipeline snapshot={snapshot} range={range} />
        </div>
        <PendingOrders snapshot={snapshot} />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
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
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1.35fr]">
        <OperationsQuickActions role={role} />
        <div className="xl:col-span-2">
          {can(role, "cms.view") ? <ContentBanner /> : null}
        </div>
      </div>
    </div>
  );
}

function OperationsPipeline({ snapshot, range }: { snapshot: OperationsSnapshot | null; range: DashboardRange }) {
  const total = snapshot?.metrics.openOpportunities ?? 0;
  const opportunities = snapshot?.queues.opportunities ?? [];
  return (
    <section className={`${panelClass} min-w-0 p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-extrabold text-[#102a43]">
            Pipeline de oportunidades{" "}
            <span className="ml-1 rounded-full bg-[#eef3f8] px-1.5 py-0.5 text-[9px] text-[#8195aa]">
              {total}
            </span>
          </h2>
          <p className={`mt-1 text-[10px] font-semibold ${mutedClass}`}>
            Consulta las oportunidades disponibles en el pipeline.
          </p>
        </div>
        <div className="flex gap-2">
          <ChartSelect range={range} />
          <button
            type="button"
            disabled
            title="Esta acción se habilitará al conectar las transiciones del pipeline"
            className="inline-flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-lg border border-[#dfe8ef] bg-[#f7fafc] text-[#a9bac8]"
            aria-label="Más opciones"
          >
            …
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {opportunities.length ? opportunities.slice(0, 6).map((item) => {
          const row = item as { id: string; code?: string; customer?: string | null; stage?: string; seller?: string | null; nextAction?: string | null };
              return <Link key={row.id} href={`/admin/crm?view=pipeline&opportunityId=${encodeURIComponent(row.id)}`} className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-[#edf2f6] px-3 py-2.5 hover:border-[#2277ee]"><span className="min-w-0"><strong className="block truncate text-[10px] text-[#304b66]">{row.code ?? "Oportunidad"} · {row.customer ?? "Cliente no identificado"}</strong><small className="mt-1 block truncate text-[9px] font-semibold text-[#8195aa]">{row.nextAction ?? "Sin próxima acción"}{row.seller ? ` · ${row.seller}` : ""}</small></span><span className="self-start rounded-full bg-[#eee8ff] px-2 py-1 text-[9px] font-extrabold text-[#8057e8]">{row.stage ?? "Sin etapa"}</span></Link>;
        }) : <EmptyRow text="No hay oportunidades abiertas para estos filtros." />}
      </div>
    </section>
  );
}

function PendingOrders({ snapshot }: { snapshot: OperationsSnapshot | null }) {
  const rows = [
    "Pedidos activos",
    "Pedidos por preparar",
    "Pagos pendientes",
    "Stock reservado",
    "Locales activos",
  ];
  const values = [
    snapshot?.metrics.activeOrders ?? 0,
    snapshot?.metrics.preparingOrders ?? 0,
    snapshot?.metrics.pendingPayments ?? 0,
    snapshot?.metrics.reservedUnits ?? 0,
    snapshot?.metrics.activeLocations ?? 0,
  ];
  return (
    <section className={`${panelClass} p-4`}>
      <PanelHeader
        title="Resumen operativo"
        subtitle="Conteos disponibles"
        action={
          <Link href="/admin/pedidos" className="text-[10px] font-extrabold text-[#2277ee]">
            Ver pedidos
          </Link>
        }
      />
      <div className="mt-3 grid gap-2">
        {rows.map((label, index) => (
          <div
            key={label}
            className="flex items-center gap-2 rounded-lg border border-[#edf2f6] px-3 py-2.5"
          >
            <span className="min-w-0 flex-1 text-[10px] font-bold text-[#304b66]">
              {label}
              <small className="mt-0.5 block text-[9px] font-semibold text-[#8195aa]">
                Conteo del sistema
              </small>
            </span>
            <strong className="text-[11px] text-[#526b84]">{values[index]}</strong>
          </div>
        ))}
      </div>
      <div className="mt-3 border-t border-[#edf2f6] pt-3">
        <p className="mb-2 text-[10px] font-extrabold text-[#526b84]">Pedidos en cola</p>
        {(snapshot?.queues.orders ?? []).slice(0, 4).map((item) => {
          const row = item as { id: string; code?: string; customer?: string; status?: string; location?: string; priority?: string };
          return <Link key={row.id} href={`/admin/pedidos?orderId=${encodeURIComponent(row.id)}`} className="flex items-center justify-between gap-2 border-b border-[#f0f4f7] py-2 last:border-0"><span className="min-w-0 truncate text-[9px] font-bold text-[#304b66]">{row.code ?? "Pedido"} · {row.customer ?? "Cliente"}<small className="ml-1 font-semibold text-[#8195aa]">{row.location ?? ""}</small></span><span className="shrink-0 text-[9px] font-extrabold text-[#f08b2d]">{row.priority ?? row.status ?? ""}</span></Link>;
        })}
      </div>
      <Link
        href="/admin/pedidos"
        className="mt-3 flex justify-center border-t border-[#edf2f6] pt-3 text-[10px] font-extrabold text-[#2277ee]"
      >
        Ver pedidos pendientes
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

function DashboardCompleteness({ data }: { data: DashboardData | null }) {
  const metrics = [
    [
      "Conversión",
      data?.conversion?.percentage == null ? "N/D" : data.conversion.percentage.toFixed(1) + "%",
    ],
    ["Seguimientos vencidos", data?.overdueFollowUps ?? 0],
    ["Sin stock", data?.noStock ?? 0],
    ["Sin movimiento", data?.noMovement ?? 0],
    ["Transferencias", data?.transfers.total ?? 0],
    ["Top productos", data?.topProducts.length ?? 0],
    ["Top clientes", data?.topCustomers.length ?? 0],
    ["Top vendedores", data?.topSellers.length ?? 0],
    ["Canales", data?.channels.length ?? 0],
    ["Clientes nuevos", data?.newCustomers ?? 0],
    ["Clientes recurrentes", data?.returningCustomers ?? 0],
    ["Productos vendidos", data?.productsSold ?? 0],
    ["Unidades vendidas", data?.unitsSold ?? 0],
    [
      "Margen",
      data?.margin === null || data?.margin === undefined ? "N/D" : money.format(data.margin),
    ],
  ] as const;

  return (
    <section className={panelClass + " p-4"} aria-label="Indicadores comerciales y de inventario">
      <PanelHeader
        title="Indicadores comerciales y de inventario"
        subtitle="Datos calculados desde la base de datos"
      />
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-[#e5edf3] px-3 py-2.5">
            <p className="text-[10px] font-semibold text-[#8195aa]">{label}</p>
            <strong className="mt-1 block text-[14px] text-[#102a43]">{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
