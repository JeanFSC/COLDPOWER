import Link from "next/link";
import { MarkAsReadButton } from "@/components/admin/NotificationDetailActions";
import { priorityOf } from "@/lib/notifications-service";
import { notificationBodyLabel, notificationEventLabel } from "@/lib/notification-display";
import type { getNotificationDetail } from "@/lib/notification-rules-service";

type Detail = NonNullable<Awaited<ReturnType<typeof getNotificationDetail>>>;

function Icon({ path, className }: { path: string; className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
    </svg>
  );
}

const ICON = {
  bell: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  users: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  link: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
} as const;

const priorityHero: Record<string, { border: string; bg: string; iconBg: string; iconInk: string }> = {
  Alta: { border: "border-rose-100", bg: "bg-rose-50/60", iconBg: "bg-rose-50", iconInk: "text-rose-500" },
  Media: { border: "border-amber-100", bg: "bg-amber-50/60", iconBg: "bg-amber-50", iconInk: "text-amber-500" },
  Baja: { border: "border-emerald-100", bg: "bg-emerald-50/60", iconBg: "bg-emerald-50", iconInk: "text-emerald-500" },
};
const stateClasses: Record<string, string> = {
  UNREAD: "bg-amber-50 text-amber-600 border-amber-100",
  READ: "bg-emerald-50 text-emerald-600 border-emerald-100",
  DISMISSED: "bg-slate-100 text-slate-500 border-slate-200",
};
const stateLabel: Record<string, string> = { UNREAD: "No leído", READ: "Leído", DISMISSED: "Descartado" };
const originLabel: Record<Detail["originKind"], string> = {
  rule: "Generada por regla automática",
  schedule: "Generada por aviso programado",
  manual: "Generada por aviso manual",
  event: "Generada por evento del sistema",
};

function initialsOf(name: string | null, fallback: string) {
  const source = (name ?? fallback).trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return source.slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
const dateTimeFormat = new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
function formatDateTime(value: Date | string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormat.format(date).replace(".", "");
}

export function NotificationDetail({ detail }: { detail: Detail | null }) {
  if (!detail) {
    return (
      <aside className="flex min-h-[180px] h-fit flex-col items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white p-6 text-center shadow-2xs">
        <Icon path={ICON.bell} className="h-8 w-8 text-slate-300" />
        <p className="text-xs font-semibold text-slate-500">Selecciona una notificación</p>
        <p className="text-[11px] text-slate-400">Elige un elemento de la bandeja para ver su detalle completo.</p>
      </aside>
    );
  }

  const { notification, recipients, origin, originKind } = detail;
  const priority = priorityOf({ type: notification.type, metadata: notification.metadata as Record<string, unknown> | null });
  const hero = priorityHero[priority];

  const events: Array<{ label: string; time: Date; detail?: string }> = [];
  events.push({ label: originLabel[originKind], time: origin?.createdAt ?? notification.createdAt, detail: origin ? undefined : "Sin registro de auditoría asociado" });
  for (const recipient of recipients) {
    if (recipient.readAt) events.push({ label: `Leída por ${recipient.name ?? recipient.recipientId}`, time: new Date(recipient.readAt) });
    if (recipient.dismissedAt) events.push({ label: `Descartada por ${recipient.name ?? recipient.recipientId}`, time: new Date(recipient.dismissedAt) });
  }
  events.sort((a, b) => a.time.getTime() - b.time.getTime());

  return (
    <aside className="flex flex-col space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-[15px] font-bold leading-tight text-slate-900">Detalle de notificación</h2>
          <span className="mt-0.5 block text-[11px] text-slate-400">ID: {notification.id}</span>
        </div>
        <MarkAsReadButton id={notification.id} isUnread={notification.state === "UNREAD"} />
      </div>

      <div className={`rounded-xl border p-3.5 ${hero.border} ${hero.bg}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${hero.iconBg} ${hero.iconInk}`}>
              <Icon path={ICON.bell} className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[13.5px] font-bold leading-tight text-slate-900">{notification.title}</h3>
              <p className="mt-0.5 text-[11px] text-slate-500">{formatDateTime(notification.createdAt)}</p>
            </div>
          </div>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${stateClasses[notification.state]}`}>{priority}</span>
        </div>
        <p className="mt-2.5 rounded-lg border border-white/60 bg-white/80 p-2.5 text-xs leading-relaxed text-slate-700">{notificationBodyLabel(notification.body)}</p>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
        <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-700">Detalles</span>
          <span className={`rounded border px-2 py-0.5 text-[10.5px] font-medium ${stateClasses[notification.state]}`}>{stateLabel[notification.state]}</span>
        </div>
        <div className="space-y-2 divide-y divide-slate-100 text-xs">
          <div className="flex items-center justify-between pt-1.5">
            <span className="font-normal text-slate-400">Tipo</span>
            <span className="text-[11.5px] font-medium text-slate-700" title={`Código interno: ${notification.type}`}>{notificationEventLabel(notification.type)}</span>
          </div>
          <div className="flex items-center justify-between pt-1.5">
            <span className="font-normal text-slate-400">Canal</span>
            <span className="text-[11.5px] font-medium text-slate-700">In-App</span>
          </div>
          {notification.link ? (
            <div className="flex items-center justify-between pt-1.5">
              <span className="font-normal text-slate-400">Origen</span>
              <Link href={notification.link} className="flex items-center gap-1 text-[11.5px] font-medium text-blue-600 hover:underline">
                <Icon path={ICON.link} className="h-3 w-3" />
                Ver origen
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex-1 space-y-4 border-t border-slate-100 pt-3">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Icon path={ICON.clock} className="h-3.5 w-3.5 text-blue-600" />
              Trazabilidad del evento
            </h4>
            <span className="text-[10px] font-medium text-slate-400">{events.length} registros</span>
          </div>
          <div className="relative space-y-3 pl-5 before:absolute before:bottom-2 before:left-2 before:top-2 before:w-0.5 before:bg-slate-200">
            {events.map((event, index) => (
              <div key={`${event.label}-${index}`} className="relative">
                <span className="absolute -left-5 top-1 h-2.5 w-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold leading-tight text-slate-800">{event.label}</p>
                  <span className="text-[10px] text-slate-400">{formatDateTime(event.time)}</span>
                </div>
                {event.detail ? <p className="mt-0.5 text-[11px] text-slate-500">{event.detail}</p> : null}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2 border-t border-slate-100 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Icon path={ICON.users} className="h-3.5 w-3.5 text-slate-500" />
              Destinatarios y estado
            </h4>
            <span className="text-[10px] font-medium text-slate-400">{recipients.length} asignado(s)</span>
          </div>
          <div className="space-y-1.5">
            {recipients.map((recipient) => (
              <div key={recipient.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 p-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">{initialsOf(recipient.name, recipient.recipientId)}</div>
                  <div className="min-w-0">
                    <p className="truncate text-[11.5px] font-semibold leading-tight text-slate-800">{recipient.name ?? recipient.recipientId}</p>
                    <p className="mt-0.5 truncate text-[10px] leading-none text-slate-400">{recipient.email ?? "—"}</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-semibold ${stateClasses[recipient.state]}`}>{stateLabel[recipient.state]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
