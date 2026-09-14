import Link from "next/link";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ChevronRight,
  CircleDollarSign,
  CircleHelp,
  Clock3,
  CreditCard,
  Download,
  FileClock,
  FileText,
  Filter,
  Gauge,
  Globe,
  Home,
  Image as ImageIcon,
  Info,
  LayoutDashboard,
  Mail,
  MessageCircle,
  Package,
  PackageCheck,
  RefreshCw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Tag,
  Target,
  UsersRound,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import Image from "next/image";
import {
  AdminDashboardControls,
  DashboardGranularitySelect,
  type DashboardFilterOptions,
} from "@/components/admin/AdminDashboardControls";
import { AdminLineChart, AdminSparkline } from "@/components/admin/AdminChartsLazy";
import { AdminTooltip } from "@/components/admin/AdminTooltip";
import { OperationsWorkItemAction } from "@/components/admin/OperationsWorkItemAction";
import {
  AdminHomePersonalizer,
  type HomePersonalizationOption,
} from "@/components/admin/AdminHomePersonalizer";
import { PurchaseActions } from "@/components/admin/PurchaseActions";
import { PurchaseRequestActions } from "@/components/admin/PurchaseRequestActions";
import { ReportScheduleControls } from "@/components/admin/ReportScheduleControls";
import { TestIntegrationsButton, IntegrationRowMenu } from "@/components/admin/TestIntegrationsButton";
import type { DocumentSeriesItem } from "@/components/admin/DocumentSeriesManager";
import { DiscardSettingsButton } from "@/components/admin/DiscardSettingsButton";
import { NewLocationButton } from "@/components/admin/NewLocationButton";
import { LocationRowMenu } from "@/components/admin/LocationRowMenu";
import { can, permissionsForRole, type AppRole, type Permission } from "@/lib/roles";
import {
  dashboardFiltersToQuery,
  type DashboardFilters,
  type DashboardRange,
} from "@/lib/dashboard-contract";
import { getOperationsDashboard } from "@/lib/operations-dashboard";
import { getOperationsWorkspace } from "@/lib/operations-workspace";
import type { OperationsFilters } from "@/lib/operations-contract";

type DashboardData = Awaited<ReturnType<typeof getOperationsDashboard>>;
type OperationsSnapshot = Awaited<ReturnType<typeof getOperationsWorkspace>>;

const panel =
  "min-w-0 rounded-[14px] border border-[#e2eaf1] bg-white shadow-[0_1px_3px_rgba(16,42,67,0.035)]";
const muted = "text-[#748aa0]";
const tone = {
  blue: { ink: "text-[#2277ee]", bg: "bg-[#e8f1ff]", line: "blue" as const },
  orange: { ink: "text-[#f58b20]", bg: "bg-[#fff0df]", line: "orange" as const },
  green: { ink: "text-[#159263]", bg: "bg-[#e4f7ef]", line: "green" as const },
  red: { ink: "text-[#ed4b4b]", bg: "bg-[#ffe7e7]", line: "red" as const },
  purple: { ink: "text-[#8057e8]", bg: "bg-[#eee9ff]", line: "purple" as const },
};
const sellerAvatarTones = [
  "bg-[#e7f0ff] text-[#2277ee]",
  "bg-[#e2f6ed] text-[#159263]",
  "bg-[#fff0df] text-[#f08b20]",
  "bg-[#ffe8e8] text-[#ed5353]",
  "bg-[#eee9ff] text-[#8057e8]",
];

function sellerInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return (parts[0] ?? "?").slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function actionPriority(item: { id: string; count: number }) {
  if (item.count === 0) return { label: "Bajo", icon: CheckCircle2, iconBg: "bg-[#e4f7ef]", iconInk: "text-[#159263]", badge: "bg-[#d7f3e5] text-[#16824f]" };
  if (item.id === "orders-to-confirm" || item.id === "quotes-to-follow-up") return { label: "Alta", icon: item.id === "orders-to-confirm" ? PackageCheck : FileText, iconBg: "bg-[#ffe7e7]", iconInk: "text-[#ed5353]", badge: "bg-[#ffe1e1] text-[#c94343]" };
  if (item.id === "overdue-followups" || item.id === "payments-to-verify") return { label: "Media", icon: item.id === "overdue-followups" ? Clock3 : ShoppingCart, iconBg: "bg-[#fff0df]", iconInk: "text-[#f08b20]", badge: "bg-[#ffedd4] text-[#a96b1b]" };
  return { label: "Media", icon: Package, iconBg: "bg-[#fff0df]", iconInk: "text-[#f08b20]", badge: "bg-[#ffedd4] text-[#a96b1b]" };
}

function money(value: number | null | undefined, currency: string | null | undefined) {
  if (value === null || value === undefined || !currency || !Number.isFinite(value)) return "N/D";
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function number(value: number | null | undefined) {
  return value === null || value === undefined || !Number.isFinite(value)
    ? "N/D"
    : new Intl.NumberFormat("es-PE").format(value);
}

function dateLabel(value: string | Date | null | undefined) {
  if (!value) return "N/D";
  // Date buckets from PostgreSQL arrive as YYYY-MM-DD. Parsing that shape as
  // UTC midnight shifts the visible day back in America/Lima.
  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T05:00:00.000Z`)
    : new Date(value);
  return Number.isNaN(date.getTime())
    ? "N/D"
    : date
        .toLocaleDateString("es-PE", { day: "numeric", month: "short", timeZone: "America/Lima" })
        .replace(".", "");
}

function Delta({
  current,
  previous,
  unit = "%",
  invert = false,
}: {
  current: number;
  previous: number;
  unit?: "%" | "pp";
  /** True for metrics where going up is bad (e.g. stock crítico) — flips the green/red mapping. */
  invert?: boolean;
}) {
  if (previous === 0 && unit !== "pp")
    return <span className={`mt-2 block text-[11px] font-bold ${muted}`}>Sin base comparable</span>;
  const value = unit === "pp" ? current - previous : ((current - previous) / Math.abs(previous)) * 100;
  if (!Number.isFinite(value))
    return <span className={`mt-2 block text-[11px] font-bold ${muted}`}>Sin base comparable</span>;
  const isGood = invert ? value < 0 : value > 0;
  const isBad = invert ? value > 0 : value < 0;
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Info;
  return (
    <span
      className={`mt-2 inline-flex items-center gap-1 text-[11px] font-bold ${isGood ? "text-[#159263]" : isBad ? "text-[#ed4b4b]" : muted}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {Math.abs(value).toFixed(1)}
      {unit} vs. período anterior
    </span>
  );
}

function T2PageHeader({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#e8f1ff] text-[#2277ee]">
          <Icon className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-[26px] font-black tracking-[-0.035em] text-[#102a43] sm:text-[29px]">
            {title}
          </h1>
          <p className={`mt-1 text-[12px] font-semibold ${muted}`}>{description}</p>
        </div>
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

function Action({
  children,
  href,
  icon: Icon,
  primary = false,
  download = false,
  form,
  type = "button",
}: {
  children: ReactNode;
  href?: string;
  icon?: LucideIcon;
  primary?: boolean;
  download?: boolean;
  form?: string;
  type?: "button" | "submit";
}) {
  const className = `inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3.5 text-[11px] font-extrabold transition ${primary ? "bg-[#2277ee] text-white shadow-[0_5px_12px_rgba(34,119,238,0.16)] hover:bg-[#1764d2]" : "border border-[#dce6ee] bg-white text-[#304b66] hover:border-[#2277ee] hover:text-[#2277ee]"}`;
  return href ? (
    <a className={className} href={href} download={download}>
      {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
      {children}
    </a>
  ) : (
    <button type={type} form={form} className={className}>
      {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

function Metric({
  label,
  value,
  note,
  icon: Icon,
  color = "blue",
  sparkline,
}: {
  label: string;
  value: string | number;
  note?: ReactNode;
  icon: LucideIcon;
  color?: keyof typeof tone;
  sparkline?: number[];
}) {
  const colors = tone[color];
  return (
    <article className={`${panel} min-h-[80px] p-2.5`}>
      <div className="flex items-start gap-2.5">
        <span
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colors.bg} ${colors.ink}`}
        >
          <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className={`text-[9px] font-semibold leading-4 ${muted}`}>{label}</p>
          <p className="mt-0.5 font-display text-[18px] font-black tracking-[-0.025em] text-[#102a43]">
            {value}
          </p>
          {note ? <div className={`mt-0.5 text-[9px] font-bold ${colors.ink}`}>{note}</div> : null}
        </div>
      </div>
      <AdminSparkline tone={colors.line} data={sparkline} ariaLabel={`Tendencia de ${label}`} className="mt-1.5 block h-4 w-full" />
    </article>
  );
}

const toneBarColor: Record<keyof typeof tone, string> = {
  blue: "bg-[#2277ee]",
  orange: "bg-[#f58b20]",
  green: "bg-[#159263]",
  red: "bg-[#ed5353]",
  purple: "bg-[#8057e8]",
};

// Dashboard-exclusive hero KPI card. Deliberately separate from Metric (shared across every
// other admin module) so enlarging it for the executive dashboard's headline row never
// changes any other page.
function DashboardHeroMetric({
  label,
  value,
  note,
  icon: Icon,
  color = "blue",
  sparkline,
  sparklineAvailable = true,
  progress,
}: {
  label: string;
  value: string | number;
  note?: ReactNode;
  icon: LucideIcon;
  color?: keyof typeof tone;
  sparkline?: number[];
  sparklineAvailable?: boolean;
  /** 0-100 ratio. When set, replaces the daily sparkline with a proportion bar
   * — used for ratio metrics (like conversion) that have no daily time series
   * to plot but do have a real, non-fabricated share to show. */
  progress?: number;
}) {
  const colors = tone[color];
  return (
    <article className={`${panel} min-h-[172px] p-4 sm:p-5`}>
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${colors.bg} ${colors.ink}`}
        >
          <Icon className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className={`text-[12px] font-semibold leading-4 ${muted}`}>{label}</p>
          <p className="mt-1 font-display text-[26px] font-black tracking-[-0.025em] text-[#102a43]">
            {value}
          </p>
          {note ? <div className={`mt-1.5 text-[11px] font-bold ${colors.ink}`}>{note}</div> : null}
        </div>
      </div>
      {progress !== undefined ? (
        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-[#eef2f6]" role="img" aria-label={`${label}: ${Math.round(progress)}%`}>
          <span className={`block h-full rounded-full ${toneBarColor[color]}`} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      ) : (
        <>
          <AdminSparkline
            tone={colors.line}
            data={sparkline}
            ariaLabel={sparklineAvailable ? `Tendencia diaria de ${label.toLowerCase()}` : `${label}: sin serie diaria disponible`}
            className="mt-3 block h-11 w-full"
          />
          {!sparklineAvailable ? <p className="mt-1 text-[9px] font-semibold text-[#a5b6c5]">Sin serie diaria disponible</p> : null}
        </>
      )}
    </article>
  );
}

function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${panel} p-4 sm:p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-extrabold text-[#102a43]">{title}</h2>
          {subtitle ? (
            <p className={`mt-1 text-[10px] font-semibold ${muted}`}>{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({
  title,
  description,
  icon: Icon = AlertCircle,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex min-h-[150px] flex-col items-center justify-center rounded-xl border border-dashed border-[#d7e3eb] bg-[#fbfcfd] px-5 text-center">
      <Icon className="h-7 w-7 text-[#9db0c1]" aria-hidden="true" />
      <p className="mt-3 text-[11px] font-extrabold text-[#304b66]">{title}</p>
      <p className={`mt-1 max-w-sm text-[10px] font-semibold leading-5 ${muted}`}>{description}</p>
    </div>
  );
}

function statusClass(value: string) {
  if (/critical|alta|failed|retras|cancel|error|vencid/i.test(value))
    return "bg-[#ffe7e7] text-[#c43333]";
  if (/partial|media|review|pend|draft|program/i.test(value)) return "bg-[#fff0df] text-[#9a5c16]";
  if (/received|success|active|resolved|baja|published|connected|ready/i.test(value))
    return "bg-[#e4f7ef] text-[#15784e]";
  return "bg-[#e8f1ff] text-[#2568bf]";
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-[9px] font-extrabold ${statusClass(String(children))}`}
    >
      {children}
    </span>
  );
}

function currencyNote(data: DashboardData) {
  if (!data.availableCurrencies.length) return "Moneda: N/D";
  return `Moneda: ${data.currency ?? "N/D"}${data.currencyAmbiguous ? ` · disponibles: ${data.availableCurrencies.join(" / ")}` : ""}`;
}

function paymentMethodLabel(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();
  const labels: Record<string, string> = {
    TRANSFER: "Transferencia",
    BANK_TRANSFER: "Transferencia bancaria",
    CARD: "Tarjeta",
    CREDIT_CARD: "Tarjeta de crédito",
    DEBIT_CARD: "Tarjeta de débito",
    CASH: "Efectivo",
    YAPE: "Yape",
    PLIN: "Plin",
    PROVIDER: "Proveedor de pagos",
    MANUAL: "Registro manual",
  };
  return labels[normalized ?? ""] ?? value?.trim() ?? "Sin método";
}

function dashboardFilters(
  data: DashboardData,
  filterOptions: DashboardFilterOptions | null | undefined,
) {
  return (
    <AdminDashboardControls
      filters={data.filters}
      availableCurrencies={data.availableCurrencies}
      options={
        filterOptions ?? {
          locations: [],
          sellers: [],
          customers: [],
          products: [],
          categories: [],
          families: [],
          brands: [],
        }
      }
    />
  );
}

function PaymentMethodsPanel({ data }: { data: DashboardData }) {
  const ordered = data.paymentMethods
    .filter((row) => row.amount > 0)
    .sort((left, right) => right.amount - left.amount);
  const visible = ordered.slice(0, 5);
  const remainder = ordered.slice(5).reduce((sum, row) => sum + row.amount, 0);
  if (remainder > 0)
    visible.push({
      method: "OTHER",
      amount: remainder,
      count: ordered.slice(5).reduce((sum, row) => sum + row.count, 0),
    });
  const total = visible.reduce((sum, row) => sum + row.amount, 0);
  const colors = ["#2277ee", "#159263", "#f08b20", "#8057e8", "#ed4b4b", "#94a9bb"];
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const gap = visible.length > 1 ? circumference * 0.012 : 0;
  const segments = visible.map((row, index) => {
    const priorAmount = visible.slice(0, index).reduce((sum, item) => sum + item.amount, 0);
    const segment = Math.max(0, (row.amount / total) * circumference - gap);
    return { row, index, segment, offset: (priorAmount / total) * circumference };
  });
  return (
    <section className="min-w-0 rounded-[10px] border border-[#e2eaf1] bg-white p-4 shadow-[0_1px_3px_rgba(16,42,67,0.035)] sm:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="truncate text-[15px] font-extrabold leading-5 text-[#102a43]">Métodos de pago</h2>
        <span className="truncate text-[11px] font-semibold leading-4 text-[#748aa0]">Participación en ventas</span>
      </div>
      {total > 0 ? (
        <div className="mt-4 flex min-w-0 items-center gap-5">
          <div className="relative h-[152px] w-[152px] shrink-0" role="img" aria-label={`Participación de pagos confirmados: ${visible.map((row) => `${paymentMethodLabel(row.method)} ${((row.amount / total) * 100).toFixed(1)}%`).join(", ")}`}>
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="50" cy="50" r={radius} fill="none" stroke="#edf2f6" strokeWidth="14" />
              {segments.map(({ row, index, segment, offset }) => (
                <circle
                  key={`${row.method}-${index}`}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={colors[index] ?? colors.at(-1)}
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={`${segment} ${circumference - segment}`}
                  strokeDashoffset={-offset}
                />
              ))}
            </svg>
            <span className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-white text-center">
              <strong className="text-[17px] font-black leading-5 text-[#102a43]">{money(total, data.currency)}</strong>
              <span className={`mt-0.5 text-[10px] font-semibold leading-4 ${muted}`}>Total cobrado</span>
            </span>
          </div>
          <div className="grid min-w-0 flex-1 gap-2">
            {visible.map((row, index) => (
              <div key={`${row.method}-${index}`} className="flex min-w-0 items-center gap-2 text-[12px]">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: colors[index] ?? colors.at(-1) }} />
                <span className={`min-w-0 flex-1 truncate font-semibold ${muted}`}>{paymentMethodLabel(row.method)}</span>
                <strong className="shrink-0 text-[12px] text-[#304b66]">{((row.amount / total) * 100).toFixed(1)}%</strong>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-[9px] border border-dashed border-[#d7e3eb] bg-[#fbfcfd] px-3 py-6 text-center">
          <CircleDollarSign className="mx-auto h-7 w-7 text-[#9db0c1]" aria-hidden="true" />
          <p className="mt-2 text-[11px] font-extrabold text-[#304b66]">Sin pagos confirmados</p>
        </div>
      )}
    </section>
  );
}

function dashboardActivityInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") : "CP";
}

function dashboardActivityTone(activity: DashboardData["recentActivity"][number]) {
  const value = `${activity.entityType} ${activity.entityLabel}`.toLowerCase();
  if (value.includes("cotiz")) return { avatar: "bg-[#fff0df] text-[#f08b20]", badge: "bg-[#fff6ec] text-[#f08b20]" };
  if (value.includes("pedido") || value.includes("venta")) return { avatar: "bg-[#e0f7ee] text-[#159263]", badge: "bg-[#eafaf3] text-[#159263]" };
  if (value.includes("invent") || value.includes("stock")) return { avatar: "bg-[#e4f7f2] text-[#159263]", badge: "bg-[#eafaf3] text-[#159263]" };
  if (value.includes("cliente") || value.includes("customer")) return { avatar: "bg-[#eee8ff] text-[#8057e8]", badge: "bg-[#f4f0ff] text-[#8057e8]" };
  return { avatar: "bg-[#e8f1ff] text-[#2277ee]", badge: "bg-[#edf4ff] text-[#2277ee]" };
}

function dashboardActivityModule(activity: DashboardData["recentActivity"][number]) {
  if (activity.entityType === "product") return "Productos";
  if (activity.entityType === "customer") return "Clientes";
  if (activity.entityType === "quote") return "Cotizaciones";
  if (activity.entityType === "order") return "Pedidos";
  if (activity.entityType === "sale") return "Ventas";
  if (activity.entityType === "payment") return "Pagos";
  return activity.entityLabel;
}

function dashboardActivityTime(value: string | Date) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "N/D";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days} d`;
}

function dashboardActivityHref(activity: DashboardData["recentActivity"][number]) {
  const entityId = encodeURIComponent(activity.entityId);
  if (activity.entityType === "product") return `/admin/catalogo/${entityId}`;
  if (activity.entityType === "customer") return `/admin/clientes?query=${encodeURIComponent(activity.entityLabel)}`;
  if (activity.entityType === "payment") return `/admin/pagos?orderId=${entityId}`;
  if (activity.entityType === "quote") return "/admin/cotizaciones";
  if (activity.entityType === "order") return "/admin/pedidos";
  if (activity.entityType === "sale") return "/admin/ventas";
  return "/admin/auditoria";
}

function RecentActivityPanel({ data }: { data: DashboardData }) {
  const rows = data.recentActivity.slice(0, 5);
  return (
    <section className="min-w-0 rounded-[10px] border border-[#e2eaf1] bg-white p-4 shadow-[0_1px_3px_rgba(16,42,67,0.035)] sm:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="truncate text-[15px] font-extrabold leading-5 text-[#102a43]">Actividad reciente</h2>
        <Link href="/admin/auditoria" className="shrink-0 text-[11px] font-extrabold text-[#2277ee]">Ver todas <ChevronRight className="inline h-3 w-3" /></Link>
      </div>
      <div className="mt-3 overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[28px_96px_minmax(140px,1fr)_96px_minmax(110px,1fr)_60px] items-center gap-2 border-b border-[#edf2f6] pb-2 text-[10px] font-extrabold uppercase tracking-[0.03em] text-[#91a3b3]">
            <span />
            <span>Usuario</span>
            <span>Acción</span>
            <span>Módulo</span>
            <span>Detalle</span>
            <span className="text-right">Tiempo</span>
          </div>
          {rows.length ? rows.map((event) => {
            const visual = dashboardActivityTone(event);
            return (
              <Link key={event.id} href={dashboardActivityHref(event)} className="grid min-h-[36px] grid-cols-[28px_96px_minmax(140px,1fr)_96px_minmax(110px,1fr)_60px] items-center gap-2 border-b border-[#f1f4f7] py-1.5 last:border-0 hover:bg-[#fbfdff]">
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-extrabold ${visual.avatar}`} aria-hidden="true">{dashboardActivityInitials(event.actorName)}</span>
                <span className="truncate text-[11px] font-semibold text-[#526b84]" title={event.actorName}>{event.actorName}</span>
                <span className="truncate text-[11px] font-extrabold text-[#304b66]" title={event.actionLabel}>{event.actionLabel}</span>
                <span className={`w-fit truncate rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${visual.badge}`}>{dashboardActivityModule(event)}</span>
                <span className="truncate text-[11px] font-semibold text-[#526b84]" title={event.entityId}>{event.entityId}</span>
                <time className="truncate text-right text-[10px] font-semibold text-[#748aa0]">{dashboardActivityTime(event.createdAt)}</time>
              </Link>
            );
          }) : <div className="py-6 text-center text-[11px] font-semibold text-[#748aa0]">Sin actividad registrada</div>}
        </div>
      </div>
    </section>
  );
}

function CompactOperationalMetric({ label, value, note, icon: Icon, toneClass = "bg-[#e8f1ff] text-[#2277ee]", invert = false }: { label: string; value: string; note: string; icon: LucideIcon; toneClass?: string; invert?: boolean }) {
  const rising = note.startsWith("+");
  const falling = note.startsWith("-");
  const positive = invert ? falling : rising;
  const negative = invert ? rising : falling;
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-[9px] border border-[#e8eef3] bg-[#fbfcfd] px-3.5 py-3">
      <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneClass}`}><Icon className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" /></span>
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-semibold leading-4 text-[#748aa0]">{label}</span>
        <span className="mt-0.5 flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <strong className="truncate text-[16px] font-black leading-5 text-[#102a43]">{value}</strong>
          <span className={`truncate text-[10px] font-extrabold ${positive ? "text-[#159263]" : negative ? "text-[#ed4b4b]" : "text-[#748aa0]"}`}>{note}</span>
        </span>
      </span>
    </div>
  );
}

function OperationalSummaryPanel({ data }: { data: DashboardData }) {
  const averageTicket = data.salesRange.count > 0 ? data.salesRange.total / data.salesRange.count : null;
  const ticketNote = averageTicket === null
    ? "Sin ventas"
    : data.previousAverageTicket === null || data.previousAverageTicket === 0
      ? "Sin base comparable"
      : `${averageTicket - data.previousAverageTicket >= 0 ? "+" : ""}${(((averageTicket - data.previousAverageTicket) / data.previousAverageTicket) * 100).toFixed(1)}% vs. anterior`;
  return (
    <section className="min-w-0 rounded-[10px] border border-[#e2eaf1] bg-white p-5 shadow-[0_1px_3px_rgba(16,42,67,0.035)] sm:p-6">
      <div className="flex items-baseline gap-2">
        <h2 className="truncate text-[16px] font-extrabold leading-5 text-[#102a43]">Resumen operativo</h2>
        <span className="truncate text-[12px] font-semibold leading-4 text-[#748aa0]">Indicadores clave del período</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <CompactOperationalMetric
          label="Nivel de servicio (SLA)"
          value={data.slaRate === null ? "N/D" : `${(data.slaRate * 100).toFixed(1)}%`}
          note={data.slaRate === null ? "Sin pedidos entregados" : "Histórico"}
          icon={Gauge}
        />
        <CompactOperationalMetric
          label="Fill rate (disponibilidad)"
          value={data.fillRate === null ? "N/D" : `${(data.fillRate * 100).toFixed(1)}%`}
          note={data.fillRate === null ? "Sin unidades pedidas" : "Histórico"}
          icon={PackageCheck}
          toneClass="bg-[#e4f7ef] text-[#159263]"
        />
        <CompactOperationalMetric label="Ticket promedio" value={money(averageTicket, data.currency)} note={ticketNote} icon={Tag} toneClass="bg-[#eee9ff] text-[#8057e8]" />
        <CompactOperationalMetric
          label="Tiempo de preparación"
          value={data.avgPrepDays === null ? "N/D" : `${data.avgPrepDays.toFixed(1)} días`}
          note={data.avgPrepDays === null ? "Sin pedidos preparados" : "Histórico"}
          icon={Clock3}
          toneClass="bg-[#fff0df] text-[#f08b20]"
        />
      </div>
    </section>
  );
}

export function Tanda2Dashboard({
  data,
  filterOptions,
  loadedAt,
}: {
  data: DashboardData | null;
  role: AppRole;
  filterOptions?: DashboardFilterOptions | null;
  loadedAt?: string;
}) {
  if (!data)
    return (
      <div className="space-y-5">
        <T2PageHeader
          icon={LayoutDashboard}
          title="Dashboard ejecutivo"
          description="Visión general comercial, financiera y operativa de ColdPower."
        />
        <Panel title="Dashboard no disponible">
          <Empty
            title="No pudimos cargar el dashboard"
            description="La fuente persistente no respondió. No se muestran métricas de respaldo."
            icon={AlertCircle}
          />
        </Panel>
      </div>
    );
  const q = dashboardFiltersToQuery(data.filters);
  const labels = data.salesSeries.map((row) => dateLabel(row.date));
  const sales = data.salesRange.total;
  const conversion = data.conversion.percentage;
  const secondary = [
    {
      label: "Cotizaciones abiertas",
      value: data.pendingQuotesCount,
      icon: FileText,
      color: "orange" as const,
      href: "/admin/cotizaciones?status=open",
      comparison: { current: data.pendingQuotesCount, previous: data.previousOpenQuotes },
    },
    {
      label: "Stock crítico",
      value: data.criticalStockCount,
      icon: Package,
      color: "red" as const,
      href: "/admin/inventario?critical=true",
      comparison: data.comparisons.criticalStock,
      invertComparison: true,
    },
    {
      label: "Pagos por revisar",
      value: data.pendingPaymentsCount,
      icon: CircleDollarSign,
      color: "blue" as const,
      href: "/admin/pagos",
      comparison: { current: data.pendingPaymentsCount, previous: data.previousPendingPayments },
      invertComparison: true,
    },
    {
      label: "Seguimientos vencidos",
      value: data.overdueFollowUpsCount,
      icon: Clock3,
      color: "purple" as const,
      href: "/admin/crm?view=pipeline",
      comparison: { current: data.overdueFollowUpsCount, previous: data.previousOverdueFollowUps },
      invertComparison: true,
    },
    {
      label: "Clientes activos",
      value: data.activeCustomersCount,
      icon: UsersRound,
      color: "green" as const,
      href: "/admin/clientes",
      comparison: { current: data.activeCustomersCount, previous: data.previousActiveCustomers },
    },
  ];
  return (
    <div className="space-y-5">
      <T2PageHeader
        icon={LayoutDashboard}
        title="Dashboard ejecutivo"
        description="Visión general comercial, financiera y operativa de ColdPower."
      >
        {dashboardFilters(data, filterOptions)}
        <Action href={`/api/admin/dashboard/export?${q.toString()}`} icon={Download} download>
          Exportar reporte
        </Action>
      </T2PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <DashboardHeroMetric
          label="Ventas confirmadas"
          value={money(sales, data.currency)}
          color="blue"
          icon={CircleDollarSign}
          note={<Delta current={sales} previous={data.comparisons.sales.previous} />}
          sparkline={data.salesSeries.map((row) => row.total)}
        />
        <DashboardHeroMetric
          label="Margen bruto"
          value={money(data.grossProfit, data.currency)}
          color="green"
          icon={BarChart3}
          note={
            data.grossProfit === null ? (
              "N/D · costo histórico incompleto"
            ) : (
              <>
                {data.previousGrossProfit !== null ? <Delta current={data.grossProfit} previous={data.previousGrossProfit} /> : null}
                <span className="mt-1 block">{data.grossMargin === null ? "N/D" : `${(data.grossMargin * 100).toFixed(1)}%`} de margen</span>
              </>
            )
          }
          sparkline={
            data.grossProfit === null ? undefined : data.salesSeries.map((row) => row.total)
          }
          sparklineAvailable={data.grossProfit !== null}
        />
        <DashboardHeroMetric
          label="Cobrado"
          value={money(data.collected, data.currency)}
          color="purple"
          icon={CircleDollarSign}
          note={
            data.collected === null ? (
              "N/D · pagos confirmados no disponibles"
            ) : (
              <>
                {data.previousCollected !== null ? <Delta current={data.collected} previous={data.previousCollected} /> : null}
                <span className="mt-1 block">Pagos confirmados menos reembolsos</span>
              </>
            )
          }
          sparkline={data.collectedSeries.length ? data.collectedSeries.map((row) => row.total) : undefined}
          sparklineAvailable={data.collectedSeries.length > 0}
        />
        <DashboardHeroMetric
          label="Pedidos activos"
          value={number(data.orders.total)}
          color="orange"
          icon={ShoppingCart}
          note={<Delta current={data.orders.total} previous={data.comparisons.orders.previous} />}
          sparkline={data.salesSeries.map((row) => row.orders ?? 0)}
        />
        <DashboardHeroMetric
          label="Conversión comercial"
          value={conversion === null ? "N/D" : `${conversion.toFixed(1)}%`}
          color={conversion === null ? "blue" : conversion > 0 ? "green" : "red"}
          icon={Target}
          note={
            conversion === null ? (
              "Sin denominador"
            ) : (
              <>
                {data.previousConversion !== null ? <Delta current={conversion} previous={data.previousConversion} unit="pp" /> : null}
                <span className="mt-1 block">{data.conversion.convertedQuotes} convertidas / {data.conversion.totalQuotes} evaluadas</span>
              </>
            )
          }
          progress={conversion ?? 0}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {secondary.map(({ label, value, icon: Icon, color, href, comparison, invertComparison }) => (
          <Link
            key={label}
            href={href}
            className={`${panel} flex min-h-[92px] items-center gap-3.5 p-4 transition hover:-translate-y-0.5 hover:border-[#b9d2eb]`}
          >
            <span
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tone[color].bg} ${tone[color].ink}`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-[11px] font-semibold ${muted}`}>{label}</span>
              <strong className={`mt-1 block text-[21px] font-black ${tone[color].ink}`}>
                {number(value)}
              </strong>
              {comparison ? <Delta current={comparison.current} previous={comparison.previous} invert={invertComparison} /> : null}
            </span>
            <ChevronRight className="ml-auto h-5 w-5 shrink-0 self-start text-[#a5b6c5]" aria-hidden="true" />
          </Link>
        ))}
      </div>

      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex min-w-0 flex-col rounded-[10px] border border-[#e2eaf1] bg-white p-4 shadow-[0_1px_3px_rgba(16,42,67,0.035)] sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-[15px] font-extrabold leading-5 text-[#102a43]">Evolución de ventas y margen</h2>
                <AdminTooltip label="Ventas netas confirmadas por día, comparadas con el mismo punto del período anterior. El margen bruto (%) solo se traza en días con ventas confirmadas y costo completo — por eso la línea verde no cubre todo el período.">
                  <Info className="h-3.5 w-3.5 text-[#9aabba]" aria-hidden="true" />
                </AdminTooltip>
              </div>
              <p className="mt-1 text-[11px] font-semibold leading-4 text-[#748aa0]">Ventas netas, período anterior y margen bruto</p>
              <span className="sr-only">{currencyNote(data)} · zona horaria America/Lima</span>
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-3.5 gap-y-1.5 text-[11px] font-semibold text-[#71869c]">
              <span className="inline-flex items-center gap-1.5">
                <i className="h-2 w-2 rounded-full border-2 border-[#2277ee] bg-white" />
                Ventas actuales
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="h-1.5 w-1.5 rounded-full border-[1.5px] border-[#94c2ff] bg-white" />
                Ventas período anterior
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="h-2 w-2 rounded-full bg-[#159263]" />
                Margen bruto (%)
              </span>
              <DashboardGranularitySelect compact filters={data.filters} value={data.granularity} />
            </div>
          </div>
          <div className="mt-3 min-h-0 flex-1">
            {data.salesSeries.length ? (
              <AdminLineChart
                comparison
                filled
                fillHeight
                largeLabels
                data={data.salesSeries.map((row) => row.total)}
                previous={data.previousSalesSeries.map((row) => row.total)}
                margin={data.salesSeries.map((row) => row.margin)}
                labels={labels}
                currencyAxis
                currency={data.currency}
                ariaLabel="Evolución de ventas y comparación con el período anterior"
                pointDetails={data.salesSeries.map((row, index) => ({
                  ...row,
                  previousTotal: data.previousSalesSeries[index]?.total ?? 0,
                  href: `/admin/ventas?createdFrom=${row.date.slice(0, 10)}&createdTo=${row.date.slice(0, 10)}`,
                }))}
              />
            ) : (
              <Empty
                title="Sin ventas confirmadas"
                description="El gráfico aparecerá cuando la fuente persistente tenga actividad."
                icon={BarChart3}
              />
            )}
          </div>
        </section>
        <section className="flex min-w-0 flex-col rounded-[10px] border border-[#e2eaf1] bg-white p-4 shadow-[0_1px_3px_rgba(16,42,67,0.035)] sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-[15px] font-extrabold leading-5 text-[#102a43]">Estado del negocio</h2>
              <p className="mt-1 text-[11px] font-semibold leading-4 text-[#748aa0]">Tareas que requieren tu atención</p>
            </div>
            <Link href="/admin/operaciones" className="shrink-0 text-[11px] font-extrabold text-[#2277ee]">
              Ver todas <ChevronRight className="inline h-3 w-3" />
            </Link>
          </div>
          <div className="mt-2 flex flex-1 flex-col justify-center divide-y divide-[#edf2f6]">
            {data.pendingActions.slice(0, 5).map((item) => {
              const priority = actionPriority(item);
              const Icon = priority.icon;
              return (
                <Link key={item.id} href={item.href} className="flex min-h-[44px] items-center gap-2.5 py-2 transition hover:bg-[#fbfdff]">
                  <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${priority.iconBg} ${priority.iconInk}`}>
                    <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-extrabold leading-4 text-[#304b66]">{item.label}</span>
                    <span className={`block text-[10px] font-semibold leading-4 ${muted}`}>{item.count > 0 ? "Requiere atención" : "Sin pendientes"}</span>
                  </span>
                  <strong className="w-7 shrink-0 text-right text-[16px] font-black leading-5 text-[#102a43]">{item.count}</strong>
                  <span className={`inline-flex w-14 shrink-0 items-center justify-center rounded-full px-1.5 py-1 text-[9px] font-extrabold leading-4 ${priority.badge}`}>{priority.label}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#9eb1c2]" aria-hidden="true" />
                </Link>
              );
            })}
            {!data.pendingActions.length ? (
              <Empty title="Sin alertas" description="No hay acciones pendientes en este alcance." icon={CheckCircle2} />
            ) : null}
          </div>
        </section>
      </div>

      {data.currencyAmbiguous ? (
        <Panel
          title="Importes separados por moneda"
          subtitle="La vista principal está enfocada en la moneda resuelta; no se suman PEN y USD."
        >
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {data.currencyBreakdown.map((item) => (
              <div
                key={item.currency}
                className="rounded-xl border border-[#edf2f6] bg-[#fbfcfd] p-3"
              >
                <span className="text-[10px] font-extrabold text-[#71869c]">{item.currency}</span>
                <strong className="mt-1 block text-[18px] font-black text-[#102a43]">
                  {money(item.sales, item.currency)}
                </strong>
                <span className="mt-1 block text-[9px] font-semibold text-[#71869c]">
                  {number(item.salesCount)} ventas confirmadas
                </span>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <section className="min-w-0 rounded-[10px] border border-[#e2eaf1] bg-white p-5 shadow-[0_1px_3px_rgba(16,42,67,0.035)] sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-baseline gap-2.5">
            <h2 className="shrink-0 text-[16px] font-extrabold leading-5 text-[#102a43]">Pipeline comercial</h2>
            <p className="truncate text-[12px] font-semibold leading-4 text-[#748aa0]">Oportunidades activas por macroetapa</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-[12px] font-semibold text-[#71869c]">
            <span className="hidden sm:inline">Total: <strong className="text-[#304b66]">{number(data.pipelineActiveTotal.count)} oportunidades</strong> <span className="px-1">|</span> <strong className="text-[#304b66]">{money(data.pipelineActiveTotal.amount, data.currency)}</strong></span>
            <Link href="/admin/crm" className="text-[12px] font-extrabold text-[#2277ee]">Ver pipeline <ChevronRight className="inline h-3.5 w-3.5" /></Link>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          {data.pipelineMacroSummary.map((stage, index) => {
            const visual = [
              { icon: Target, bg: "bg-[#e8f1ff]", ink: "text-[#2277ee]", surface: "bg-[#f4f8ff]", bar: "bg-[#2277ee]" },
              { icon: FileText, bg: "bg-[#e4f7ef]", ink: "text-[#29a1d8]", surface: "bg-[#f3fbfc]", bar: "bg-[#29a1d8]" },
              { icon: Clock3, bg: "bg-[#e4f7ef]", ink: "text-[#159263]", surface: "bg-[#f2fbf6]", bar: "bg-[#159263]" },
              { icon: Workflow, bg: "bg-[#fff0df]", ink: "text-[#f08b20]", surface: "bg-[#fff9f0]", bar: "bg-[#f08b20]" },
              { icon: CheckCircle2, bg: "bg-[#eee9ff]", ink: "text-[#8057e8]", surface: "bg-[#faf5ff]", bar: "bg-[#8057e8]" },
            ][index] ?? { icon: Target, bg: "bg-[#e8f1ff]", ink: "text-[#2277ee]", surface: "bg-[#f4f8ff]", bar: "bg-[#2277ee]" };
            const Icon = visual.icon;
            return (
              <Link
                key={stage.macroStage}
                href={`/admin/crm?view=pipeline&stage=${encodeURIComponent(stage.stages.join(","))}`}
                className={`min-h-[96px] rounded-[10px] border border-[#e8eef3] p-3.5 transition hover:border-[#b9d2eb] ${visual.surface}`}
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${visual.bg} ${visual.ink}`}>
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <strong className="truncate text-[13px] font-extrabold leading-4 text-[#304b66]">{stage.macroStageLabel}</strong>
                      <span className="shrink-0 text-[17px] font-black leading-5 text-[#304b66]">{(stage.share * 100).toFixed(0)}%</span>
                    </div>
                    <div className="mt-1 truncate text-[11px] font-semibold leading-4 text-[#71869c]">{stage.count} <span className="px-0.5">|</span> {money(stage.amount, data.currency)}</div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/80">
                      <span className={`block h-full rounded-full ${visual.bar}`} style={{ width: `${Math.min(100, Math.max(0, stage.share * 100))}%` }} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <TopProductsPanel data={data} />
        <TopCustomersPanel data={data} />
        <TopSellersPanel data={data} />
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1.08fr)_minmax(270px,0.92fr)]">
        <RecentActivityPanel data={data} />
        <OperationalSummaryPanel data={data} />
        <PaymentMethodsPanel data={data} />
      </div>
      <p className={`text-[11px] font-semibold ${muted}`}>
        Actualizado {loadedAt ? dateLabel(loadedAt) : "N/D"} · {currencyNote(data)}
      </p>
    </div>
  );
}

const productChipTones = [
  "bg-[#e7f0ff] text-[#2277ee]",
  "bg-[#e2f6ed] text-[#159263]",
  "bg-[#fff0df] text-[#f08b20]",
  "bg-[#ffe8e8] text-[#ed5353]",
  "bg-[#eee9ff] text-[#8057e8]",
];

function TopProductsPanel({ data }: { data: DashboardData }) {
  const rows = data.topProducts.slice(0, 5);
  return (
    <section className="min-w-0 self-start rounded-[10px] border border-[#e2eaf1] bg-white p-5 shadow-[0_1px_3px_rgba(16,42,67,0.035)] sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2 className="truncate text-[16px] font-extrabold leading-5 text-[#102a43]">Top productos por ventas</h2>
          <span className="sr-only">Ingresos confirmados</span>
        </div>
        <Link href="/admin/catalogo" className="shrink-0 text-[12px] font-extrabold text-[#2277ee]">Ver todas <ChevronRight className="inline h-3.5 w-3.5" /></Link>
      </div>
      {rows.length ? (
        <>
          <div className="mt-4 grid grid-cols-[22px_minmax(0,1fr)_62px_84px_70px] items-center gap-2.5 border-b border-[#edf2f6] pb-2.5 text-[11px] font-extrabold uppercase tracking-[0.03em] text-[#91a3b3]">
            <span>#</span><span>Producto</span><span className="text-center">Unidades</span><span>Ingreso</span><span>Tendencia</span>
          </div>
          <div className="divide-y divide-[#f1f4f7]">
            {rows.map((row, index) => {
              const trend = row.trendPercent;
              const TrendIcon = trend === null ? null : trend >= 0 ? ArrowUpRight : ArrowDownRight;
              return (
                <Link key={row.id} href={`/admin/catalogo?query=${encodeURIComponent(row.sku)}`} className="grid min-h-[64px] grid-cols-[22px_minmax(0,1fr)_62px_84px_70px] items-center gap-2.5 py-3 transition hover:bg-[#fbfdff]">
                  <span className="text-center text-[12px] font-black text-[#8195aa]">{index + 1}</span>
                  <span className="flex min-w-0 items-center gap-2.5">
                    {row.primaryImageUrl ? (
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[9px] border border-[#e8eef3] bg-white">
                        <Image src={row.primaryImageUrl} alt="" width={36} height={36} className="h-9 w-9 object-contain" unoptimized={row.primaryImageUrl.startsWith("/api/")} />
                      </span>
                    ) : (
                      <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[9px] ${productChipTones[index % productChipTones.length]}`} title="Imagen no disponible">
                        <Package className="h-[22px] w-[22px]" strokeWidth={1.8} aria-hidden="true" />
                      </span>
                    )}
                    <span className="min-w-0 truncate text-[13px] font-extrabold leading-4 text-[#304b66]" title={`${row.name} · ${row.sku}`}>{row.name}</span>
                  </span>
                  <span className="truncate text-center text-[12px] font-semibold leading-4 text-[#526b84]">{number(row.units)}</span>
                  <span className="truncate text-[12px] font-semibold leading-4 text-[#526b84]">{money(row.revenue, data.currency)}</span>
                  <span className={`flex min-w-0 items-center ${trend === null ? "w-16" : "gap-1 text-[12px] font-extrabold"} ${trend === null ? "text-[#8195aa]" : trend >= 0 ? "text-[#159263]" : "text-[#ed5353]"}`} title={trend === null ? "Sin período anterior comparable" : "Variación vs. período anterior"}>
                    {TrendIcon ? <><TrendIcon className="h-4 w-4 shrink-0" aria-hidden="true" />{Math.abs(trend ?? 0).toFixed(0)}%</> : <AdminSparkline tone="blue" data={row.trend} ariaLabel={`Tendencia de ingresos de ${row.name}`} className="mt-0 block h-5 w-full" />}
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      ) : <div className="mt-3"><Empty title="No hay productos vendidos" description="No se recibieron registros para este alcance." icon={Search} /></div>}
    </section>
  );
}

function customerInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return (parts[0] ?? "?").slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function TopCustomersPanel({ data }: { data: DashboardData }) {
  const rows = data.topCustomers.slice(0, 5);
  return (
    <section className="min-w-0 self-start rounded-[10px] border border-[#e2eaf1] bg-white p-5 shadow-[0_1px_3px_rgba(16,42,67,0.035)] sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2 className="truncate text-[16px] font-extrabold leading-5 text-[#102a43]">Top clientes</h2>
          <span className="truncate text-[12px] font-semibold leading-4 text-[#748aa0]">Ventas confirmadas</span>
        </div>
        <Link href="/admin/clientes" className="shrink-0 text-[12px] font-extrabold text-[#2277ee]">Ver todos <ChevronRight className="inline h-3.5 w-3.5" /></Link>
      </div>
      {rows.length ? (
        <>
          <div className="mt-4 grid grid-cols-[22px_minmax(0,1fr)_58px_82px_82px] items-center gap-2.5 border-b border-[#edf2f6] pb-2.5 text-[11px] font-extrabold uppercase tracking-[0.03em] text-[#91a3b3]">
            <span>#</span><span>Cliente</span><span>Ventas</span><span>Monto</span><span>Última compra</span>
          </div>
          <div className="divide-y divide-[#f1f4f7]">
            {rows.map((row, index) => {
              const content = (
                <>
                  <span className="text-center text-[12px] font-black text-[#8195aa]">{index + 1}</span>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${sellerAvatarTones[index % sellerAvatarTones.length]}`} aria-hidden="true">{customerInitials(row.name)}</span>
                    <span className="min-w-0 truncate text-[13px] font-extrabold leading-4 text-[#304b66]" title={row.name}>{row.name}</span>
                  </span>
                  <span className="truncate text-[12px] font-semibold leading-4 text-[#526b84]">{number(row.orders)}</span>
                  <span className="truncate text-[12px] font-semibold leading-4 text-[#526b84]">{money(row.revenue, data.currency)}</span>
                  <span className="truncate text-[12px] font-semibold leading-4 text-[#526b84]">{dateLabel(row.lastPurchase)}</span>
                </>
              );
              return row.id ? <Link key={row.id} href={`/admin/clientes?query=${encodeURIComponent(row.name)}`} className="grid min-h-[64px] grid-cols-[22px_minmax(0,1fr)_58px_82px_82px] items-center gap-2.5 py-3 transition hover:bg-[#fbfdff]">{content}</Link> : <div key={`${row.name}-${index}`} className="grid min-h-[64px] grid-cols-[22px_minmax(0,1fr)_58px_82px_82px] items-center gap-2.5 py-3">{content}</div>;
            })}
          </div>
        </>
      ) : <div className="mt-3"><Empty title="No hay clientes con ventas" description="No se recibieron registros para este alcance." icon={UsersRound} /></div>}
    </section>
  );
}

function TopSellersPanel({ data }: { data: DashboardData }) {
  const rows = data.topSellers.slice(0, 5);
  return (
    <section className="min-w-0 self-start rounded-[10px] border border-[#e2eaf1] bg-white p-5 shadow-[0_1px_3px_rgba(16,42,67,0.035)] sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2 className="truncate text-[16px] font-extrabold leading-5 text-[#102a43]">Vendedores</h2>
          <span className="truncate text-[12px] font-semibold leading-4 text-[#748aa0]">Por ventas netas del periodo</span>
          <span className="sr-only">Top vendedores</span>
        </div>
        <Link href="/admin/ventas" className="shrink-0 text-[12px] font-extrabold text-[#2277ee]">Ver todos <ChevronRight className="inline h-3.5 w-3.5" /></Link>
      </div>
      {rows.length ? (
        <>
          <div className="mt-4 grid grid-cols-[22px_minmax(0,1fr)_74px_90px_100px] items-center gap-2.5 border-b border-[#edf2f6] pb-2.5 text-[11px] font-extrabold uppercase tracking-[0.03em] text-[#91a3b3]">
            <span>#</span><span>Vendedor</span><span>Ventas</span><span className="text-center">Cotizaciones</span><span>Conversión</span>
          </div>
          <div className="divide-y divide-[#f1f4f7]">
            {rows.map((row, index) => {
              const conversion = row.conversion;
              const href = row.id ? `/admin/ventas?sellerId=${encodeURIComponent(row.id)}` : undefined;
              const content = (
                <>
                  <span className="text-center text-[12px] font-black text-[#8195aa]">{index + 1}</span>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${sellerAvatarTones[index % sellerAvatarTones.length]}`} aria-hidden="true">{sellerInitials(row.name)}</span>
                    <span className="min-w-0 truncate text-[13px] font-extrabold leading-4 text-[#304b66]" title={row.name}>{row.name}</span>
                  </span>
                  <span className="truncate text-[12px] font-semibold leading-4 text-[#526b84]">{money(row.revenue, data.currency)}</span>
                  <span className="truncate text-center text-[12px] font-semibold leading-4 text-[#526b84]">{number(row.quotes)}</span>
                  <span className="flex min-w-0 items-center gap-1.5" title={conversion === null ? "Sin denominador comparable" : "Conversión canónica de cotizaciones"}>
                    <span className={`w-10 shrink-0 text-[12px] font-extrabold ${conversion === null ? "text-[#8195aa]" : "text-[#304b66]"}`}>{conversion === null ? "N/D" : `${conversion.toFixed(1)}%`}</span>
                    <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[#e8eef4]" aria-hidden="true">
                      <span className="block h-full rounded-full bg-[#2277ee]" style={{ width: conversion === null ? "0%" : `${Math.min(100, Math.max(0, conversion))}%` }} />
                    </span>
                  </span>
                </>
              );
              return href ? <Link key={row.id} href={href} className="grid min-h-[64px] grid-cols-[22px_minmax(0,1fr)_74px_90px_100px] items-center gap-2.5 py-3 transition hover:bg-[#fbfdff]">{content}</Link> : <div key={`${row.name}-${index}`} className="grid min-h-[64px] grid-cols-[22px_minmax(0,1fr)_74px_90px_100px] items-center gap-2.5 py-3">{content}</div>;
            })}
          </div>
        </>
      ) : <div className="mt-3"><Empty title="No hay vendedores con ventas" description="No se recibieron registros para este alcance." icon={UsersRound} /></div>}
    </section>
  );
}

function DataTablePanel({
  title,
  subtitle,
  headers,
  rows,
  empty,
}: {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: Array<Array<ReactNode>>;
  empty: string;
}) {
  return (
    <Panel title={title} subtitle={subtitle}>
      <div className="mt-3 overflow-x-auto">
        {rows.length ? (
          <table className="w-full min-w-[430px] text-left">
            <thead>
              <tr className="border-b border-[#edf2f6]">
                {headers.map((header) => (
                  <th
                    key={header}
                    className="px-2 py-2 text-[9px] font-extrabold uppercase tracking-[0.05em] text-[#91a3b3]"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 5).map((row, index) => (
                <tr key={`${title}-${index}`} className="border-b border-[#f1f4f7] last:border-0">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={`${index}-${cellIndex}`}
                      className={`px-2 py-2.5 text-[10px] ${cellIndex === 0 ? "font-extrabold text-[#304b66]" : "font-semibold text-[#526b84]"}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty
            title={empty}
            description="No se recibieron registros para este alcance."
            icon={Search}
          />
        )}
      </div>
    </Panel>
  );
}

function MiniValue({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-[#edf2f6] bg-[#fbfcfd] p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#2277ee]" aria-hidden="true" />
        <span className={`text-[10px] font-semibold ${muted}`}>{label}</span>
      </div>
      <strong className="mt-2 block text-[16px] font-black text-[#102a43]">{value}</strong>
      <span className={`mt-1 block text-[9px] font-semibold ${muted}`}>{note}</span>
    </div>
  );
}

type OpsQueue = keyof OperationsSnapshot["queues"];
const queueLabels: Record<OpsQueue, string> = {
  quotes: "Cotizaciones",
  opportunities: "Oportunidades",
  orders: "Pedidos",
  followUps: "Seguimientos",
  inventoryAlerts: "Inventario",
};

export function Tanda2Operations({
  snapshot,
  role,
  range,
  selectedQueue,
  actorName,
  filters,
  filterOptions,
}: {
  snapshot: OperationsSnapshot | null;
  role: AppRole;
  range: DashboardRange | "all";
  selectedQueue?: OpsQueue;
  actorName?: string | null;
  filters?: OperationsFilters;
  filterOptions?: {
    locations: Array<{ id: string; label: string }>;
    sellers: Array<{ id: string; label: string }>;
  } | null;
}) {
  const queues = Object.keys(queueLabels) as OpsQueue[];
  const selected =
    selectedQueue && queues.includes(selectedQueue)
      ? selectedQueue
      : (queues.find((queue) => snapshot?.queues[queue]?.length) ?? "quotes");
  const rows = (snapshot?.queues[selected] ?? []) as Array<Record<string, unknown>>;
  const metrics = snapshot?.metrics;
  const activeItems = Object.values(snapshot?.queueTotals ?? {}).reduce(
    (total, count) => total + count,
    0,
  );
  const currentFilters = filters ?? { range: "all" as const, page: 1, pageSize: 25 };
  const operationsFilterOptions = filterOptions ?? { locations: [], sellers: [] };
  const canResolve = can(role, "crm.edit");
  const canReassign = can(role, "operations.assign");
  const unsupportedFilters = [
    currentFilters.locationId && (!selectedQueue || ["quotes", "opportunities", "followUps"].includes(selectedQueue)) ? "Local no está disponible para cotizaciones, oportunidades ni seguimientos." : null,
    currentFilters.sellerId && (!selectedQueue || ["quotes", "inventoryAlerts"].includes(selectedQueue)) ? "Vendedor no está disponible para cotizaciones ni alertas de inventario." : null,
  ].filter((value): value is string => Boolean(value));
  return (
    <div className="space-y-4">
      <T2PageHeader
        icon={Workflow}
        title="Centro operativo"
        description="Supervisa, coordina y resuelve las operaciones diarias de ColdPower."
      >
        <Action href="#operations-filters" icon={Filter}>
          Filtros
        </Action>
      </T2PageHeader>
      <Panel title="Filtros operativos" subtitle="El alcance se conserva en la URL.">
        <form id="operations-filters" method="get" className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <label className="grid gap-1 text-[9px] font-extrabold uppercase tracking-[0.04em] text-[#91a3b3]">
            Módulo
            <select name="queue" defaultValue={selectedQueue ?? ""} className="h-9 rounded-lg border border-[#dce6ee] bg-white px-2 text-[10px] font-bold normal-case text-[#304b66]">
              <option value="">Todos</option>
              {queues.map((queue) => <option key={queue} value={queue}>{queueLabels[queue]}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-[9px] font-extrabold uppercase tracking-[0.04em] text-[#91a3b3]">
            Período
            <select name="range" defaultValue={currentFilters.range} className="h-9 rounded-lg border border-[#dce6ee] bg-white px-2 text-[10px] font-bold normal-case text-[#304b66]">
              <option value="today">Hoy</option>
              <option value="yesterday">Ayer</option>
              <option value="week">Últimos 7 días</option>
              <option value="month">Últimos 30 días</option>
              <option value="all">Todo</option>
              <option value="custom">Personalizado</option>
            </select>
          </label>
          <label className="grid gap-1 text-[9px] font-extrabold uppercase tracking-[0.04em] text-[#91a3b3]">
            Desde
            <input type="date" name="from" defaultValue={currentFilters.from ?? ""} className="h-9 rounded-lg border border-[#dce6ee] bg-white px-2 text-[10px] font-bold normal-case text-[#304b66]" />
          </label>
          <label className="grid gap-1 text-[9px] font-extrabold uppercase tracking-[0.04em] text-[#91a3b3]">
            Hasta
            <input type="date" name="to" defaultValue={currentFilters.to ?? ""} className="h-9 rounded-lg border border-[#dce6ee] bg-white px-2 text-[10px] font-bold normal-case text-[#304b66]" />
          </label>
          <label className="grid gap-1 text-[9px] font-extrabold uppercase tracking-[0.04em] text-[#91a3b3]">
            Local
            <select name="locationId" defaultValue={currentFilters.locationId ?? ""} className="h-9 rounded-lg border border-[#dce6ee] bg-white px-2 text-[10px] font-bold normal-case text-[#304b66]">
              <option value="">Todos</option>
              {operationsFilterOptions.locations.map((location) => <option key={location.id} value={location.id}>{location.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-[9px] font-extrabold uppercase tracking-[0.04em] text-[#91a3b3]">
            Vendedor
            <select name="sellerId" defaultValue={currentFilters.sellerId ?? ""} className="h-9 rounded-lg border border-[#dce6ee] bg-white px-2 text-[10px] font-bold normal-case text-[#304b66]">
              <option value="">Todos</option>
              {operationsFilterOptions.sellers.map((seller) => <option key={seller.id} value={seller.id}>{seller.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-[9px] font-extrabold uppercase tracking-[0.04em] text-[#91a3b3]">
            Estado
            <select name="status" defaultValue={currentFilters.status ?? ""} className="h-9 rounded-lg border border-[#dce6ee] bg-white px-2 text-[10px] font-bold normal-case text-[#304b66]">
              <option value="">Todos</option>
              {[
                ["NEW", "Nuevo"], ["DRAFT", "Borrador"], ["SENT", "Enviada"], ["FOLLOW_UP", "Seguimiento"], ["ACCEPTED", "Aceptada"],
                ["PAYMENT_PENDING", "Pago pendiente"], ["PREPARING", "Preparando"], ["READY", "Listo"], ["IN_TRANSIT", "En tránsito"], ["OVERDUE", "Vencido"], ["NO_STOCK", "Sin stock"], ["CRITICAL", "Crítico"],
              ].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-[9px] font-extrabold uppercase tracking-[0.04em] text-[#91a3b3]">
            Equipo
            <select name="team" defaultValue={currentFilters.team ?? ""} className="h-9 rounded-lg border border-[#dce6ee] bg-white px-2 text-[10px] font-bold normal-case text-[#304b66]">
              <option value="">Todos</option>
              <option value="VENTAS">Ventas</option>
              <option value="OPERACIONES">Operaciones</option>
              <option value="ALMACEN">Almacén</option>
            </select>
          </label>
          <label className="grid gap-1 text-[9px] font-extrabold uppercase tracking-[0.04em] text-[#91a3b3]">
            Responsable
            <select name="assigneeId" defaultValue={currentFilters.assigneeId ?? ""} className="h-9 rounded-lg border border-[#dce6ee] bg-white px-2 text-[10px] font-bold normal-case text-[#304b66]">
              <option value="">Todos</option>
              {operationsFilterOptions.sellers.map((seller) => <option key={seller.id} value={seller.id}>{seller.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-[9px] font-extrabold uppercase tracking-[0.04em] text-[#91a3b3]">
            Urgencia
            <select name="urgency" defaultValue={currentFilters.urgency ?? ""} className="h-9 rounded-lg border border-[#dce6ee] bg-white px-2 text-[10px] font-bold normal-case text-[#304b66]">
              <option value="">Todas</option>
              <option value="LOW">Baja</option>
              <option value="NORMAL">Normal</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
              <option value="CRITICAL">Crítica</option>
            </select>
          </label>
          <label className="grid gap-1 text-[9px] font-extrabold uppercase tracking-[0.04em] text-[#91a3b3]">
            SLA
            <select name="sla" defaultValue={currentFilters.sla ?? ""} className="h-9 rounded-lg border border-[#dce6ee] bg-white px-2 text-[10px] font-bold normal-case text-[#304b66]">
              <option value="">Todos</option>
              <option value="NO_POLICY">Sin política</option>
              <option value="ON_TRACK">En tiempo</option>
              <option value="DUE_SOON">Por vencer</option>
              <option value="OVERDUE">Vencido</option>
            </select>
          </label>
          <div className="flex items-end text-[9px] font-semibold leading-4 text-[#91a3b3] xl:col-span-2">
            Los filtros se aplican por dominio de origen; las combinaciones incompatibles explican su alcance.
          </div>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4 xl:col-span-8">
            <button type="submit" className="rounded-full bg-[#2277ee] px-4 py-2 text-[10px] font-extrabold text-white">Aplicar filtros</button>
            <Link href="/admin/operaciones" className="rounded-full border border-[#dce6ee] px-4 py-2 text-[10px] font-extrabold text-[#526b84]">Limpiar</Link>
          </div>
        </form>
      </Panel>
      {unsupportedFilters.length ? (
        <div className="rounded-xl border border-[#f5d8b1] bg-[#fff8ed] px-4 py-3 text-[10px] font-semibold leading-5 text-[#8a5b20]" role="status">
          <strong>Alcance parcial:</strong> {unsupportedFilters.join(" ")} Las colas no compatibles se muestran como no aplicables, no como ausencia de datos.
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Tareas activas" value={number(activeItems)} icon={Workflow} color="blue" />
        <Metric
          label="Vencidas"
          value={number(metrics?.overdueTasks)}
          icon={AlertCircle}
          color="red"
        />
        <Metric
          label="Cotizaciones por atender"
          value={number(metrics?.openQuotes)}
          icon={FileText}
          color="orange"
        />
        <Metric
          label="Pedidos bloqueados"
          value={number(snapshot?.operationalSignals.blockedOrders)}
          note="Incidencias abiertas bloqueantes"
          icon={ShoppingCart}
          color="red"
        />
        <Metric
          label="Transferencias pendientes"
          value={number(snapshot?.operationalSignals.pendingTransfers)}
          note="Solicitadas o en tránsito"
          icon={RefreshCw}
          color="purple"
        />
        <Metric
          label="Seguimientos críticos"
          value={number(metrics?.overdueTasks)}
          icon={Target}
          color="orange"
        />
      </div>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_315px]">
        <Panel
          title="Cola de trabajo prioritaria"
          subtitle={`${actorName ? `${actorName} · ` : ""}datos reales, filtros server-side`}
          action={
            <Action href="/api/admin/operaciones/export" icon={Download} download>
              Exportar
            </Action>
          }
        >
          <div className="mt-3 flex min-w-max gap-1 border-b border-[#edf2f6]">
            {queues.map((queue) => (
              <Link
                key={queue}
                href={`/admin/operaciones?queue=${queue}&range=${range}`}
                className={`inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-[10px] font-extrabold ${queue === selected ? "border-[#2277ee] text-[#2277ee]" : "border-transparent text-[#71869c]"}`}
              >
                {queueLabels[queue]}
                <span className="rounded-full bg-[#edf2f6] px-1.5 py-0.5 text-[9px]">
                  {snapshot?.queueTotals[queue] ?? 0}
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-3 overflow-x-auto">
            {rows.length ? (
              <table className="w-full min-w-[1000px] text-left">
                <thead>
                  <tr className="border-b border-[#edf2f6]">
                    {[
                      "Referencia",
                      "Tarea / contexto",
                      "Urgencia",
                      "SLA / edad",
                      "Vendedor / origen",
                      "Equipo",
                      "Operador",
                      "Próxima acción",
                    ].map((header) => (
                      <th
                        key={header}
                        className="px-2 py-2 text-[9px] font-extrabold uppercase tracking-[0.04em] text-[#91a3b3]"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((row, index) => {
                    const actions = Array.isArray(row.actions)
                      ? (row.actions as Array<{ label?: string; href?: string }>)
                      : [];
                    const href = actions.find((item) => item.href)?.href ?? "#";
                    const actionLabel = actions.find((item) => item.label)?.label ?? "Abrir";
                    return (
                      <tr
                        key={String(row.id ?? index)}
                        className="border-b border-[#f1f4f7] last:border-0"
                      >
                        <td className="px-2 py-3 text-[10px] font-extrabold text-[#2277ee]">
                          {String(row.code ?? row.sku ?? row.id ?? "N/D")}
                        </td>
                        <td className="px-2 py-3">
                          <span className="block max-w-[210px] truncate text-[10px] font-extrabold text-[#304b66]">
                            {String(row.title ?? row.product ?? row.customer ?? "Tarea operativa")}
                          </span>
                          <span
                            className={`mt-1 block max-w-[230px] truncate text-[9px] font-semibold ${muted}`}
                          >
                            {String(row.customer ?? row.location ?? row.seller ?? "N/D")}
                          </span>
                        </td>
                        <td className="px-2 py-3">
                          <Pill>{String(row.priority ?? "NORMAL")}</Pill>
                        </td>
                        <td className="px-2 py-3 text-[10px] font-semibold text-[#526b84]">
                          {row.ageDays != null
                            ? `${String(row.ageDays)} d · edad`
                            : row.due
                              ? String(row.due)
                              : "N/D · sin política SLA"}
                        </td>
                        <td className="px-2 py-3 text-[10px] font-semibold text-[#526b84]">
                          {String(row.seller ?? "Sin asignar")}
                        </td>
                        <td className="px-2 py-3 text-[10px] font-semibold uppercase text-[#526b84]">
                          {String(row.workItemTeam ?? "N/D")}
                        </td>
                        <td className="px-2 py-3 text-[10px] font-semibold text-[#526b84]">
                          {row.workItemAssigneeId ? "Asignada" : "Sin asignar"}
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <a
                              href={href}
                              className="inline-flex items-center gap-1 rounded-md border border-[#dce6ee] px-2 py-1.5 text-[9px] font-extrabold text-[#304b66] hover:border-[#2277ee] hover:text-[#2277ee]"
                            >
                              {actionLabel}
                              <ChevronRight className="h-3 w-3" />
                            </a>
                            {typeof row.workItemId === "string" ? (
                              <OperationsWorkItemAction
                                workItemId={row.workItemId}
                                assigneeId={typeof row.workItemAssigneeId === "string" ? row.workItemAssigneeId : null}
                                assignees={operationsFilterOptions.sellers}
                                taken={Boolean(row.workItemAssigneeId)}
                                resolvable={selected === "followUps" && canResolve}
                                reassignable={canReassign}
                              />
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <Empty
                title="No hay tareas para este alcance"
                description="Ajusta los filtros o espera una nueva actividad persistida."
                icon={CheckCircle2}
              />
            )}
          </div>
          <div
            className={`mt-3 flex items-center justify-between border-t border-[#edf2f6] pt-3 text-[10px] font-semibold ${muted}`}
          >
            <span>Mostrando {rows.slice(0, 10).length} registros</span>
            <span>
              Página {snapshot?.page ?? 1} de {snapshot?.totalPages ?? 1}
            </span>
          </div>
        </Panel>
        <div className="grid content-start gap-3">
          <Panel
            title="Alertas operativas"
            action={
              <Link href="/admin/operaciones" className="text-[10px] font-extrabold text-[#2277ee]">
                Ver todas
              </Link>
            }
          >
            <div className="mt-3 divide-y divide-[#edf2f6]">
              {[
                ["Vencidas", metrics?.overdueTasks, "text-[#ed4b4b]"],
                ["Pedidos bloqueados", snapshot?.operationalSignals.blockedOrders, "text-[#ed4b4b]"],
                ["Stock crítico", metrics?.criticalStock, "text-[#f08b20]"],
                ["Seguimientos", metrics?.overdueTasks, "text-[#8057e8]"],
              ].map(([label, value, ink]) => (
                <Link
                  href={`/admin/operaciones?queue=${label === "Stock crítico" ? "inventoryAlerts" : label === "Seguimientos" ? "followUps" : "orders"}`}
                  key={String(label)}
                  className="flex items-center gap-2.5 py-3 first:pt-0 last:pb-0"
                >
                  <AlertCircle className={`h-4 w-4 ${ink}`} aria-hidden="true" />
                  <span className="flex-1 text-[10px] font-extrabold text-[#304b66]">{label}</span>
                  <strong className="text-[14px] font-black text-[#102a43]">
                    {value === null ? "N/D" : number(Number(value))}
                  </strong>
                  <ChevronRight className="h-3.5 w-3.5 text-[#a5b6c5]" />
                </Link>
              ))}
            </div>
          </Panel>
          <Panel title="Carga por equipo" subtitle="Conteos operativos, no calificación">
            {snapshot?.teamLoad?.length ? (
              <div className="mt-3 divide-y divide-[#edf2f6]">
                {snapshot.teamLoad.map((item) => (
                  <div
                    key={`${item.team}-${item.assigneeId ?? "unassigned"}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-2 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <span className="block truncate text-[10px] font-extrabold text-[#304b66]">
                        {item.assigneeName}
                      </span>
                      <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.04em] text-[#91a3b3]">
                        {item.team}
                      </span>
                    </div>
                    <div className="text-right">
                      <strong className="block text-[13px] font-black text-[#102a43]">
                        {number(item.active)}
                      </strong>
                      <span className="text-[8px] font-bold text-[#91a3b3]">activas</span>
                    </div>
                    <div className="text-right">
                      <strong className="block text-[13px] font-black text-[#ed4b4b]">
                        {number(item.overdue)}
                      </strong>
                      <span className="text-[8px] font-bold text-[#91a3b3]">vencidas</span>
                    </div>
                    <div className="text-right">
                      <strong className="block text-[13px] font-black text-[#f08b20]">
                        {number(item.blockers)}
                      </strong>
                      <span className="text-[8px] font-bold text-[#91a3b3]">bloqueos</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                title="Sin carga activa"
                description="No hay tareas PENDING o IN_PROGRESS persistidas para distribuir."
                icon={UsersRound}
              />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

export function Tanda2Reports({
  data,
  metrics,
  controls,
  exportHref,
  error,
  schedules,
  reportFilters,
  currentUserId,
}: {
  data: DashboardData | null;
  metrics: Array<{
    label: string;
    value: string | number;
    note?: string;
    tone?: keyof typeof tone;
  }>;
  controls?: ReactNode;
  exportHref?: string;
  error?: string;
  schedules: Array<{
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
  }>;
  reportFilters: DashboardFilters;
  currentUserId: string;
}) {
  const currency = data?.currency;
  return (
    <div className="space-y-4">
      <T2PageHeader
        icon={BarChart3}
        title="Reportes"
        description="Analiza el desempeño comercial y operativo."
      >
        <Action href="#report-filters" icon={CalendarDays}>
          Período
        </Action>
        <Action href="#report-filters" icon={Filter}>
          Filtros
        </Action>
        <Action href={exportHref} icon={Download} download>
          Exportar
        </Action>
      </T2PageHeader>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {metrics.map((item) => (
          <Metric
            key={item.label}
            label={item.label}
            value={item.value}
            note={item.note}
            icon={
              item.label.toLowerCase().includes("margen")
                ? BarChart3
                : item.label.toLowerCase().includes("inventario")
                  ? Package
                  : item.label.toLowerCase().includes("cliente")
                    ? UsersRound
                    : CircleDollarSign
            }
            color={item.tone ?? "blue"}
            sparkline={data?.salesSeries.map((row) => row.total)}
          />
        ))}
      </div>
      {controls ? (
        <div id="report-filters">
          <Panel title="Filtros del reporte" subtitle="El alcance se conserva en la URL.">
            <div className="mt-3">{controls}</div>
          </Panel>
        </div>
      ) : null}
      {error ? (
        <Panel title="Reporte no disponible">
          <Empty title="No se pudo cargar este reporte" description={error} icon={AlertCircle} />
        </Panel>
      ) : (
        <>
          <ReportScheduleControls
            schedules={schedules}
            filters={reportFilters}
            currentUserId={currentUserId}
          />
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Panel
              title="Ventas y margen bruto"
              subtitle={currency ? `Montos en ${currency}` : "Moneda no disponible"}
            >
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
                <Empty
                  title="Sin datos de ventas"
                  description="No hay ventas confirmadas en el periodo."
                  icon={BarChart3}
                />
              )}
            </Panel>
            <Panel title="Ventas por familia de productos" subtitle="Comparación del periodo">
              <DataTablePanel
                title=""
                headers={["Categoría", "Revenue", "Unidades"]}
                rows={(data?.categorySummary ?? [])
                  .slice(0, 6)
                  .map((row) => [
                    row.categoryName,
                    money(row.revenue, currency),
                    number(row.units),
                  ])}
                empty="Sin categorías"
              />
            </Panel>
          </div>
          <div className="grid gap-3 xl:grid-cols-3">
            <DataTablePanel
              title="Detalle de ventas"
              subtitle="Transacciones y variación por periodo"
              headers={["Periodo", "Ventas netas", "Margen bruto", "Pedidos"]}
              rows={(data?.salesSeries ?? [])
                .slice(0, 8)
                .map((row) => [
                  dateLabel(row.date),
                  money(row.total, currency),
                  data?.grossProfit === null ? "N/D" : money(data?.grossProfit, currency),
                  number(row.orders ?? 0),
                ])}
              empty="Sin ventas"
            />
            <DataTablePanel
              title="Productos más vendidos"
              headers={["Producto", "Unidades", "Revenue"]}
              rows={(data?.topProducts ?? []).map((row) => [
                row.name,
                number(row.units),
                money(row.revenue, currency),
              ])}
              empty="Sin productos"
            />
            <Panel title="Insights y recomendaciones" subtitle="Determinísticos, basados en datos">
              <Empty
                title="Sin recomendaciones"
                description="No se generan insights cuando el alcance no tiene evidencia suficiente."
                icon={Info}
              />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

export function Tanda2Purchases({
  suppliers,
  locations,
  purchases,
  metrics,
  requests = [],
  requestMetrics,
  selectedRequest,
  selectedPurchase,
  filters,
  pagination,
  queryString,
  controls,
}: {
  suppliers: Array<{ id: string; name: string; currency: string; status: string }>;
  locations: Array<{ id: string; name: string }>;
  purchases: Array<{
    id: string;
    code: string;
    supplierId: string;
    locationId: string;
    status: string;
    currency: string;
    subtotal: string;
    createdAt: Date | string;
    issuedAt: Date | string | null;
    expectedDeliveryAt: Date | string | null;
  }>;
  metrics?: {
    total: number;
    pending: number;
    partialReceived: number;
    received: number;
    cancelled: number;
    totalAmount: number;
    amountsByCurrency?: Array<{ currency: string; amount: number }>;
    leadTimeDays?: number | null;
    incidents?: number;
  };
  requests?: Array<{
    id: string;
    code: string;
    status: string;
    source: string;
    itemCount: number;
    locationId: string;
  }>;
  requestMetrics?: {
    pending: number;
    draft: number;
    approved: number;
    rejected: number;
    converted: number;
  };
  selectedRequest?: {
    request: {
      id: string;
      code: string;
      status: string;
      source: string;
      locationId: string | null;
      notes: string | null;
      rejectionReason: string | null;
      createdAt: Date | string;
    };
    items: Array<{
      id: string;
      productId: string;
      skuSnapshot: string;
      productNameSnapshot: string;
      quantityRequested: number;
      notes: string | null;
    }>;
  } | null;
  selectedPurchase?: {
    purchase: {
      id: string;
      code: string;
      status: string;
      currency: string;
      subtotal: string;
      createdAt: Date | string;
      issuedAt: Date | string | null;
      expectedDeliveryAt: Date | string | null;
      cancellationReason: string | null;
      notes: string | null;
    };
    supplierName: string;
    locationName: string;
    items: Array<{
      id: string;
      skuSnapshot: string;
      productNameSnapshot: string;
      quantityOrdered: number;
      quantityReceived: number;
      unitCost: string;
      currency: string;
    }>;
    receipts: Array<{ id: string; code: string; receivedAt: Date | string; status: string }>;
  } | null;
  filters?: {
    query?: string;
    status?: string;
    supplierId?: string;
    locationId?: string;
    currency?: string;
    createdFrom?: string;
    createdTo?: string;
    expectedFrom?: string;
    expectedTo?: string;
    attention?: string;
  };
  pagination?: { page: number; totalPages: number; totalItems: number };
  queryString?: string;
  controls?: ReactNode;
}) {
  const supplierById = new Map(suppliers.map((supplier) => [supplier.id, supplier.name]));
  const supplierStatusById = new Map(suppliers.map((supplier) => [supplier.id, supplier.status]));
  const locationById = new Map(locations.map((location) => [location.id, location.name]));
  const now = new Date();
  const attentionFor = (purchase: (typeof purchases)[number]) => {
    if (supplierStatusById.get(purchase.supplierId) === "INACTIVE") return "Incidencia";
    if (purchase.status === "PARTIAL_RECEIVED") return "Parcial";
    if (
      purchase.expectedDeliveryAt &&
      new Date(purchase.expectedDeliveryAt) < now &&
      ["DRAFT", "PENDING", "PARTIAL_RECEIVED"].includes(purchase.status)
    )
      return "Retrasada";
    return "Normal";
  };
  const openPurchases = metrics
    ? Math.max(0, metrics.total - metrics.received - metrics.cancelled)
    : purchases.filter((purchase) =>
        ["DRAFT", "PENDING", "PARTIAL_RECEIVED"].includes(purchase.status),
      ).length;
  const amountLabel = metrics?.amountsByCurrency?.length
    ? metrics.amountsByCurrency.map((row) => money(row.amount, row.currency)).join(" · ")
    : metrics
      ? money(metrics.totalAmount, purchases[0]?.currency ?? null)
      : "N/D";
  return (
    <div className="space-y-4">
      <T2PageHeader
        icon={ShoppingCart}
        title="Compras y proveedores"
        description="Gestiona abastecimiento, proveedores, órdenes y recepciones."
      >
        <Action href="#purchase-tools" icon={ClipboardList}>
          Nueva solicitud
        </Action>
        <Action href="#purchase-tools" icon={UsersRound}>
          Nuevo proveedor
        </Action>
        <Action href="#purchase-tools" icon={FileText}>
          Crear OC
        </Action>
        <Action href="#purchase-tools" primary icon={PackageCheck}>
          Registrar recepción
        </Action>
      </T2PageHeader>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="OC abiertas" value={number(openPurchases)} icon={FileText} color="blue" />
        <Metric
          label="Solicitudes pendientes"
          value={number(requestMetrics?.pending)}
          icon={ClipboardList}
          color="orange"
        />
        <Metric
          label="Recepciones pendientes"
          value={number((metrics?.pending ?? 0) + (metrics?.partialReceived ?? 0))}
          icon={PackageCheck}
          color="orange"
        />
        <Metric label="Monto comprado" value={amountLabel} icon={CircleDollarSign} color="green" />
        <Metric
          label="Lead time promedio"
          value={metrics?.leadTimeDays == null ? "N/D" : `${metrics.leadTimeDays} d`}
          note={
            metrics?.leadTimeDays == null
              ? "Sin OC emitida y recibida con fechas"
              : "Emisión a recepción final"
          }
          icon={Clock3}
          color="purple"
        />
        <Metric
          label="Proveedores con incidencias"
          value={number(metrics?.incidents)}
          note="OC abiertas con proveedor inactivo"
          icon={AlertCircle}
          color="red"
        />
      </div>
      <Panel
        title="Filtros de compras"
        subtitle="Búsqueda server-side por OC, proveedor y producto"
      >
        <form method="get" className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <input
            name="query"
            defaultValue={filters?.query ?? ""}
            placeholder="Buscar OC, proveedor o SKU"
            className="h-9 rounded-lg border border-[#dce6ee] px-3 text-[10px] sm:col-span-2"
          />
          <select
            name="status"
            defaultValue={filters?.status ?? ""}
            className="h-9 rounded-lg border border-[#dce6ee] px-2 text-[10px]"
          >
            <option value="">Todos los estados</option>
            <option value="DRAFT">Borrador</option>
            <option value="PENDING">Pendiente</option>
            <option value="PARTIAL_RECEIVED">Parcial</option>
            <option value="RECEIVED">Recibida</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
          <select
            name="supplierId"
            defaultValue={filters?.supplierId ?? ""}
            className="h-9 rounded-lg border border-[#dce6ee] px-2 text-[10px]"
          >
            <option value="">Todos los proveedores</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
          <select
            name="locationId"
            defaultValue={filters?.locationId ?? ""}
            className="h-9 rounded-lg border border-[#dce6ee] px-2 text-[10px]"
          >
            <option value="">Todos los locales</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
          <select
            name="currency"
            defaultValue={filters?.currency ?? ""}
            className="h-9 rounded-lg border border-[#dce6ee] px-2 text-[10px]"
          >
            <option value="">Todas las monedas</option>
            <option value="PEN">PEN</option>
            <option value="USD">USD</option>
          </select>
          <input
            type="date"
            name="createdFrom"
            defaultValue={filters?.createdFrom ?? ""}
            aria-label="Creada desde"
            className="h-9 rounded-lg border border-[#dce6ee] px-2 text-[10px]"
          />
          <input
            type="date"
            name="createdTo"
            defaultValue={filters?.createdTo ?? ""}
            aria-label="Creada hasta"
            className="h-9 rounded-lg border border-[#dce6ee] px-2 text-[10px]"
          />
          <input
            type="date"
            name="expectedFrom"
            defaultValue={filters?.expectedFrom ?? ""}
            aria-label="Entrega esperada desde"
            className="h-9 rounded-lg border border-[#dce6ee] px-2 text-[10px]"
          />
          <input
            type="date"
            name="expectedTo"
            defaultValue={filters?.expectedTo ?? ""}
            aria-label="Entrega esperada hasta"
            className="h-9 rounded-lg border border-[#dce6ee] px-2 text-[10px]"
          />
          <select
            name="attention"
            defaultValue={filters?.attention ?? ""}
            className="h-9 rounded-lg border border-[#dce6ee] px-2 text-[10px]"
          >
            <option value="">Atención</option>
            <option value="DELAYED">Retrasada</option>
            <option value="PARTIAL">Parcial</option>
            <option value="INCIDENT">Incidencia</option>
            <option value="NORMAL">Normal</option>
          </select>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4 xl:col-span-8">
            <button
              type="submit"
              className="rounded-full bg-[#2277ee] px-4 py-2 text-[10px] font-extrabold text-white"
            >
              Filtrar
            </button>
            <Link
              href="/admin/compras"
              className="rounded-full border border-[#dce6ee] px-4 py-2 text-[10px] font-extrabold text-[#526b84]"
            >
              Limpiar
            </Link>
          </div>
        </form>
      </Panel>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_315px]">
        <Panel
          title="Órdenes de compra"
          subtitle={`${metrics?.total ?? purchases.length} resultados`}
          action={
            <Action href="/api/admin/compras/export" icon={Download} download>
              Exportar
            </Action>
          }
        >
          <div className="mt-3 overflow-x-auto">
            {purchases.length ? (
              <table className="w-full min-w-[1040px] text-left">
                <thead>
                  <tr className="border-b border-[#edf2f6]">
                    {[
                      "OC",
                      "Proveedor",
                      "Local",
                      "Creada",
                      "Esperada",
                      "Estado",
                      "Moneda",
                      "Monto",
                      "Atención",
                      "Acciones",
                    ].map((header) => (
                      <th
                        key={header}
                        className="px-2 py-2 text-[9px] font-extrabold uppercase text-[#91a3b3]"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr key={purchase.id} className="border-b border-[#f1f4f7] last:border-0">
                      <td className="px-2 py-3 text-[10px] font-extrabold text-[#2277ee]">
                        {purchase.code}
                      </td>
                      <td className="px-2 py-3 text-[10px] font-extrabold text-[#304b66]">
                        {supplierById.get(purchase.supplierId) ?? "N/D"}
                      </td>
                      <td className="px-2 py-3 text-[10px] font-semibold text-[#526b84]">
                        {locationById.get(purchase.locationId) ?? "N/D"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-[10px] font-semibold text-[#526b84]">
                        {dateLabel(purchase.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-[10px] font-semibold text-[#526b84]">
                        {dateLabel(purchase.expectedDeliveryAt)}
                      </td>
                      <td className="px-2 py-3">
                        <Pill>{purchase.status}</Pill>
                      </td>
                      <td className="px-2 py-3 text-[10px] font-semibold text-[#526b84]">
                        {purchase.currency}
                      </td>
                      <td className="px-2 py-3 text-[10px] font-extrabold text-[#304b66]">
                        {money(Number(purchase.subtotal), purchase.currency)}
                      </td>
                      <td className="px-2 py-3 text-[10px] font-semibold text-[#526b84]">
                        {attentionFor(purchase)}
                      </td>
                      <td className="px-2 py-3">
                        <Link
                          href={`/admin/compras?purchaseId=${encodeURIComponent(purchase.id)}`}
                          className="text-[10px] font-extrabold text-[#2277ee]"
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <Empty
                title="No hay órdenes de compra"
                description="Crea una solicitud o una OC desde el flujo operativo."
                icon={FileText}
              />
            )}
          </div>
          {pagination && pagination.totalPages > 1
            ? (() => {
                const previous = new URLSearchParams(queryString ?? "");
                previous.set("page", String(Math.max(1, pagination.page - 1)));
                const next = new URLSearchParams(queryString ?? "");
                next.set("page", String(Math.min(pagination.totalPages, pagination.page + 1)));
                return (
                  <div className="mt-3 flex items-center justify-between border-t border-[#edf2f6] pt-3 text-[10px] font-semibold text-[#71869c]">
                    <span>
                      {pagination.totalItems} órdenes · página {pagination.page} de{" "}
                      {pagination.totalPages}
                    </span>
                    <span className="flex gap-2">
                      <Link
                        className={
                          pagination.page <= 1
                            ? "pointer-events-none opacity-40"
                            : "font-extrabold text-[#2277ee]"
                        }
                        href={`/admin/compras?${previous.toString()}`}
                      >
                        Anterior
                      </Link>
                      <Link
                        className={
                          pagination.page >= pagination.totalPages
                            ? "pointer-events-none opacity-40"
                            : "font-extrabold text-[#2277ee]"
                        }
                        href={`/admin/compras?${next.toString()}`}
                      >
                        Siguiente
                      </Link>
                    </span>
                  </div>
                );
              })()
            : null}
        </Panel>
        <div className="grid content-start gap-3">
          <Panel
            title="Solicitudes de compra"
            action={
              <Link
                href="/admin/compras?requestStatus=SUBMITTED"
                className="text-[10px] font-extrabold text-[#2277ee]"
              >
                Ver pendientes
              </Link>
            }
          >
            <div className="mt-3 space-y-2">
              {requests.length ? (
                requests.slice(0, 6).map((request) => (
                  <Link
                    href={`/admin/compras?requestId=${encodeURIComponent(request.id)}`}
                    key={request.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[#edf2f6] px-3 py-2.5 hover:border-[#2277ee]"
                  >
                    <span className="min-w-0">
                      <strong className="block truncate text-[10px] text-[#304b66]">
                        {request.code}
                      </strong>
                      <small className="mt-1 block text-[9px] font-semibold text-[#8195aa]">
                        {locationById.get(request.locationId) ?? "N/D"} · {request.itemCount} líneas
                      </small>
                    </span>
                    <Pill>{request.status}</Pill>
                  </Link>
                ))
              ) : (
                <Empty
                  title="No hay solicitudes"
                  description="Las solicitudes creadas aparecerán aquí con su estado."
                  icon={ClipboardList}
                />
              )}
            </div>
          </Panel>
          {selectedRequest ? (
            <Panel
              title={`Solicitud ${selectedRequest.request.code}`}
              subtitle={`${selectedRequest.request.source} · ${selectedRequest.request.status}`}
            >
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-[#71869c]">
                  <Pill>{selectedRequest.request.status}</Pill>
                  <span>{locationById.get(selectedRequest.request.locationId ?? "") ?? "N/D"}</span>
                  <span>{dateLabel(selectedRequest.request.createdAt)}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[360px] text-left">
                    <thead>
                      <tr className="border-b border-[#edf2f6]">
                        {["SKU", "Producto", "Cantidad"].map((header) => (
                          <th
                            key={header}
                            className="px-2 py-2 text-[9px] font-extrabold uppercase text-[#91a3b3]"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRequest.items.map((item) => (
                        <tr key={item.id} className="border-b border-[#f1f4f7] last:border-0">
                          <td className="px-2 py-2 text-[10px] font-mono text-[#526b84]">
                            {item.skuSnapshot}
                          </td>
                          <td className="px-2 py-2 text-[10px] font-extrabold text-[#304b66]">
                            {item.productNameSnapshot}
                          </td>
                          <td className="px-2 py-2 text-[10px] font-semibold text-[#526b84]">
                            {number(item.quantityRequested)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {selectedRequest.request.notes ? (
                  <p className="text-[10px] font-semibold leading-5 text-[#71869c]">
                    {selectedRequest.request.notes}
                  </p>
                ) : null}
                {selectedRequest.request.rejectionReason ? (
                  <p className="rounded-lg border border-[#f1c5c5] bg-[#fff7f7] px-3 py-2 text-[10px] font-semibold text-[#c43333]">
                    Motivo de rechazo: {selectedRequest.request.rejectionReason}
                  </p>
                ) : null}
                <PurchaseRequestActions
                  requestId={selectedRequest.request.id}
                  status={selectedRequest.request.status}
                  locationId={selectedRequest.request.locationId}
                  items={selectedRequest.items.map((item) => ({
                    productId: item.productId,
                    quantityRequested: item.quantityRequested,
                  }))}
                  suppliers={suppliers}
                />
              </div>
            </Panel>
          ) : null}
          {selectedPurchase ? (
            <Panel
              title={`Orden ${selectedPurchase.purchase.code}`}
              subtitle={`${selectedPurchase.supplierName} · ${selectedPurchase.purchase.status}`}
            >
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-[#71869c]">
                  <Pill>{selectedPurchase.purchase.status}</Pill>
                  <span>{selectedPurchase.locationName}</span>
                  <span>{dateLabel(selectedPurchase.purchase.issuedAt)}</span>
                  <span>Entrega: {dateLabel(selectedPurchase.purchase.expectedDeliveryAt)}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left">
                    <thead>
                      <tr className="border-b border-[#edf2f6]">
                        {["SKU", "Producto", "Pedido", "Recibido", "Pendiente"].map((header) => (
                          <th
                            key={header}
                            className="px-2 py-2 text-[9px] font-extrabold uppercase text-[#91a3b3]"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPurchase.items.map((item) => (
                        <tr key={item.id} className="border-b border-[#f1f4f7] last:border-0">
                          <td className="px-2 py-2 font-mono text-[10px] text-[#526b84]">
                            {item.skuSnapshot}
                          </td>
                          <td className="px-2 py-2 text-[10px] font-extrabold text-[#304b66]">
                            {item.productNameSnapshot}
                          </td>
                          <td className="px-2 py-2 text-[10px] font-semibold text-[#526b84]">
                            {number(item.quantityOrdered)}
                          </td>
                          <td className="px-2 py-2 text-[10px] font-semibold text-[#526b84]">
                            {number(item.quantityReceived)}
                          </td>
                          <td className="px-2 py-2 text-[10px] font-extrabold text-[#304b66]">
                            {number(Math.max(0, item.quantityOrdered - item.quantityReceived))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {selectedPurchase.purchase.notes ? (
                  <p className="text-[10px] font-semibold leading-5 text-[#71869c]">
                    {selectedPurchase.purchase.notes}
                  </p>
                ) : null}
                {selectedPurchase.purchase.cancellationReason ? (
                  <p className="rounded-lg border border-[#f1c5c5] bg-[#fff7f7] px-3 py-2 text-[10px] font-semibold text-[#c43333]">
                    Motivo de cancelación: {selectedPurchase.purchase.cancellationReason}
                  </p>
                ) : null}
                {selectedPurchase.receipts.length ? (
                  <p className="text-[10px] font-semibold text-[#71869c]">
                    Recepciones:{" "}
                    {selectedPurchase.receipts.map((receipt) => receipt.code).join(" · ")}
                  </p>
                ) : null}
                <PurchaseActions
                  purchaseId={selectedPurchase.purchase.id}
                  status={selectedPurchase.purchase.status}
                />
              </div>
            </Panel>
          ) : null}
          <Panel title="Proveedores" subtitle="Estado y moneda de compra">
            <div className="mt-3 space-y-2">
              {suppliers.slice(0, 6).map((supplier) => (
                <Link
                  key={supplier.id}
                  href={`/admin/compras/proveedores/${encodeURIComponent(supplier.id)}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[#edf2f6] px-3 py-2.5 hover:border-[#2277ee]"
                >
                  <span className="min-w-0">
                    <strong className="block truncate text-[10px] text-[#304b66]">
                      {supplier.name}
                    </strong>
                    <small className="mt-1 block text-[9px] font-semibold text-[#8195aa]">
                      {supplier.currency}
                    </small>
                  </span>
                  <Pill>{supplier.status}</Pill>
                </Link>
              ))}
              {!suppliers.length ? (
                <Empty
                  title="No hay proveedores"
                  description="Registra un proveedor desde el flujo de compras."
                  icon={UsersRound}
                />
              ) : null}
            </div>
          </Panel>
          <Panel title="Alertas de compras">
            <Empty
              title="Sin alertas calculadas"
              description="Las alertas de retraso requieren fecha esperada de entrega y saldo pendiente."
              icon={AlertCircle}
            />
          </Panel>
        </div>
      </div>
      {controls ? (
        <div id="purchase-tools">
          <Panel title="Flujo de compras">
            <details open>
              <summary className="cursor-pointer text-[11px] font-extrabold text-[#2277ee]">
                Abrir controles reales
              </summary>
              <div className="mt-4">{controls}</div>
            </details>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}

export function Tanda2Cms({
  controls,
  assetsCount,
  pages = [],
}: {
  controls?: ReactNode;
  assetsCount?: number;
  pages?: Array<{
    id: string;
    title: string;
    slug: string;
    contentType?: string;
    status: string;
    scheduledAt?: Date | string | null;
    version: number;
    updatedAt: Date | string;
  }>;
}) {
  const published = pages.filter((page) => page.status === "PUBLISHED").length;
  const drafts = pages.filter((page) => page.status === "DRAFT").length;
  const scheduledPages = pages.filter((page) => page.status === "SCHEDULED");
  return (
    <div className="space-y-4">
      <T2PageHeader
        icon={ImageIcon}
        title="Gestor de contenidos"
        description="Administra contenido y multimedia del sitio público."
      >
        <Action href="#cms-tools" icon={ImageIcon}>
          Vista previa
        </Action>
        <Action href="#cms-tools" icon={FileText}>
          Nueva página
        </Action>
        <Action href="#cms-tools" primary icon={ArrowUpRight}>
          Publicar
        </Action>
      </T2PageHeader>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Publicados" value={number(published)} icon={CheckCircle2} color="green" />
        <Metric label="Borradores" value={number(drafts)} icon={FileText} color="orange" />
        <Metric
          label="Programados"
          value={number(scheduledPages.length)}
          note={scheduledPages.length ? "Pendientes de publicación" : "Sin agenda persistida"}
          icon={Clock3}
          color="purple"
        />
        <Metric label="Assets" value={assetsCount ?? "N/D"} icon={ImageIcon} color="blue" />
        <Metric
          label="Cambios recientes"
          value={number(pages.length)}
          note="Páginas registradas"
          icon={RefreshCw}
          color="green"
        />
        <Metric
          label="Referencias rotas"
          value="N/D"
          note="No se inventan métricas"
          icon={AlertCircle}
          color="red"
        />
      </div>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.9fr)_315px]">
        <Panel title="Contenido del sitio" subtitle="Páginas y bloques persistidos">
          <div className="mt-3 overflow-x-auto">
            {pages.length ? (
              <table className="w-full min-w-[520px] text-left">
                <thead>
                  <tr className="border-b border-[#edf2f6]">
                    {["Página", "Tipo", "Slug", "Estado", "Versión", "Actualizado"].map(
                      (header) => (
                        <th
                          key={header}
                          className="px-2 py-2 text-[9px] font-extrabold uppercase text-[#91a3b3]"
                        >
                          {header}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {pages.slice(0, 10).map((page) => (
                    <tr key={page.id} className="border-b border-[#f1f4f7] last:border-0">
                      <td className="px-2 py-3 text-[10px] font-extrabold text-[#304b66]">
                        {page.title}
                      </td>
                      <td className="px-2 py-3 text-[10px] font-semibold text-[#526b84]">
                        {page.contentType ?? "N/D"}
                      </td>
                      <td className="px-2 py-3 text-[10px] font-mono text-[#526b84]">
                        /{page.slug}
                      </td>
                      <td className="px-2 py-3">
                        <Pill>{page.status}</Pill>
                      </td>
                      <td className="px-2 py-3 text-[10px] font-semibold text-[#526b84]">
                        v{page.version}
                      </td>
                      <td className="px-2 py-3 text-[10px] font-semibold text-[#526b84]">
                        {dateLabel(page.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <Empty
                title="No hay páginas CMS"
                description="Crea la primera página desde el editor para verla aquí."
                icon={FileText}
              />
            )}
          </div>
        </Panel>
        <Panel title="Vista previa" subtitle="Renderer real, sin borradores públicos">
          <Empty
            title="Selecciona una página para previsualizar"
            description="La vista previa segura está disponible desde el editor editorial."
            icon={ImageIcon}
          />
        </Panel>
        <div className="grid content-start gap-3">
          <Panel title="Calendario de publicaciones">
            {scheduledPages.length ? (
              <div className="space-y-2">
                {scheduledPages.slice(0, 5).map((page) => (
                  <Link
                    href={`/api/admin/cms/${page.slug}`}
                    key={page.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[#edf2f6] px-3 py-2.5 hover:border-[#2277ee]"
                  >
                    <span className="truncate text-[10px] font-extrabold text-[#304b66]">
                      {page.title}
                    </span>
                    <span className="shrink-0 text-[9px] font-semibold text-[#8195aa]">
                      {dateLabel(page.scheduledAt)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty
                title="Sin publicaciones programadas"
                description="No hay agenda persistida para este alcance."
                icon={CalendarDays}
              />
            )}
          </Panel>
          <Panel title="Biblioteca de recursos">
            <p className={`text-[10px] font-semibold ${muted}`}>
              {assetsCount ?? 0} assets activos registrados.
            </p>
          </Panel>
        </div>
      </div>
      {controls ? (
        <div id="cms-tools">
          <Panel title="Editor y biblioteca multimedia">
            <details open>
              <summary className="cursor-pointer text-[11px] font-extrabold text-[#2277ee]">
                Abrir herramientas editoriales
              </summary>
              <div className="mt-4">{controls}</div>
            </details>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}

const permissionMatrixRoles: Array<{ role: AppRole; label: string }> = [
  { role: "SUPERADMIN", label: "Superadmin" },
  { role: "GERENCIA", label: "Gerencia" },
  { role: "OPERACIONES_VENTAS", label: "Operaciones y ventas" },
  { role: "ALMACEN", label: "Almacén" },
  { role: "COMPRAS", label: "Compras" },
  { role: "REPORTES", label: "Reportes" },
];
const permissionMatrixColumns: Array<{ permission: Permission; label: string }> = [
  { permission: "dashboard.view", label: "Dashboard" },
  { permission: "catalog.product.edit", label: "Catálogo" },
  { permission: "inventory.adjust", label: "Inventario" },
  { permission: "reports.view", label: "Reportes" },
  { permission: "users.manage", label: "Usuarios" },
];

function PermissionMatrix() {
  return (
    <Panel title="Matriz de permisos" subtitle="Lectura de permisos efectivos definidos por rol">
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[620px] text-left">
          <thead>
            <tr className="border-b border-[#edf2f6]">
              <th className="px-2 py-2 text-[9px] font-extrabold uppercase text-[#91a3b3]">Rol</th>
              {permissionMatrixColumns.map((column) => (
                <th
                  key={column.permission}
                  className="px-2 py-2 text-[9px] font-extrabold uppercase text-[#91a3b3]"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissionMatrixRoles.map(({ role, label }) => {
              const granted = permissionsForRole(role);
              return (
                <tr key={role} className="border-b border-[#f1f4f7] last:border-0">
                  <td className="px-2 py-3 text-[10px] font-extrabold text-[#304b66]">{label}</td>
                  {permissionMatrixColumns.map((column) => (
                    <td key={column.permission} className="px-2 py-3 text-[10px] font-extrabold">
                      <span
                        className={
                          granted.includes(column.permission) ? "text-[#159263]" : "text-[#a5b6c5"
                        }
                      >
                        {granted.includes(column.permission) ? "Concedido" : "—"}
                      </span>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function Tanda2Users({
  rows,
  metrics,
  controls,
  pagination,
  exportHref,
  canInvite,
  selectedId,
  detail,
  detailError,
}: {
  rows: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    roleLabel?: string;
    status: string;
    lastAccess: string;
    createdAt: string;
    sync?: string;
  }>;
  metrics?: {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    administrators: number;
    pendingInvitations: number;
  };
  controls?: ReactNode;
  pagination?: { page: number; totalPages: number; totalItems: number };
  exportHref?: string;
  canInvite?: boolean;
  selectedId?: string;
  detail?: {
    user: {
      id: string;
      name: string | null;
      email: string;
      role: string;
      status: string;
      clerkSyncStatus: string;
      clerkSyncError: string | null;
      createdAt: Date;
      updatedAt: Date;
      lastSignInAt: Date | null;
    };
    history: Array<{
      id: string;
      action: string;
      entityType: string;
      entityId: string;
      createdAt: Date;
      actorId: string | null;
    }>;
    lastAccess: Date | null;
    invitation: { status: string; createdAt: Date; updatedAt: Date } | null;
  };
  detailError?: string | null;
}) {
  return (
    <div className="space-y-4">
      <T2PageHeader
        icon={UsersRound}
        title="Usuarios y permisos"
        description="Gestiona accesos del equipo de ColdPower."
      >
        {canInvite ? (
          <Action href="#user-management-controls" icon={UsersRound}>
            Invitar usuario
          </Action>
        ) : null}
        <Action href="#permission-matrix" icon={ShieldCheck}>
          Matriz de permisos
        </Action>
        <Action href={exportHref} icon={Download} download>
          Exportar
        </Action>
      </T2PageHeader>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric
          label="Staff activos"
          value={number(metrics?.active)}
          icon={UsersRound}
          color="blue"
        />
        <Metric
          label="Invitaciones"
          value={number(metrics?.pendingInvitations)}
          icon={FileText}
          color="orange"
        />
        <Metric
          label="Superadmins"
          value={number(metrics?.administrators)}
          icon={ShieldCheck}
          color="purple"
        />
        <Metric
          label="Suspendidos"
          value={number(metrics?.suspended)}
          icon={AlertCircle}
          color="red"
        />
        <Metric
          label="Accesos últimos 7 días"
          value="N/D"
          note="Sin serie de acceso"
          icon={Clock3}
          color="green"
        />
        <Metric
          label="Sync issues"
          value="N/D"
          note="Estado por usuario"
          icon={RefreshCw}
          color="orange"
        />
      </div>
      <Panel title="Equipo interno" subtitle={`${metrics?.total ?? rows.length} usuarios`}>
        <div className="mt-3 overflow-x-auto">
          {rows.length ? (
            <table className="w-full min-w-[850px] text-left">
              <thead>
                <tr className="border-b border-[#edf2f6]">
                  {["Usuario", "Correo", "Rol", "Estado", "Último acceso", "Clerk", "Acciones"].map(
                    (header) => (
                      <th
                        key={header}
                        className="px-2 py-2 text-[9px] font-extrabold uppercase text-[#91a3b3]"
                      >
                        {header}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 12).map((row) => (
                  <tr key={row.id} className={`border-b border-[#f1f4f7] last:border-0 ${selectedId === row.id ? "bg-[#f5faff]" : ""}`}>
                    <td className="px-2 py-3 text-[10px] font-extrabold text-[#304b66]">
                      {row.name}
                    </td>
                    <td className="px-2 py-3 text-[10px] font-semibold text-[#526b84]">
                      {row.email}
                    </td>
                    <td className="px-2 py-3">
                      <Pill>{row.roleLabel ?? row.role}</Pill>
                    </td>
                    <td className="px-2 py-3">
                      <Pill>{row.status}</Pill>
                    </td>
                    <td className="px-2 py-3 text-[10px] font-semibold text-[#526b84]">
                      {row.lastAccess}
                    </td>
                    <td className="px-2 py-3 text-[9px] font-semibold text-[#526b84]">
                      {row.sync ?? "N/D"}
                    </td>
                    <td className="px-2 py-3">
                      <Link
                        href={`/admin/usuarios?userId=${encodeURIComponent(row.id)}`}
                        aria-current={selectedId === row.id ? "page" : undefined}
                        className="text-[10px] font-extrabold text-[#2277ee]"
                      >
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty
              title="No hay usuarios"
              description="No se encontraron usuarios internos para este alcance."
              icon={UsersRound}
            />
          )}
        </div>
        <div className={`mt-3 border-t border-[#edf2f6] pt-3 text-[10px] font-semibold ${muted}`}>
          Página {pagination?.page ?? 1} de {pagination?.totalPages ?? 1}
        </div>
      </Panel>
      {detail ? (
        <Panel
          title={`Detalle de ${detail.user.name || detail.user.email}`}
          subtitle={`${detail.user.email} · ${detail.user.role}`}
          action={<Link href="/admin/usuarios" className="text-[10px] font-extrabold text-[#2277ee]">Cerrar detalle</Link>}
        >
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MiniValue label="Estado" value={detail.user.status} note="Estado local persistido" icon={CheckCircle2} />
            <MiniValue label="Último acceso" value={detail.lastAccess ? detail.lastAccess.toLocaleString("es-PE") : "Nunca registrado"} note="Fuente local" icon={Clock3} />
            <MiniValue label="Clerk" value={detail.user.clerkSyncStatus} note={detail.user.clerkSyncError ?? "Sin error de sincronización"} icon={RefreshCw} />
            <MiniValue label="Alta" value={detail.user.createdAt.toLocaleDateString("es-PE")} note={`Actualizado ${detail.user.updatedAt.toLocaleDateString("es-PE")}`} icon={FileText} />
          </div>
          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            <section className="rounded-lg border border-[#e2eaf1] bg-[#fbfcfd] p-3" aria-labelledby="user-invitation-title">
              <h3 id="user-invitation-title" className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#91a3b3]">Invitación</h3>
              <p className="mt-2 text-[11px] font-bold text-[#304b66]">{detail.invitation ? `${detail.invitation.status} · creada ${detail.invitation.createdAt.toLocaleDateString("es-PE")}` : "No hay invitación pendiente asociada."}</p>
              {detail.invitation ? <p className="mt-1 text-[10px] font-semibold text-[#71869c]">Actualizada {detail.invitation.updatedAt.toLocaleDateString("es-PE")}</p> : null}
            </section>
            <section className="rounded-lg border border-[#e2eaf1] bg-[#fbfcfd] p-3" aria-labelledby="user-history-title">
              <h3 id="user-history-title" className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#91a3b3]">Actividad de acceso</h3>
              {detail.history.length ? <ul className="mt-2 space-y-2">{detail.history.slice(0, 8).map((event) => <li key={event.id} className="flex items-start justify-between gap-3 text-[10px]"><span className="font-extrabold text-[#304b66]">{event.action}</span><span className="shrink-0 font-semibold text-[#71869c]">{event.createdAt.toLocaleString("es-PE")}</span></li>)}</ul> : <p className="mt-2 text-[10px] font-semibold text-[#71869c]">No hay eventos de auditoría para este usuario.</p>}
            </section>
          </div>
        </Panel>
      ) : detailError ? (
        <div className="rounded-xl border border-[#f0c7c7] bg-[#fff7f7] p-4 text-[11px] font-semibold text-[#a33a3a]" role="alert">{detailError}</div>
      ) : null}
      <div id="permission-matrix">
        <PermissionMatrix />
      </div>
      {controls ? (
        <Panel title="Invitaciones y permisos">
          <details id="user-management-controls" open>
            <summary className="cursor-pointer text-[11px] font-extrabold text-[#2277ee]">
              Abrir gestión de accesos
            </summary>
            <div className="mt-4">{controls}</div>
          </details>
        </Panel>
      ) : null}
    </div>
  );
}

const integrationStatusLabels: Record<string, { label: string; bg: string; ink: string }> = {
  CONNECTED: { label: "Conectado", bg: "bg-[#e4f7ef]", ink: "text-[#159263]" },
  TESTING: { label: "En prueba", bg: "bg-[#fff0df]", ink: "text-[#f08b20]" },
  DISCONNECTED: { label: "Desconectado", bg: "bg-[#ffe7e7]", ink: "text-[#ed4b4b]" },
  NOT_CONFIGURED: { label: "No configurado", bg: "bg-[#f1f4f7]", ink: "text-[#8296a9]" },
};

const INTEGRATION_DISPLAY_ORDER = ["sunat", "whatsapp", "email_smtp", "payment_gateway", "external_api"];
const integrationIcons: Record<string, { icon: LucideIcon; bg: string; ink: string }> = {
  sunat: { icon: ShieldCheck, bg: "bg-[#e8f1ff]", ink: "text-[#2277ee]" },
  whatsapp: { icon: MessageCircle, bg: "bg-[#e4f7ef]", ink: "text-[#159263]" },
  email_smtp: { icon: Mail, bg: "bg-[#e8f1ff]", ink: "text-[#2277ee]" },
  payment_gateway: { icon: CreditCard, bg: "bg-[#ffe7ee]", ink: "text-[#e0538c]" },
  external_api: { icon: Globe, bg: "bg-[#eee9ff]", ink: "text-[#8057e8]" },
};

const policyIcons: Record<string, { icon: LucideIcon; bg: string; ink: string }> = {
  "/admin/precios": { icon: Tag, bg: "bg-[#fff0df]", ink: "text-[#f08b20]" },
  "/admin/inventario": { icon: Package, bg: "bg-[#e4f7ef]", ink: "text-[#159263]" },
  "/admin/pedidos": { icon: ShoppingCart, bg: "bg-[#e8f1ff]", ink: "text-[#2277ee]" },
  "/admin/clientes": { icon: UsersRound, bg: "bg-[#eee9ff]", ink: "text-[#8057e8]" },
};

const locationTypeLabels: Record<string, string> = { STORE: "Tienda", WAREHOUSE: "Almacén", STORE_WAREHOUSE: "Tienda y almacén" };

export function Tanda2Settings({
  controls,
  summary,
  locations = [],
  locationsTotal = 0,
  previousLocationsCount = 0,
  priceLists = [],
  previousPriceTypesCount = 0,
  previousContactMethods = null,
  documentSeries = [],
  previousActiveSeriesCount = 0,
  integrations = [],
}: {
  controls?: ReactNode;
  summary?: {
    legalName?: string | null;
    tradeName?: string | null;
    ruc?: string | null;
    locations: number | null;
    paymentMethods: number | null;
    version: number | null;
    updatedAt?: Date | string | null;
    logoMediaId?: string | null;
    contactMethods?: number;
  };
  locations?: Array<{ id: string; code: string; name: string; type: string; address: string | null; city: string | null; active: boolean }>;
  locationsTotal?: number;
  previousLocationsCount?: number;
  priceLists?: Array<{ priceType: string; label: string; activePrices: number }>;
  previousPriceTypesCount?: number;
  previousContactMethods?: number | null;
  documentSeries?: DocumentSeriesItem[];
  previousActiveSeriesCount?: number;
  integrations?: Array<{ id: string; key: string; label: string; description: string | null; category: string; lastCheckedStatus: string; lastCheckedAt: Date | string | null; lastCheckedMessage: string | null }>;
}) {
  const connectedIntegrations = integrations.filter((row) => row.lastCheckedStatus === "CONNECTED").length;
  const activeSeries = documentSeries.filter((row) => row.active).length;
  const totalPricesTracked = priceLists.reduce((sum, row) => sum + row.activePrices, 0);
  const orderedIntegrations = INTEGRATION_DISPLAY_ORDER
    .map((key) => integrations.find((row) => row.key === key))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .concat(integrations.filter((row) => !INTEGRATION_DISPLAY_ORDER.includes(row.key)));
  return (
    <div className="space-y-4">
      <T2PageHeader
        icon={Settings2}
        title="Configuración empresarial"
        description="Gestiona la información de tu empresa, locales, documentos, integraciones y preferencias del sistema."
      >
        <DiscardSettingsButton />
        <Action form="company-settings-form" type="submit" icon={Save}>
          Guardar cambios
        </Action>
        <TestIntegrationsButton />
      </T2PageHeader>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          label="Locales"
          value={number(summary?.locations)}
          note={summary?.locations != null ? <Delta current={summary.locations} previous={previousLocationsCount} /> : undefined}
          icon={Home}
          color="blue"
          sparkline={summary?.locations != null ? [previousLocationsCount, summary.locations] : undefined}
        />
        <Metric
          label="Listas de precio"
          value={number(priceLists.length)}
          note={priceLists.length ? <Delta current={priceLists.length} previous={previousPriceTypesCount} /> : "Sin precios activos registrados"}
          icon={Tag}
          color="orange"
          sparkline={priceLists.length ? [previousPriceTypesCount, priceLists.length] : undefined}
        />
        <Metric
          label="Series activas"
          value={number(activeSeries)}
          note={documentSeries.length ? <Delta current={activeSeries} previous={previousActiveSeriesCount} /> : "Aún no configuradas"}
          icon={FileText}
          color="green"
          sparkline={documentSeries.length ? [previousActiveSeriesCount, activeSeries] : undefined}
        />
        <Metric
          label="Integraciones"
          value={`${connectedIntegrations}/${integrations.length}`}
          note="Conectadas / configuradas"
          icon={Workflow}
          color="purple"
        />
        <Metric
          label="Métodos de contacto"
          value={number(summary?.contactMethods)}
          note={summary?.contactMethods != null && previousContactMethods != null ? <Delta current={summary.contactMethods} previous={previousContactMethods} /> : "Teléfono, WhatsApp y correos"}
          icon={Smartphone}
          color="green"
          sparkline={summary?.contactMethods != null && previousContactMethods != null ? [previousContactMethods, summary.contactMethods] : undefined}
        />
      </div>
      <nav aria-label="Secciones de configuración" className="flex gap-1 overflow-x-auto rounded-xl border border-[#e2eaf1] bg-white p-1 shadow-[0_1px_3px_rgba(16,42,67,0.035)]">
        {[
          ["Empresa", "#company-general"],
          ["Locales", "#company-addresses"],
          ["Series y documentos", "#company-operation"],
          ["Precios", "/admin/precios"],
          ["Integraciones", "#company-integrations"],
          ["Branding", "#company-branding"],
        ].map(([label, href], index) => (
          <Link
            key={href}
            href={href}
            className={`shrink-0 border-b-2 px-3 py-2 text-[10px] font-extrabold transition ${index === 0 ? "border-[#2277ee] text-[#2277ee]" : "border-transparent text-[#6e8498] hover:text-[#2277ee]"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {(() => {
        const localesPanel = (
      <div id="company-addresses" className="scroll-mt-24">
        <Panel
          title="Locales y almacenes"
          subtitle="Administra tus locales, almacenes y puntos de venta."
          action={<NewLocationButton />}
        >
          {locations.length ? (
            <>
              <div className="mt-3 overflow-x-auto rounded-lg border border-[#e2eaf1]">
                <table className="w-full min-w-[620px] border-collapse text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-[#e2eaf1] bg-[#f7fafc] text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#8296a9]">
                      <th className="px-3 py-2">Código</th>
                      <th className="px-3 py-2">Nombre</th>
                      <th className="px-3 py-2">Tipo</th>
                      <th className="px-3 py-2">Dirección</th>
                      <th className="px-3 py-2">Ciudad</th>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locations.map((location) => (
                      <tr key={location.id} className="border-b border-[#eef2f6] last:border-0">
                        <td className="px-3 py-2 font-mono text-[10px] font-bold text-[#304b66]">{location.code}</td>
                        <td className="px-3 py-2 font-semibold text-[#304b66]">{location.name}</td>
                        <td className="px-3 py-2 text-[#71869c]">{locationTypeLabels[location.type] ?? location.type}</td>
                        <td className="px-3 py-2 text-[#71869c]">{location.address ?? "N/D"}</td>
                        <td className="px-3 py-2 text-[#71869c]">{location.city ?? "N/D"}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-extrabold ${location.active ? "bg-[#e4f7ef] text-[#159263]" : "bg-[#f1f4f7] text-[#8296a9]"}`}>{location.active ? "Activo" : "Inactivo"}</span>
                        </td>
                        <td className="px-3 py-2 text-right"><LocationRowMenu /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-3">
                <span className={`text-[10px] font-semibold ${muted}`}>Mostrando {locations.length} de {locationsTotal} locales</span>
                <Link href="/admin/inventario" className="text-[10px] font-extrabold text-[#2277ee] hover:underline">Ver todos los locales →</Link>
              </div>
            </>
          ) : (
            <Empty title="Sin locales registrados" description="Crea tu primer local en el módulo de Inventario." icon={Home} />
          )}
        </Panel>
      </div>
        );
        const integrationsColumn = (
      <div className="grid content-start gap-3">
        <div id="company-integrations" className="scroll-mt-24">
          <Panel
            title="Estado de integraciones"
            subtitle="Conecta ColdPower con otras herramientas."
            action={
              <Link href="#company-integrations" className="shrink-0 text-[11px] font-extrabold text-[#2277ee]">
                Gestionar integraciones <ChevronRight className="inline h-3 w-3" />
              </Link>
            }
          >
            {orderedIntegrations.length ? (
              <ul className="mt-3 grid gap-2">
                {orderedIntegrations.map((integration) => {
                  const status = integrationStatusLabels[integration.lastCheckedStatus] ?? integrationStatusLabels.NOT_CONFIGURED;
                  const iconInfo = integrationIcons[integration.key] ?? { icon: Workflow, bg: "bg-[#f1f4f7]", ink: "text-[#8296a9]" };
                  return (
                    <li key={integration.id} className="flex items-center gap-2.5 rounded-lg border border-[#edf2f6] bg-[#fbfcfd] p-2.5">
                      <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconInfo.bg} ${iconInfo.ink}`}>
                        <iconInfo.icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-extrabold text-[#304b66]">{integration.label}</p>
                        <p className={`mt-0.5 truncate text-[9px] font-semibold ${muted}`}>{integration.description ?? integration.category}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-extrabold ${status.bg} ${status.ink}`}>{status.label}</span>
                      <IntegrationRowMenu integrationKey={integration.key} />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty title="Sin integraciones registradas" description="El catálogo de integraciones aparecerá aquí." icon={Workflow} />
            )}
          </Panel>
        </div>
        <Panel title="Políticas y reglas del negocio" subtitle="Configura reglas y parámetros generales.">
          <ul className="mt-3 grid gap-2">
            {[
              { label: "Precios y descuentos", description: "Margen mínimo, descuentos máximos, reglas de precio.", href: "/admin/precios" },
              { label: "Inventario", description: "Alertas de stock, stock mínimo, reservas.", href: "/admin/inventario" },
              { label: "Pedidos y ventas", description: "Validación de stock, aprobación, condiciones de venta.", href: "/admin/pedidos" },
              { label: "Clientes", description: "Límites de crédito, categorías, aprobación de clientes nuevos.", href: "/admin/clientes" },
            ].map((item) => {
              const iconInfo = policyIcons[item.href];
              return (
                <li key={item.href}>
                  <Link href={item.href} className="flex items-center gap-2.5 rounded-lg border border-[#edf2f6] bg-[#fbfcfd] p-2.5 transition hover:border-[#b9d2eb]">
                    <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconInfo.bg} ${iconInfo.ink}`}><iconInfo.icon className="h-4 w-4" aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-extrabold text-[#304b66]">{item.label}</span>
                      <span className={`block truncate text-[9px] font-semibold ${muted}`}>{item.description}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
        );
        return isValidElement(controls)
          ? cloneElement(controls as ReactElement<{ belowGeneral?: ReactNode; belowBranding?: ReactNode }>, { belowGeneral: localesPanel, belowBranding: integrationsColumn })
          : controls;
      })()}
    </div>
  );
}

export function Tanda2Home({
  data,
  snapshot,
  actorName,
  role,
  unreadCount,
  preferences,
  recentItems = [],
}: {
  data: DashboardData | null;
  snapshot: OperationsSnapshot | null;
  actorName?: string | null;
  role: AppRole;
  unreadCount: number;
  preferences?: {
    favorites: string[];
    quickActions: string[];
    widgetOrder: string[];
    collapsedWidgets: string[];
  } | null;
  recentItems?: Array<{
    id: string;
    entityType: string;
    entityId: string;
    label: string;
    href: string;
    visitedAt: Date | string;
  }>;
}) {
  const displayName = actorName?.trim() || role;
  const queueItems = Object.values(snapshot?.queues ?? {})
    .flat()
    .slice(0, 5) as Array<Record<string, unknown>>;
  const taskCount = Object.values(snapshot?.queues ?? {}).reduce(
    (total, items) => total + items.length,
    0,
  );
  const moduleOptions = [
    {
      label: "Catálogo",
      href: "/admin/catalogo",
      Icon: Package,
      permission: "catalog.product.view" as const,
    },
    {
      label: "Inventario",
      href: "/admin/inventario",
      Icon: PackageCheck,
      permission: "inventory.view" as const,
    },
    {
      label: "Cotizaciones",
      href: "/admin/cotizaciones",
      Icon: FileText,
      permission: "quotes.view" as const,
    },
    {
      label: "Clientes",
      href: "/admin/clientes",
      Icon: UsersRound,
      permission: "customers.view" as const,
    },
    {
      label: "Operaciones",
      href: "/admin/operaciones",
      Icon: Workflow,
      permission: "operations.view" as const,
    },
    {
      label: "Reportes",
      href: "/admin/reportes",
      Icon: BarChart3,
      permission: "reports.view" as const,
    },
    {
      label: "Auditoría",
      href: "/admin/auditoria",
      Icon: ShieldCheck,
      permission: "audit.view" as const,
    },
  ] as const;
  const availableModules = moduleOptions.filter((item) => can(role, item.permission));
  const quickActions = [
    {
      id: "catalog.create",
      label: "Nuevo producto",
      href: "/admin/catalogo",
      Icon: Package,
      permission: "catalog.product.create" as const,
    },
    {
      id: "quotes.create",
      label: "Nueva cotización",
      href: "/admin/cotizaciones",
      Icon: FileText,
      permission: "quotes.create" as const,
    },
    {
      id: "customers.create",
      label: "Nuevo cliente",
      href: "/admin/clientes",
      Icon: UsersRound,
      permission: "customers.create" as const,
    },
    {
      id: "inventory.adjust",
      label: "Ajustar inventario",
      href: "/admin/inventario",
      Icon: PackageCheck,
      permission: "inventory.adjust" as const,
    },
    {
      id: "purchases.manage",
      label: "Crear OC",
      href: "/admin/compras",
      Icon: ShoppingCart,
      permission: "purchases.manage" as const,
    },
    {
      id: "reports.view",
      label: "Generar reporte",
      href: "/admin/reportes",
      Icon: BarChart3,
      permission: "reports.view" as const,
    },
  ] as const;
  const availableQuickActions = quickActions.filter((item) => can(role, item.permission));
  const configuredFavorites = (preferences?.favorites ?? [])
    .map((href) => availableModules.find((item) => item.href === href))
    .filter((value): value is (typeof availableModules)[number] => Boolean(value));
  const frequentModules = configuredFavorites.length
    ? [
        ...configuredFavorites,
        ...availableModules.filter((item) => !configuredFavorites.includes(item)),
      ]
    : availableModules;
  const configuredQuickActions = (preferences?.quickActions ?? [])
    .map((id) => availableQuickActions.find((item) => item.id === id))
    .filter((value): value is (typeof availableQuickActions)[number] => Boolean(value));
  const permittedQuickActions = configuredQuickActions.length
    ? configuredQuickActions
    : availableQuickActions;
  const favoriteOptions: HomePersonalizationOption[] = availableModules.map(({ href, label }) => ({
    id: href,
    label,
  }));
  const quickActionOptions: HomePersonalizationOption[] = availableQuickActions.map(
    ({ id, label }) => ({ id, label }),
  );
  const widgetOptions: HomePersonalizationOption[] = [
    { id: "attention", label: "Pendientes" },
    { id: "frequent", label: "Módulos frecuentes" },
    { id: "quick-actions", label: "Accesos rápidos" },
    { id: "agenda", label: "Agenda" },
  ];
  const widgetIds = new Set(widgetOptions.map((option) => option.id));
  const widgetOrder = (preferences?.widgetOrder ?? []).filter((id) => widgetIds.has(id));
  const orderedWidgets = [
    ...widgetOrder,
    ...widgetOptions.map((option) => option.id).filter((id) => !widgetOrder.includes(id)),
  ];

  const renderWidget = (widgetId: string) => {
    if (widgetId === "frequent") {
      return (
        <Panel key={widgetId} title="Módulos frecuentes" subtitle="Accesos definidos por permisos">
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {frequentModules.slice(0, 6).map(({ label, href, Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 rounded-xl border border-[#edf2f6] p-3 transition hover:border-[#b9d2eb]"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#e8f1ff] text-[#2277ee]">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>
                  <strong className="block text-[10px] text-[#304b66]">{label}</strong>
                  <span className={`mt-0.5 block text-[9px] font-semibold ${muted}`}>
                    Abrir módulo
                  </span>
                </span>
                <ChevronRight className="ml-auto h-3.5 w-3.5 text-[#a5b6c5]" />
              </Link>
            ))}
          </div>
        </Panel>
      );
    }
    if (widgetId === "quick-actions") {
      return (
        <Panel key={widgetId} title="Accesos rápidos" subtitle="Atajos para tareas comunes">
          <div className="mt-3 divide-y divide-[#edf2f6]">
            {permittedQuickActions.map(({ id, label, href, Icon }) => (
              <Link
                key={id}
                href={href}
                className="flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0"
              >
                <Icon className="h-4 w-4 text-[#2277ee]" aria-hidden="true" />
                <span className="flex-1 text-[10px] font-extrabold text-[#304b66]">{label}</span>
                <ChevronRight className="h-3.5 w-3.5 text-[#a5b6c5]" />
              </Link>
            ))}
          </div>
        </Panel>
      );
    }
    if (widgetId === "attention") {
      return (
        <Panel
          key={widgetId}
          title="Pendientes"
          action={
            <Link href="/admin/operaciones" className="text-[10px] font-extrabold text-[#2277ee]">
              Ver todos
            </Link>
          }
        >
          <div className="mt-3 divide-y divide-[#edf2f6]">
            {queueItems.map((item, index) => (
              <Link
                key={`${String(item.id ?? "item")}-${index}`}
                href={String(
                  (Array.isArray(item.actions)
                    ? (item.actions as Array<{ href?: string }>).find((action) => action.href)?.href
                    : undefined) ?? "/admin/operaciones",
                )}
                className="flex items-center gap-2 py-2.5 first:pt-0"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-[#f08b20]" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-[10px] font-extrabold text-[#304b66]">
                  {String(item.title ?? item.product ?? item.customer ?? "Tarea operativa")}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-[#a5b6c5]" />
              </Link>
            ))}
            {!queueItems.length ? (
              <Empty
                title="No tienes pendientes para hoy."
                description="La agenda se actualizará con tareas y seguimientos reales."
                icon={CheckCircle2}
              />
            ) : null}
          </div>
        </Panel>
      );
    }
    return (
      <Panel key="agenda" title="Agenda" subtitle="Hoy + próximos 7 días">
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <MiniValue
            label="Tareas"
            value={number(taskCount)}
            note="Cola operativa actual"
            icon={Workflow}
          />
          <MiniValue
            label="Seguimientos"
            value={number(snapshot?.metrics.overdueTasks)}
            note="Vencidos dentro del alcance"
            icon={Clock3}
          />
        </div>
      </Panel>
    );
  };
  return (
    <div className="space-y-4">
      <T2PageHeader
        icon={Home}
        title={`¡Bienvenido, ${displayName}! 👋`}
        description="Esto es lo que requiere tu atención hoy."
      >
        <AdminHomePersonalizer
          favorites={preferences?.favorites ?? []}
          quickActions={preferences?.quickActions ?? []}
          widgetOrder={preferences?.widgetOrder ?? []}
          favoriteOptions={favoriteOptions}
          quickActionOptions={quickActionOptions}
          widgetOptions={widgetOptions}
        />
      </T2PageHeader>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Mis tareas hoy" value={number(taskCount)} icon={Workflow} color="blue" />
        <Metric
          label="Seguimientos vencidos"
          value={number(snapshot?.metrics.overdueTasks)}
          icon={Clock3}
          color="red"
        />
        <Metric
          label="Notificaciones no leídas"
          value={number(unreadCount)}
          icon={Bell}
          color="purple"
        />
        <Metric
          label="Pendientes asignados"
          value={number(data?.pendingApprovalsCount)}
          icon={CheckCircle2}
          color="orange"
        />
      </div>
      <div className="grid gap-3 xl:grid-cols-3">
        {orderedWidgets.map((widgetId) => renderWidget(widgetId))}
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <Panel
          title="Actividad reciente"
          subtitle={
            recentItems.length
              ? `${recentItems.length} accesos persistidos`
              : "Eventos relevantes para tu trabajo"
          }
        >
          {recentItems.length ? (
            <div className="mt-3 divide-y divide-[#edf2f6]">
              {recentItems.slice(0, 5).map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center gap-3 py-2.5 first:pt-0"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[#2277ee]" />
                  <span className="min-w-0 flex-1 truncate text-[10px] font-extrabold text-[#304b66]">
                    {item.label}
                  </span>
                  <span className={`shrink-0 text-[9px] font-semibold ${muted}`}>
                    {dateLabel(item.visitedAt)}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <Empty
              title="Sin accesos recientes"
              description="Tus módulos visitados aparecerán aquí."
              icon={FileClock}
            />
          )}
        </Panel>
      </div>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Panel title="Experiencia en todos tus dispositivos" subtitle="La operación se adapta al tamaño de tu pantalla">
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl border border-[#edf2f6] p-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f1ff] text-[#2277ee]"><LayoutDashboard className="h-4 w-4" aria-hidden="true" /></span>
              <div><strong className="block text-[10px] font-extrabold text-[#304b66]">Escritorio</strong><p className={`mt-1 text-[9px] font-semibold leading-4 ${muted}`}>Usa el menú lateral y las tablas completas para revisar más información de una vez.</p></div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-[#edf2f6] p-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e4f7ef] text-[#159263]"><Smartphone className="h-4 w-4" aria-hidden="true" /></span>
              <div><strong className="block text-[10px] font-extrabold text-[#304b66]">Móvil</strong><p className={`mt-1 text-[9px] font-semibold leading-4 ${muted}`}>Consulta pendientes y ejecuta acciones esenciales desde una vista compacta.</p></div>
            </div>
          </div>
        </Panel>
        <Panel title="Guía rápida" subtitle="Rutas recomendadas para empezar">
          <ol className="mt-3 grid gap-2">
            {[
              ["Revisa tus pendientes", "/admin/operaciones"],
              ["Crea una cotización", "/admin/cotizaciones"],
              ["Confirma disponibilidad", "/admin/inventario"],
              ["Consulta la trazabilidad", "/admin/auditoria"],
            ].map(([label, href], index) => <li key={href}><Link href={href} className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 text-[10px] font-extrabold text-[#304b66] transition hover:bg-[#f5f9fc] hover:text-[#2277ee]"><span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#eff4f8] text-[9px] font-black text-[#607894]">{index + 1}</span><span className="flex-1">{label}</span><ChevronRight className="h-3.5 w-3.5 text-[#a5b6c5]" aria-hidden="true" /></Link></li>)}
          </ol>
          <p className={`mt-3 flex items-center gap-1.5 text-[10px] font-semibold ${muted}`}><CircleHelp className="h-3.5 w-3.5 text-[#2277ee]" aria-hidden="true" />Los permisos de tu rol determinan las acciones disponibles.</p>
        </Panel>
      </div>
    </div>
  );
}
