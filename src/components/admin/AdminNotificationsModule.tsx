import type { ReactNode } from "react";
import { NotificationDetail } from "@/components/admin/AdminNotificationDetail";
import { NotificationAdminControls } from "@/components/admin/NotificationAdminControls";
import { NotificationRuleToggle } from "@/components/admin/NotificationRuleToggle";
import type {
  getNotificationDetail,
  listNotificationRules,
  listNotificationSchedules,
  listNotificationTemplates,
  NotificationAutomationMetrics,
} from "@/lib/notification-rules-service";
import type { PeriodKpi } from "@/lib/period-metrics";

type Rule = Awaited<ReturnType<typeof listNotificationRules>>[number];
type Template = Awaited<ReturnType<typeof listNotificationTemplates>>[number];
type Schedule = Awaited<ReturnType<typeof listNotificationSchedules>>[number];
type Detail = Awaited<ReturnType<typeof getNotificationDetail>>;

function Icon({ path, className }: { path: string; className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
    </svg>
  );
}

const ICON = {
  bell: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  gear: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
  send: "M12 19l9 2-9-18-9 18 9-2zm0 0v-8",
  alertTriangle: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  checkCircle: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  doc: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  chevronRight: "M9 5l7 7-7 7",
} as const;

const severityMeta: Record<string, { iconBg: string; iconInk: string; iconPath: string }> = {
  CRITICAL: { iconBg: "bg-rose-50", iconInk: "text-rose-500", iconPath: ICON.alertTriangle },
  WARNING: { iconBg: "bg-amber-50", iconInk: "text-amber-500", iconPath: ICON.clock },
  INFO: { iconBg: "bg-emerald-50", iconInk: "text-emerald-500", iconPath: ICON.checkCircle },
};

function deltaDisplay(key: string, kpi: PeriodKpi) {
  const badWhenUp = new Set(["unread", "failed", "slaAlerts"]);
  if (kpi.deltaPct === null) return { text: "Sin datos del período anterior", color: "text-slate-400" };
  const arrow = kpi.deltaPct > 0 ? "↗" : kpi.deltaPct < 0 ? "↘" : "→";
  const text = `${arrow} ${Math.abs(kpi.deltaPct)}% vs. período anterior`;
  const color = kpi.deltaPct === 0 ? "text-slate-400" : badWhenUp.has(key) ? (kpi.deltaPct > 0 ? "text-rose-600" : "text-emerald-600") : "text-emerald-600";
  return { text, color };
}

export type AdminNotificationsModuleProps = {
  loadError: boolean;
  canManage: boolean;
  personalUnread: PeriodKpi;
  automation: NotificationAutomationMetrics;
  inboxSlot: ReactNode;
  detail: Detail;
  rules: Rule[];
  templates: Template[];
  schedules: Schedule[];
};

export function NotificationsModule({ loadError, canManage, personalUnread, automation, inboxSlot, detail, rules, templates, schedules }: AdminNotificationsModuleProps) {
  const kpis: Array<{ key: string; label: string; kpi: PeriodKpi; iconBg: string; iconInk: string; iconPath: string }> = [
    { key: "unread", label: "No leídas", kpi: personalUnread, iconBg: "bg-blue-50", iconInk: "text-blue-600", iconPath: ICON.bell },
    { key: "activeRules", label: "Automatizaciones activas", kpi: automation.activeRules, iconBg: "bg-emerald-50", iconInk: "text-emerald-600", iconPath: ICON.gear },
    { key: "failed", label: "Fallidas", kpi: automation.failed, iconBg: "bg-rose-50", iconInk: "text-rose-600", iconPath: ICON.alertTriangle },
    { key: "slaAlerts", label: "Alertas SLA", kpi: automation.slaAlerts, iconBg: "bg-amber-50", iconInk: "text-amber-600", iconPath: ICON.clock },
    { key: "remindersToday", label: "Recordatorios hoy", kpi: automation.remindersToday, iconBg: "bg-purple-50", iconInk: "text-purple-600", iconPath: ICON.calendar },
    { key: "scheduled", label: "En cola", kpi: automation.scheduled, iconBg: "bg-sky-50", iconInk: "text-sky-600", iconPath: ICON.send },
  ];

  const delivery = automation.delivery;
  const deliveryTotal = Math.max(1, delivery.entregadas + delivery.enCola + delivery.fallidas + delivery.pendientes + delivery.noLeidas);
  const deliveryRows = [
    { label: "Entregadas (30d)", value: delivery.entregadas, dot: "bg-emerald-500", hex: "#10b981" },
    { label: "En cola", value: delivery.enCola, dot: "bg-blue-500", hex: "#3b82f6" },
    { label: "Fallidas (30d)", value: delivery.fallidas, dot: "bg-rose-500", hex: "#f43f5e" },
    { label: "Pendientes", value: delivery.pendientes, dot: "bg-amber-500", hex: "#f59e0b" },
    { label: "No leídas", value: delivery.noLeidas, dot: "bg-purple-500", hex: "#a855f7" },
  ];
  let cursor = 0;
  const donutSegments = deliveryRows.map((row) => {
    const start = cursor;
    cursor += row.value;
    return { ...row, dasharray: `${(row.value / deliveryTotal) * 87.96} 87.96`, offset: `${-(start / deliveryTotal) * 87.96}` };
  });

  return (
    <div className="space-y-6">
      {loadError ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700">
          <Icon path={ICON.alertTriangle} className="h-4 w-4 shrink-0" />
          No se pudo conectar a la base de datos. Los datos mostrados pueden estar incompletos.
        </div>
      ) : null}

      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 shadow-xs">
            <Icon path={ICON.bell} className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-900">Notificaciones internas</h1>
            <p className="text-xs font-normal text-slate-500">Centraliza las comunicaciones, alertas y recordatorios del equipo.</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((item) => {
          const delta = deltaDisplay(item.key, item.kpi);
          return (
            <div key={item.key} className="flex items-center gap-3.5 rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${item.iconBg} ${item.iconInk}`}>
                <Icon path={item.iconPath} className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-[11.5px] font-medium text-slate-500">{item.label}</span>
                <span className="text-xl font-bold leading-snug text-slate-900">{item.kpi.current.toLocaleString("es-PE")}</span>
                <div className={`mt-0.5 flex items-center gap-0.5 text-[10.5px] font-semibold ${delta.color}`}>{delta.text}</div>
              </div>
            </div>
          );
        })}
      </section>

      <div className="grid grid-cols-12 items-start gap-5">
        <div className="col-span-12 lg:col-span-5">{inboxSlot}</div>

        <div className="col-span-12 lg:col-span-4">
          <NotificationDetail detail={detail} />
        </div>

        <section className="col-span-12 flex flex-col justify-between gap-4 lg:col-span-3">
          <div className="flex flex-1 flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                <h3 className="text-xs font-bold tracking-tight text-slate-900">Reglas de automatización</h3>
              </div>
              <span className="text-[11px] text-slate-400">{rules.length}</span>
            </div>
            {rules.length ? (
              <div className="space-y-2">
                {rules.slice(0, 6).map((rule) => {
                  const meta = severityMeta[rule.severity] ?? severityMeta.INFO;
                  return (
                    <div key={rule.id} className="flex items-center justify-between gap-2.5 rounded-lg border border-slate-100 bg-slate-50/70 p-2 transition-all hover:border-slate-200 hover:bg-slate-100/70">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${meta.iconBg} ${meta.iconInk} border-transparent`}>
                          <Icon path={meta.iconPath} className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 truncate">
                          <h4 className="truncate text-[11.5px] font-bold leading-tight text-slate-800">{rule.name}</h4>
                          <p className="mt-1 truncate text-[10px] leading-none text-slate-400">{rule.eventType}</p>
                        </div>
                      </div>
                      {canManage ? <NotificationRuleToggle rule={rule} /> : <span className="text-[10px] font-semibold text-slate-400">{rule.status === "ACTIVE" ? "Activa" : "Inactiva"}</span>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-[11px] text-slate-400">Sin reglas configuradas.</p>
            )}
          </div>

          <div className="flex flex-1 flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="mb-1 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold tracking-tight text-slate-900">Estado de entrega</h3>
                <p className="text-[10.5px] font-normal text-slate-400">Entregadas/fallidas: últimos 30 días · resto: ahora</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="relative my-0.5 flex h-28 w-28 shrink-0 items-center justify-center">
                <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" fill="none" r="14" stroke="#f1f5f9" strokeWidth={4} />
                  {donutSegments.map((segment) => (
                    <circle key={segment.label} cx="18" cy="18" fill="none" r="14" stroke={segment.hex} strokeDasharray={segment.dasharray} strokeDashoffset={segment.offset} strokeWidth={4} />
                  ))}
                </svg>
                <div className="absolute flex select-none flex-col items-center justify-center text-center">
                  <span className="text-lg font-extrabold leading-none tracking-tight text-slate-900">{deliveryTotal}</span>
                  <span className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-slate-400">Total</span>
                </div>
              </div>
              <div className="w-full space-y-1.5 divide-y divide-slate-100/80 text-xs">
                {deliveryRows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between pt-1">
                    <div className="flex min-w-0 items-center gap-1.5 truncate">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${row.dot}`} />
                      <span className="truncate text-[11.5px] font-medium text-slate-700">{row.label}</span>
                    </div>
                    <span className="shrink-0 text-[11.5px] font-bold text-slate-900">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-purple-500" />
                <h3 className="text-xs font-bold tracking-tight text-slate-900">Plantillas de mensajes</h3>
              </div>
              <span className="text-[11px] text-slate-400">{templates.length}</span>
            </div>
            {templates.length ? (
              <div className="space-y-1.5">
                {templates.slice(0, 5).map((template) => (
                  <div key={template.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-transparent bg-purple-50 text-purple-500">
                        <Icon path={ICON.doc} className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 truncate">
                        <h4 className="truncate text-[11.5px] font-bold leading-tight text-slate-800">{template.name}</h4>
                        <p className="mt-0.5 truncate text-[10px] leading-none text-slate-400">{template.enabled ? "Habilitada" : "Deshabilitada"}</p>
                      </div>
                    </div>
                    <Icon path={ICON.chevronRight} className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-[11px] text-slate-400">Sin plantillas creadas.</p>
            )}
          </div>
        </section>
      </div>

      {canManage ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <h3 className="mb-3 text-xs font-bold tracking-tight text-slate-900">Gestión: avisos, plantillas, reglas y programaciones</h3>
          <NotificationAdminControls templates={templates} rules={rules} schedules={schedules} />
        </section>
      ) : null}
    </div>
  );
}
