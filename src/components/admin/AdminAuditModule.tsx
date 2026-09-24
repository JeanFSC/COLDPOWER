import Link from "next/link";
import { AdminLineChart, AdminSparkline } from "@/components/admin/AdminChartsLazy";
import { CopyButton, FilterDropdown, SaveFilterButton, SavedFiltersMenu } from "@/components/admin/AuditModuleControls";
import {
  actionLabel, entityLabel, isFailedAction,
  type AuditAlert, type AuditFieldDiff, type AuditKpi, type AuditListItem, type AuditPageResponse,
  type AuditSavedFilter, type AuditTrendPoint,
} from "@/lib/audit-contract";

function Icon({ path, className }: { path: string; className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
    </svg>
  );
}

const ICON = {
  shield: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  alertTriangle: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  docEdit: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  users: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  bolt: "M13 10V3L4 14h7v7l9-11h-7z",
  xCircle: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z",
  download: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  chevronLeft: "M15 19l-7-7 7-7",
  chevronRight: "M9 5l7 7-7 7",
  sortVertical: "M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4",
  info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  checkCircle: "M5 13l4 4L19 7",
  close: "M6 18L18 6M6 6l12 12",
  personCheck: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
  lock: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v2h8z",
  arrowUp: "M5 10l7-7m0 0l7 7m-7-7v18",
  arrowDown: "M19 14l-7 7m0 0l-7-7m7 7V3",
} as const;

function Kebab() {
  return (
    <svg className="ml-auto h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
    </svg>
  );
}

const severityMeta: Record<string, { label: string; classes: string }> = {
  INFO: { label: "Info", classes: "bg-emerald-50 text-emerald-600 border-emerald-200/60" },
  WARNING: { label: "Advertencia", classes: "bg-amber-50 text-amber-600 border-amber-200/60" },
  CRITICAL: { label: "Crítica", classes: "bg-red-100 text-red-700 border-red-200" },
};
const alertTone: Record<AuditAlert["tone"], { border: string; bg: string; iconBg: string; iconInk: string; icon: string }> = {
  red: { border: "border-red-100", bg: "bg-red-50/50", iconBg: "bg-red-100", iconInk: "text-red-600", icon: ICON.alertTriangle },
  amber: { border: "border-amber-100", bg: "bg-amber-50/50", iconBg: "bg-amber-100", iconInk: "text-amber-600", icon: ICON.alertTriangle },
  blue: { border: "border-blue-100", bg: "bg-blue-50/50", iconBg: "bg-blue-100", iconInk: "text-blue-600", icon: ICON.info },
  emerald: { border: "border-emerald-100", bg: "bg-emerald-50/50", iconBg: "bg-emerald-100", iconInk: "text-emerald-600", icon: ICON.checkCircle },
};

const dateTimeFormat = new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const dayLabelFormat = new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short" });
function formatDateTime(date: Date) { return dateTimeFormat.format(date).replace(".", ""); }
function initialsOf(name: string | null, fallback: string) {
  const source = (name ?? fallback).trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return source.slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
const avatarTones = ["bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700", "bg-cyan-100 text-cyan-700", "bg-amber-100 text-amber-700"];
function avatarTone(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return avatarTones[hash % avatarTones.length];
}

// "Higher is bad" metrics get a red delta on the way up, emerald on the way down.
// The other KPIs are informational volume — always emerald, matching how the
// reference design colored them (more visibility isn't itself bad news).
const badWhenUp = new Set(["critical", "failed", "integrationErrors"]);
function deltaDisplay(key: string, kpi: AuditKpi) {
  if (kpi.deltaPct === null) return { text: "Sin datos del período anterior", color: "text-slate-400" };
  const arrow = kpi.deltaPct > 0 ? "↗" : kpi.deltaPct < 0 ? "↘" : "→";
  const text = `${arrow} ${Math.abs(kpi.deltaPct)}% vs. período anterior`;
  const color = badWhenUp.has(key) ? (kpi.deltaPct > 0 ? "text-red-500" : "text-emerald-600") : "text-emerald-600";
  return { text, color };
}

type KpiKey = "events" | "critical" | "sensitive" | "logins" | "integrationErrors" | "failed";
const kpiMeta: Array<{ key: KpiKey; label: string; iconBg: string; iconInk: string; iconPath: string; sparkTone: "blue" | "orange" | "green" | "red" | "purple" }> = [
  { key: "events", label: "Eventos 24h", iconBg: "bg-blue-50", iconInk: "text-blue-600", iconPath: ICON.shield, sparkTone: "blue" },
  { key: "critical", label: "Eventos críticos", iconBg: "bg-red-50", iconInk: "text-red-500", iconPath: ICON.alertTriangle, sparkTone: "red" },
  { key: "sensitive", label: "Cambios sensibles", iconBg: "bg-amber-50", iconInk: "text-amber-500", iconPath: ICON.docEdit, sparkTone: "orange" },
  { key: "logins", label: "Inicios de sesión", iconBg: "bg-emerald-50", iconInk: "text-emerald-500", iconPath: ICON.users, sparkTone: "green" },
  { key: "integrationErrors", label: "Errores de integración", iconBg: "bg-purple-50", iconInk: "text-purple-600", iconPath: ICON.bolt, sparkTone: "purple" },
  { key: "failed", label: "Acciones fallidas", iconBg: "bg-red-50", iconInk: "text-red-500", iconPath: ICON.xCircle, sparkTone: "red" },
];
function trendSeries(trend: AuditTrendPoint[], key: KpiKey): number[] {
  if (key === "events") return trend.map((point) => point.total);
  return trend.map((point) => point[key]);
}

function withParam(baseQuery: string, updates: Record<string, string | undefined>) {
  const params = new URLSearchParams(baseQuery);
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) params.delete(key);
    else params.set(key, value);
  }
  return params.toString();
}

function entityHref(entityType: string, entityId: string): string | null {
  const id = encodeURIComponent(entityId);
  switch (entityType.toLowerCase()) {
    case "product":
      return `/admin/catalogo/${id}`;
    case "products":
      return `/admin/catalogo?productId=${id}`;
    case "customer":
      return `/admin/clientes?customerId=${id}`;
    case "user":
      return `/admin/usuarios?userId=${id}`;
    case "order":
      return `/admin/pedidos?orderId=${id}`;
    case "quote":
      return `/admin/cotizaciones?quoteId=${id}`;
    case "sale":
      return `/admin/ventas?saleId=${id}`;
    case "payment":
      return `/admin/pagos?paymentId=${id}`;
    case "report_schedule":
      return `/admin/reportes?scheduleId=${id}`;
    case "company_settings":
      return "/admin/configuracion";
    case "integration":
      return "/admin/configuracion#company-integrations";
    case "notification":
      return `/admin/notificaciones?notificationId=${id}`;
    default:
      return null;
  }
}

export type AuditModuleProps = {
  metrics: AuditPageResponse["metrics"];
  trend: AuditTrendPoint[];
  trendPrevious: number[];
  alerts: AuditAlert[];
  rows: AuditListItem[];
  pagination: { page: number; totalPages: number; totalItems: number };
  facets: { modules: Array<{ value: string; label: string }>; severities: string[] };
  filters: { query?: string; module?: string; severity?: string; dateFrom?: string; dateTo?: string };
  baseQuery: string;
  exportHref: string;
  selected: AuditListItem | null;
  relatedEvents: AuditListItem[];
  diff: AuditFieldDiff[];
  canViewSensitive: boolean;
  tab: "info" | "cambios" | "relacionado";
  savedFilters: AuditSavedFilter[];
  loadError?: boolean;
};

export function AuditModule({
  metrics, trend, trendPrevious, alerts, rows, pagination, facets, filters, baseQuery, exportHref,
  selected, relatedEvents, diff, canViewSensitive, tab, savedFilters, loadError,
}: AuditModuleProps) {
  const hasActiveFilters = Boolean(filters.query || filters.module || filters.severity || filters.dateFrom || filters.dateTo);
  const paginationWindow = Array.from({ length: Math.min(5, pagination.totalPages) }, (_, index) => {
    const start = Math.max(1, Math.min(pagination.page - 2, pagination.totalPages - 4));
    return start + index;
  }).filter((value) => value >= 1 && value <= pagination.totalPages);

  return (
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
      <div className="min-w-0 flex-1 space-y-5">
        {loadError ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700">
            <Icon path={ICON.alertTriangle} className="h-4 w-4 shrink-0" />
            No se pudo conectar a la base de datos. Los datos mostrados pueden estar incompletos.
          </div>
        ) : null}
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 shadow-2xs">
              <Icon path={ICON.shield} className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-snug text-slate-900">Auditoría</h1>
              <p className="text-xs text-slate-500">Consulta y analiza todas las actividades del sistema, garantizando la seguridad y cumplimiento.</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <a href={exportHref} download className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-2xs transition-colors hover:bg-slate-50">
              <Icon path={ICON.download} className="h-3.5 w-3.5 text-slate-500" />
              <span>Exportar logs</span>
            </a>
            <SaveFilterButton currentQuery={baseQuery} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60" />
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {kpiMeta.map((meta) => {
            const kpi = metrics[meta.key];
            const delta = deltaDisplay(meta.key, kpi);
            return (
              <div key={meta.key} className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className={`rounded-md p-1 ${meta.iconBg} ${meta.iconInk}`}>
                    <Icon path={meta.iconPath} className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[11px] font-medium leading-tight text-slate-500">{meta.label}</span>
                </div>
                <div className="mb-1 text-xl font-bold leading-none text-slate-900">{kpi.current.toLocaleString("es-PE")}</div>
                <div className={`mb-2 text-[10px] font-medium leading-tight ${delta.color}`}>{delta.text}</div>
                <AdminSparkline tone={meta.sparkTone} data={trendSeries(trend, meta.key)} ariaLabel={`Tendencia de ${meta.label.toLowerCase()}`} className="block h-6 w-full" />
              </div>
            );
          })}
        </section>

        <form method="get" action="/admin/auditoria" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white p-2.5 text-xs shadow-2xs">
          <div className="relative min-w-[280px] flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Icon path={ICON.search} className="h-3.5 w-3.5" />
            </span>
            <input type="text" name="query" defaultValue={filters.query ?? ""} placeholder="Buscar por actor, acción, objeto, IP o ID de correlación..." className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterDropdown
              label="Módulo"
              paramName="module"
              value={filters.module}
              currentQuery={baseQuery}
              options={[{ value: "", label: "Todos" }, ...facets.modules]}
            />
            <FilterDropdown
              label="Severidad"
              paramName="severity"
              value={filters.severity}
              currentQuery={baseQuery}
              options={[{ value: "", label: "Todas" }, ...facets.severities.map((value) => ({ value, label: severityMeta[value]?.label ?? value }))]}
            />
            <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
              <span className="text-[11px] text-slate-400">Desde</span>
              <input type="date" name="dateFrom" defaultValue={filters.dateFrom ?? ""} className="border-0 bg-transparent p-0 text-xs font-medium text-slate-700 focus:outline-none focus:ring-0" />
            </label>
            <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
              <span className="text-[11px] text-slate-400">Hasta</span>
              <input type="date" name="dateTo" defaultValue={filters.dateTo ?? ""} className="border-0 bg-transparent p-0 text-xs font-medium text-slate-700 focus:outline-none focus:ring-0" />
            </label>
            <button type="submit" className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">Aplicar</button>
            <SavedFiltersMenu savedFilters={savedFilters} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50" />
            {hasActiveFilters ? <Link href="/admin/auditoria" className="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700">Limpiar</Link> : null}
          </div>
        </form>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-800">Volumen de eventos</h3>
              <div className="flex items-center gap-4 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" />Total</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-1 rounded-full border border-dashed border-blue-300" />Período anterior</span>
              </div>
            </div>
            <AdminLineChart
              data={trend.map((point) => point.total)}
              previous={trendPrevious}
              labels={trend.map((point) => dayLabelFormat.format(new Date(`${point.date}T00:00:00`)).replace(".", ""))}
              comparison
              filled
              largeLabels
              accent="blue"
              ariaLabel="Volumen de eventos de auditoría, últimos 30 días"
            />
          </div>
          <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
            <h3 className="mb-2 text-xs font-semibold text-slate-800">Alertas y cumplimiento</h3>
            <div className="space-y-2.5">
              {alerts.map((alert) => {
                const meta = alertTone[alert.tone];
                return (
                  <div key={alert.title} className={`flex items-start gap-2.5 rounded-lg border p-2.5 ${meta.border} ${meta.bg}`}>
                    <span className={`mt-0.5 rounded-md p-1 ${meta.iconBg} ${meta.iconInk}`}>
                      <Icon path={meta.icon} className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold leading-tight text-slate-800">{alert.title}</p>
                      <p className="mt-0.5 text-[11px] leading-tight text-slate-500">{alert.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="flex flex-col flex-wrap justify-between gap-3 border-b border-slate-200 p-3.5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xs font-bold text-slate-900">Registro de auditoría</h2>
              <p className="text-[11px] text-slate-400">{pagination.totalItems.toLocaleString("es-PE")} resultados</p>
            </div>
            {pagination.totalPages > 1 ? (
              <div className="flex items-center space-x-1 text-xs text-slate-600">
                <Link href={`/admin/auditoria?${withParam(baseQuery, { page: String(Math.max(1, pagination.page - 1)) })}`} className="rounded p-1 text-slate-400 hover:text-slate-600" aria-label="Página anterior">
                  <Icon path={ICON.chevronLeft} className="h-3.5 w-3.5" />
                </Link>
                {paginationWindow.map((page) => (
                  <Link
                    key={page}
                    href={`/admin/auditoria?${withParam(baseQuery, { page: String(page) })}`}
                    className={page === pagination.page ? "flex h-6 w-6 items-center justify-center rounded border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-600" : "flex h-6 w-6 items-center justify-center rounded text-xs hover:bg-slate-100"}
                  >
                    {page}
                  </Link>
                ))}
                <Link href={`/admin/auditoria?${withParam(baseQuery, { page: String(Math.min(pagination.totalPages, pagination.page + 1)) })}`} className="rounded p-1 text-slate-400 hover:text-slate-600" aria-label="Página siguiente">
                  <Icon path={ICON.chevronRight} className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : null}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2.5">
                    <div className="flex items-center gap-1"><span>Fecha y hora</span><Icon path={ICON.sortVertical} className="h-3 w-3 text-slate-400" /></div>
                  </th>
                  <th className="px-3 py-2.5">Actor</th>
                  <th className="px-3 py-2.5">Módulo</th>
                  <th className="px-3 py-2.5">Acción</th>
                  <th className="px-3 py-2.5">Objeto</th>
                  <th className="px-3 py-2.5">Severidad</th>
                  <th className="px-3 py-2.5">Resultado</th>
                  <th className="px-3 py-2.5 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {rows.length ? rows.map((row) => {
                  const isSelected = selected?.id === row.id;
                  const failed = isFailedAction(row.action);
                  const severity = severityMeta[row.severity] ?? severityMeta.INFO;
                  const displayName = row.actorName ?? (row.actorId ? row.actorId : "Sistema");
                  return (
                    <tr key={row.id} className={isSelected ? "border-l-2 border-l-blue-600 bg-blue-50/40" : "transition-colors hover:bg-slate-50/75"}>
                      <td className={`whitespace-nowrap px-3 py-2.5 ${isSelected ? "font-medium text-slate-700" : "text-slate-600"}`}>{formatDateTime(row.createdAt)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${avatarTone(row.actorId ?? "system")}`}>{initialsOf(row.actorName, row.actorId ? "??" : "SC")}</span>
                          <div>
                            <p className={`leading-tight ${isSelected ? "font-semibold text-slate-900" : "font-medium text-slate-800"}`}>{displayName}</p>
                            <p className="max-w-[160px] truncate text-[10px] leading-tight text-slate-400">{row.actorEmail ?? (row.actorId ? row.actorId : "sistema@coldpower.com")}</p>
                          </div>
                        </div>
                      </td>
                      <td className={`px-3 py-2.5 ${isSelected ? "text-slate-700" : "text-slate-600"}`}>{row.moduleLabel}</td>
                      <td className={`px-3 py-2.5 ${isSelected ? "font-semibold text-slate-900" : "font-medium text-slate-800"}`}>{actionLabel(row.action)}</td>
                      <td className="px-3 py-2.5">
                        <p className={`leading-tight ${isSelected ? "font-medium text-slate-900" : "font-medium text-slate-800"}`}>{entityLabel(row.entityType)}</p>
                        {entityHref(row.entityType, row.entityId) ? (
                          <Link href={entityHref(row.entityType, row.entityId)!} className="block max-w-[160px] truncate text-[10px] leading-tight text-blue-600 hover:underline" title="Abrir objeto relacionado">
                            {row.entityId}
                          </Link>
                        ) : <p className="max-w-[160px] truncate text-[10px] leading-tight text-slate-400">{row.entityId}</p>}
                      </td>
                      <td className="px-3 py-2.5"><span className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-medium ${severity.classes}`}>{severity.label}</span></td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-medium ${failed ? "bg-red-50 text-red-600 border-red-200/60" : "bg-emerald-50 text-emerald-600 border-emerald-200/60"}`}>{failed ? "Fallido" : "Exitoso"}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Link href={`/admin/auditoria?${withParam(baseQuery, { eventId: row.id, tab: undefined })}`} className="inline-flex rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Ver detalle">
                          <Kebab />
                        </Link>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={8} className="px-3 py-10 text-center text-xs text-slate-400">No hay eventos de auditoría para estos filtros.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <aside className="w-full shrink-0 rounded-xl border border-slate-200 bg-white xl:w-[390px]">
        {selected ? (
          <>
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h2 className="text-sm font-bold text-slate-900">Detalle del evento</h2>
              <Link href={`/admin/auditoria?${withParam(baseQuery, { eventId: undefined, tab: undefined })}`} className="rounded p-1 text-slate-400 hover:text-slate-600" aria-label="Cerrar">
                <Icon path={ICON.close} className="h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600">
                    <Icon path={ICON.personCheck} className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{actionLabel(selected.action)}</h3>
                    <p className="text-[11px] text-slate-400">{formatDateTime(selected.createdAt)}</p>
                  </div>
                </div>
                <span className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-medium ${isFailedAction(selected.action) ? "bg-red-50 text-red-600 border-red-200/60" : "bg-emerald-50 text-emerald-600 border-emerald-200/60"}`}>
                  {isFailedAction(selected.action) ? "Fallido" : "Exitoso"}
                </span>
              </div>

              <div className="border-b border-slate-200">
                <nav className="flex space-x-6 text-xs font-medium">
                  <Link href={`/admin/auditoria?${withParam(baseQuery, { eventId: selected.id, tab: undefined })}`} className={tab === "info" ? "border-b-2 border-blue-600 pb-2 font-semibold text-blue-600" : "pb-2 text-slate-500 hover:text-slate-700"}>Información</Link>
                  <Link href={`/admin/auditoria?${withParam(baseQuery, { eventId: selected.id, tab: "cambios" })}`} className={tab === "cambios" ? "border-b-2 border-blue-600 pb-2 font-semibold text-blue-600" : "pb-2 text-slate-500 hover:text-slate-700"}>Cambios</Link>
                  <Link href={`/admin/auditoria?${withParam(baseQuery, { eventId: selected.id, tab: "relacionado" })}`} className={tab === "relacionado" ? "border-b-2 border-blue-600 pb-2 font-semibold text-blue-600" : "pb-2 text-slate-500 hover:text-slate-700"}>
                    Relacionado {relatedEvents.length ? <span className="text-slate-400">({relatedEvents.length})</span> : null}
                  </Link>
                </nav>
              </div>

              {tab === "info" ? (
                <>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between"><span className="text-[11px] text-slate-400">ID del evento</span><span className="font-mono text-[11px] text-slate-700">{selected.id}</span></div>
                    {selected.correlationId ? (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">ID de correlación</span>
                        <div className="flex items-center gap-1">
                          <span className="max-w-[190px] truncate font-mono text-[11px] text-slate-700">{selected.correlationId}</span>
                          <CopyButton value={selected.correlationId} />
                        </div>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Actor</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${avatarTone(selected.actorId ?? "system")}`}>{initialsOf(selected.actorName, selected.actorId ? "??" : "SC")}</span>
                        <div className="text-right">
                          <p className="font-semibold leading-none text-slate-800">{selected.actorName ?? selected.actorId ?? "Sistema"}</p>
                          <p className="mt-0.5 text-[10px] leading-none text-slate-400">{selected.actorEmail ?? "—"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between"><span className="text-[11px] text-slate-400">Módulo</span><span className="font-medium text-slate-700">{selected.moduleLabel}</span></div>
                    <div className="flex items-center justify-between"><span className="text-[11px] text-slate-400">Acción</span><span className="font-medium text-slate-700">{actionLabel(selected.action)}</span></div>
                    <div className="flex items-center justify-between"><span className="text-[11px] text-slate-400">Objeto</span><span className="font-medium text-slate-700">{entityLabel(selected.entityType)}</span></div>
                    <div className="flex items-center justify-between"><span className="text-[11px] text-slate-400">ID del objeto</span>{entityHref(selected.entityType, selected.entityId) ? <Link href={entityHref(selected.entityType, selected.entityId)!} className="max-w-[190px] truncate font-mono text-[11px] text-blue-600 hover:underline" title="Abrir objeto relacionado">{selected.entityId}</Link> : <span className="max-w-[190px] truncate font-mono text-[11px] text-slate-700">{selected.entityId}</span>}</div>
                    <div className="flex items-center justify-between"><span className="text-[11px] text-slate-400">IP</span><span className="font-mono text-[11px] text-slate-700">{selected.ip ?? "N/D"}</span></div>
                    <div className="flex items-center justify-between"><span className="text-[11px] text-slate-400">Ubicación</span><span className="text-[11px] text-slate-700">{selected.geo.city && selected.geo.country ? `${selected.geo.city}, ${selected.geo.country}` : "N/D"}</span></div>
                    <div className="flex items-center justify-between"><span className="text-[11px] text-slate-400">Navegador</span><span className="text-[11px] text-slate-700">{selected.browserLabel ?? "N/D"}</span></div>
                  </div>

                  <div className="border-t border-slate-200 pt-3">
                    <h4 className="mb-3 text-xs font-bold text-slate-900">Datos del cambio</h4>
                    {canViewSensitive ? (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="mb-1 block text-[11px] font-medium text-slate-700">Antes</span>
                          <div className="h-44 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-mono text-[10.5px] leading-relaxed text-slate-700">
                            {selected.before ? <pre className="whitespace-pre-wrap leading-relaxed">{JSON.stringify(selected.before, null, 2)}</pre> : <p className="flex h-full items-center justify-center text-slate-400">No existía</p>}
                          </div>
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-emerald-600">Después</span>
                            {selected.after ? <CopyButton value={JSON.stringify(selected.after, null, 2)} /> : null}
                          </div>
                          <div className="h-44 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-mono text-[10.5px] leading-relaxed text-slate-700">
                            {selected.after ? <pre className="whitespace-pre-wrap leading-relaxed">{JSON.stringify(selected.after, null, 2)}</pre> : <p className="flex h-full items-center justify-center text-slate-400">Sin datos</p>}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <RestrictedNotice />
                    )}
                  </div>
                </>
              ) : null}

              {tab === "cambios" ? (
                canViewSensitive ? (
                  diff.length ? (
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/70 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                            <th className="px-2.5 py-2">Campo</th><th className="px-2.5 py-2">Antes</th><th className="px-2.5 py-2">Después</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {diff.map((field) => (
                            <tr key={field.field}>
                              <td className="px-2.5 py-2 font-mono text-slate-500">{field.field}</td>
                              <td className="px-2.5 py-2 text-slate-700">{field.before === null || field.before === undefined ? "—" : String(field.before)}</td>
                              <td className="px-2.5 py-2 font-medium text-emerald-700">{field.after === null || field.after === undefined ? "—" : String(field.after)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-[11px] text-slate-400">Este evento no registró cambios de campos.</p>
                  )
                ) : (
                  <RestrictedNotice />
                )
              ) : null}

              {tab === "relacionado" ? (
                relatedEvents.length ? (
                  <div className="space-y-2">
                    {relatedEvents.map((event) => (
                      <Link key={event.id} href={`/admin/auditoria?${withParam(baseQuery, { eventId: event.id, tab: undefined })}`} className="block rounded-lg border border-slate-200 p-2.5 hover:border-blue-300 hover:bg-blue-50/30">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-slate-800">{actionLabel(event.action)}</p>
                          <span className="text-[10px] text-slate-400">{formatDateTime(event.createdAt)}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500">{event.moduleLabel} · {event.actorName ?? event.actorId ?? "Sistema"}</p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-[11px] text-slate-400">Sin eventos relacionados.</p>
                )
              ) : null}
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-center">
            <Icon path={ICON.shield} className="h-8 w-8 text-slate-300" />
            <p className="text-xs font-semibold text-slate-500">Selecciona un evento</p>
            <p className="text-[11px] text-slate-400">Elige una fila del registro para ver su detalle completo.</p>
          </div>
        )}
      </aside>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-unused-vars -- retained visual draft is not wired to the live audit route. */
function AuditModuleStitchDraft({
  metrics,
  trend,
  trendPrevious,
  alerts,
  rows,
  pagination,
  facets,
  filters,
  baseQuery,
  exportHref,
  selected,
  relatedEvents,
  diff,
  canViewSensitive,
  tab,
  savedFilters,
  loadError,
}: AuditModuleProps) {
  const moduleCounts = rows.reduce<Record<string, number>>((counts, row) => {
    counts[row.moduleLabel] = (counts[row.moduleLabel] ?? 0) + 1;
    return counts;
  }, {});
  const modules = Object.entries(moduleCounts).sort(([, a], [, b]) => b - a).slice(0, 6);
  const modulePeak = Math.max(1, ...modules.map(([, count]) => count));
  const topRows = rows.slice(0, 5);
  const paginationWindow = Array.from({ length: Math.min(5, pagination.totalPages) }, (_, index) => {
    const start = Math.max(1, Math.min(pagination.page - 2, pagination.totalPages - 4));
    return start + index;
  }).filter((value) => value >= 1 && value <= pagination.totalPages);

  return (
    <div className="mx-auto max-w-[1680px] space-y-6 pb-8">
      {loadError ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700">
          <Icon path={ICON.alertTriangle} className="h-4 w-4 shrink-0" />
          No se pudo conectar a la base de datos. Los datos mostrados pueden estar incompletos.
        </div>
      ) : null}

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="grid size-12 place-items-center rounded-xl bg-blue-100 text-blue-600 shadow-sm">
            <Icon path={ICON.shield} className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Auditoría</h1>
            <p className="mt-0.5 text-xs text-slate-500">Supervisa la actividad, seguridad y cumplimiento de ColdPower.</p>
          </div>
        </div>

        <form method="get" action="/admin/auditoria" className="flex flex-wrap items-center gap-2">
          <label className="flex min-w-[104px] flex-col rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-left shadow-sm hover:bg-slate-50">
            <span className="text-[9px] font-semibold leading-tight text-slate-400">Desde</span>
            <input name="dateFrom" type="date" defaultValue={filters.dateFrom ?? ""} className="w-full border-0 bg-transparent p-0 text-xs font-medium text-slate-700 focus:outline-none focus:ring-0" />
          </label>
          <label className="flex min-w-[104px] flex-col rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-left shadow-sm hover:bg-slate-50">
            <span className="text-[9px] font-semibold leading-tight text-slate-400">Hasta</span>
            <input name="dateTo" type="date" defaultValue={filters.dateTo ?? ""} className="w-full border-0 bg-transparent p-0 text-xs font-medium text-slate-700 focus:outline-none focus:ring-0" />
          </label>
          <FilterDropdown label="Módulo" paramName="module" value={filters.module} currentQuery={baseQuery} options={[{ value: "", label: "Todos" }, ...facets.modules]} />
          <FilterDropdown label="Severidad" paramName="severity" value={filters.severity} currentQuery={baseQuery} options={[{ value: "", label: "Todas" }, ...facets.severities.map((value) => ({ value, label: severityMeta[value]?.label ?? value }))]} />
          <a href={exportHref} download className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
            <Icon path={ICON.download} className="size-3.5 text-slate-500" /> Exportar
          </a>
          <SavedFiltersMenu savedFilters={savedFilters} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50" />
          <button type="submit" className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700">
            <Icon path={ICON.shield} className="size-3.5" /> Aplicar filtros
          </button>
        </form>
      </header>

      <section className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {kpiMeta.map((meta) => {
          const kpi = metrics[meta.key];
          const delta = deltaDisplay(meta.key, kpi);
          return (
            <article key={meta.key} className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm">
              <div className="flex items-start gap-2.5">
                <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${meta.iconBg} ${meta.iconInk}`}>
                  <Icon path={meta.iconPath} className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-500">{meta.label}</p>
                  <h2 className="mt-0.5 text-lg font-bold leading-tight text-slate-900">{kpi.current.toLocaleString("es-PE")}</h2>
                </div>
              </div>
              <div className="mt-3">
                {kpi.deltaPct === null ? <p className="text-[10px] font-normal text-slate-400">Sin datos previos</p> : <p className={`flex items-center gap-1 text-[11px] font-semibold ${delta.color}`}><Icon path={kpi.deltaPct >= 0 ? ICON.arrowUp : ICON.arrowDown} className="size-3" /><span>{Math.abs(kpi.deltaPct)}%</span><span className="ml-0.5 text-[10px] font-normal text-slate-400">vs. periodo anterior</span></p>}
                <AdminSparkline tone={meta.sparkTone} data={trendSeries(trend, meta.key)} ariaLabel={`Tendencia de ${meta.label.toLowerCase()}`} className="mt-1 block h-6 w-full" />
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.85fr)]">
        <article className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Eventos y actividad</h2>
              <p className="mt-1 text-[10px] text-slate-400">Comparación con el periodo anterior.</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-medium text-slate-500">
              <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-blue-600" />Eventos</span>
              <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-slate-300" />Periodo anterior</span>
            </div>
          </div>
          <div className="mt-4 h-[245px]">
            <AdminLineChart data={trend.map((point) => point.total)} previous={trendPrevious} labels={trend.map((point) => dayLabelFormat.format(new Date(`${point.date}T00:00:00`)).replace(".", ""))} comparison filled largeLabels accent="blue" ariaLabel="Eventos de auditoría durante el periodo" />
          </div>
        </article>

        <article className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">Actividad por módulo</h2>
          <p className="mt-1 text-[10px] text-slate-400">Distribución de los eventos visibles.</p>
          {modules.length ? (
            <div className="mt-7 space-y-4">
              {modules.map(([module, count], index) => (
                <div key={module} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5">
                  <span className="truncate text-[11px] font-medium text-slate-600">{module}</span>
                  <span className="text-[11px] font-bold text-slate-800">{count}</span>
                  <span className="col-span-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <i className={["block h-full rounded-full bg-blue-600", "block h-full rounded-full bg-emerald-500", "block h-full rounded-full bg-orange-500", "block h-full rounded-full bg-violet-500", "block h-full rounded-full bg-pink-500", "block h-full rounded-full bg-slate-400"][index]} style={{ width: `${(count / modulePeak) * 100}%` }} />
                  </span>
                </div>
              ))}
            </div>
          ) : <p className="grid h-[210px] place-items-center text-center text-xs text-slate-400">Sin eventos para distribuir.</p>}
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-12">
        <article className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm xl:col-span-6">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Registro de auditoría</h2>
              <p className="mt-1 text-[10px] text-slate-400">{pagination.totalItems.toLocaleString("es-PE")} eventos encontrados.</p>
            </div>
            <a href={exportHref} download className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"><Icon path={ICON.download} className="size-3" /> Exportar</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[570px] text-left text-[11px]">
              <thead className="border-y border-slate-100 bg-slate-50/80 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                <tr><th className="px-4 py-3">Fecha</th><th className="px-3 py-3">Actor</th><th className="px-3 py-3">Acción</th><th className="px-3 py-3">Módulo</th><th className="px-4 py-3 text-right">Estado</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {rows.length ? rows.map((row) => {
                  const failed = isFailedAction(row.action);
                  return <tr key={row.id} className="hover:bg-slate-50/70"><td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">{formatDateTime(row.createdAt)}</td><td className="max-w-[130px] truncate px-3 py-3">{row.actorName ?? row.actorId ?? "Sistema"}</td><td className="max-w-[180px] truncate px-3 py-3 font-medium text-slate-800">{actionLabel(row.action)}</td><td className="px-3 py-3">{row.moduleLabel}</td><td className={`px-4 py-3 text-right font-semibold ${failed ? "text-rose-600" : "text-emerald-600"}`}>{failed ? "Fallido" : "Exitoso"}</td></tr>;
                }) : <tr><td colSpan={5} className="px-4 py-10 text-center text-xs text-slate-400">No hay eventos de auditoría para estos filtros.</td></tr>}
              </tbody>
            </table>
          </div>
          {pagination.totalPages > 1 ? <div className="flex items-center justify-end gap-1 border-t border-slate-100 px-4 py-3 text-xs">{paginationWindow.map((page) => <Link key={page} href={`/admin/auditoria?${withParam(baseQuery, { page: String(page) })}`} className={page === pagination.page ? "grid size-6 place-items-center rounded border border-blue-200 bg-blue-50 font-semibold text-blue-600" : "grid size-6 place-items-center rounded text-slate-500 hover:bg-slate-100"}>{page}</Link>)}</div> : null}
        </article>

        <article className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm xl:col-span-3">
          <h2 className="text-sm font-bold text-slate-900">Eventos recientes</h2>
          <p className="mt-1 border-b border-slate-100 pb-3 text-[10px] text-slate-400">Actividad registrada en el periodo.</p>
          <div className="mt-2 divide-y divide-slate-100">
            {topRows.length ? topRows.map((row, index) => <Link key={row.id} href={`/admin/auditoria?${withParam(baseQuery, { eventId: row.id, tab: undefined })}`} className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2 py-3 text-[10px] hover:bg-slate-50"><span className="font-semibold text-slate-400">{index + 1}</span><span className="min-w-0"><span className="block truncate font-medium text-slate-800">{actionLabel(row.action)}</span><span className="block truncate text-slate-400">{row.moduleLabel}</span></span><span className="text-slate-400">{dayLabelFormat.format(row.createdAt).replace(".", "")}</span></Link>) : <p className="py-6 text-center text-xs text-slate-400">Sin actividad reciente.</p>}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm xl:col-span-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3"><h2 className="text-sm font-bold text-slate-900">Alertas y cumplimiento</h2><Icon path={ICON.info} className="size-4 text-slate-400" /></div>
          <div className="mt-4 space-y-4">
            {alerts.length ? alerts.slice(0, 4).map((alert) => { const meta = alertTone[alert.tone]; return <div key={alert.title} className="flex items-start gap-3"><span className={`grid size-7 shrink-0 place-items-center rounded-full ${meta.iconBg} ${meta.iconInk}`}><Icon path={meta.icon} className="size-3.5" /></span><div><p className="text-[11px] font-bold text-slate-900">{alert.title}</p><p className="mt-0.5 text-[10px] leading-snug text-slate-500">{alert.description}</p></div></div>; }) : <p className="py-6 text-center text-xs text-slate-400">Sin alertas activas.</p>}
          </div>
        </article>
      </section>

      {selected ? <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-sm font-bold text-slate-900">Detalle del evento</h2><p className="mt-1 text-xs text-slate-500">{actionLabel(selected.action)} · {formatDateTime(selected.createdAt)}</p></div><Link href={`/admin/auditoria?${withParam(baseQuery, { eventId: undefined, tab: undefined })}`} className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Cerrar</Link></div><div className="mt-4 grid gap-3 text-xs sm:grid-cols-3"><p><span className="text-slate-400">Actor</span><br /><span className="font-medium text-slate-800">{selected.actorName ?? selected.actorId ?? "Sistema"}</span></p><p><span className="text-slate-400">Módulo</span><br /><span className="font-medium text-slate-800">{selected.moduleLabel}</span></p><p><span className="text-slate-400">Objeto</span><br /><span className="font-medium text-slate-800">{entityLabel(selected.entityType)}</span></p></div></section> : null}
    </div>
  );
}

/* eslint-enable @typescript-eslint/no-unused-vars */
function RestrictedNotice() {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3.5 text-[11px] text-slate-500">
      <Icon path={ICON.lock} className="h-4 w-4 shrink-0 text-slate-400" />
      <span>Contenido sensible — tu rol no tiene el permiso <span className="font-mono">audit.sensitive.view</span> para verlo.</span>
    </div>
  );
}
