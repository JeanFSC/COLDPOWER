"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

const roleOptions = [
  ["SUPERADMIN", "Superadmin"],
  ["GERENCIA", "Gerencia"],
  ["OPERACIONES_VENTAS", "Operaciones y ventas"],
  ["JEFATURA", "Jefatura"],
  ["VENTAS", "Ventas"],
  ["ALMACEN", "Almacén"],
  ["COMPRAS", "Compras"],
  ["REPORTES", "Reportes"],
] as const;

const eventTypes = [
  "QUOTE_CREATED",
  "LEAD_CREATED",
  "FOLLOW_UP_OVERDUE",
  "ORDER_CREATED",
  "ORDER_READY",
  "PAYMENT_APPROVED",
  "TRANSFER_APPROVAL_PENDING",
] as const;

type Template = {
  id: string;
  name: string;
  titleTemplate: string;
  bodyTemplate: string;
  linkTemplate: string | null;
};
type Rule = { id: string; name: string; eventType: string; status: string; severity: string };
type Schedule = {
  id: string;
  title: string;
  scheduledAt: string | Date;
  status: string;
  recipientUserIds: string[];
};

function Icon({ path, className }: { path: string; className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
    </svg>
  );
}

const ICON = {
  send: "M12 19l9 2-9-18-9 18 9-2zm0 0v-8",
  doc: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  gear: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
  calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  checkCircle: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
} as const;

const tabs = [
  { key: "aviso", label: "Nuevo aviso", iconPath: ICON.send, iconBg: "bg-blue-50", iconInk: "text-blue-600" },
  { key: "plantilla", label: "Plantilla", iconPath: ICON.doc, iconBg: "bg-purple-50", iconInk: "text-purple-500" },
  { key: "regla", label: "Regla declarativa", iconPath: ICON.gear, iconBg: "bg-emerald-50", iconInk: "text-emerald-600" },
  { key: "programar", label: "Programación", iconPath: ICON.calendar, iconBg: "bg-sky-50", iconInk: "text-sky-600" },
] as const;
type TabKey = (typeof tabs)[number]["key"];

const field =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";
const label = "mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400";
const primaryButton =
  "inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

function Field({ children, htmlFor, text }: { children: ReactNode; htmlFor?: string; text: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className={label}>
        {text}
      </label>
      {children}
    </div>
  );
}

function RolePicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  return (
    <fieldset>
      <legend className={label}>Destinatarios por rol</legend>
      <div className="flex flex-wrap gap-1.5">
        {roleOptions.map(([role, roleLabel]) => {
          const checked = value.includes(role);
          return (
            <label
              key={role}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10.5px] font-semibold transition-colors ${
                checked
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={(event) =>
                  onChange(
                    event.target.checked ? [...value, role] : value.filter((item) => item !== role),
                  )
                }
              />
              {roleLabel}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

async function send(path: string, body: unknown, method = "POST") {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: unknown };
  if (!response.ok)
    throw new Error(typeof payload.error === "string" ? payload.error : "No se pudo guardar.");
}

export function NotificationAdminControls({
  templates,
  rules,
  schedules,
}: {
  templates: Template[];
  rules: Rule[];
  schedules: Schedule[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("aviso");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [manualRoles, setManualRoles] = useState<string[]>([]);
  const [scheduleRoles, setScheduleRoles] = useState<string[]>([]);
  const [ruleRoles, setRuleRoles] = useState<string[]>([]);
  const [recipientCounts, setRecipientCounts] = useState({ manual: 0, schedule: 0, rule: 0 });

  async function previewRecipients(roles: string[], target: "manual" | "schedule" | "rule") {
    if (!roles.length) {
      setRecipientCounts((current) => ({ ...current, [target]: 0 }));
      return;
    }
    const response = await fetch("/api/admin/notificaciones/avisos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientRoles: roles, recipientUserIds: [] }),
    });
    const payload = (await response.json().catch(() => ({}))) as { count?: number };
    if (response.ok)
      setRecipientCounts((current) => ({ ...current, [target]: payload.count ?? 0 }));
  }

  async function submit(event: FormEvent<HTMLFormElement>, path: string, body: unknown) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setMessage(null);
    try {
      await send(path, body);
      form.reset();
      setManualRoles([]);
      setScheduleRoles([]);
      setRuleRoles([]);
      setRecipientCounts({ manual: 0, schedule: 0, rule: 0 });
      setMessage("Guardado en la base de datos.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelSchedule(scheduleId: string) {
    setBusy(true);
    setMessage(null);
    try {
      await send(
        `/api/admin/notificaciones/programadas/${encodeURIComponent(scheduleId)}`,
        { action: "cancel" },
        "PATCH",
      );
      setMessage("Programación cancelada.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cancelar la programación.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
        {tabs.map((item) => {
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11.5px] font-bold transition-colors ${
                active ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${active ? item.iconBg : "bg-transparent"} ${active ? item.iconInk : "text-slate-400"}`}>
                <Icon path={item.iconPath} className="h-3 w-3" />
              </span>
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200/90 bg-white p-4">
        {tab === "aviso" ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              const data = new FormData(event.currentTarget);
              void submit(event, "/api/admin/notificaciones/avisos", {
                title: data.get("title"),
                body: data.get("body"),
                link: data.get("link"),
                recipientRoles: manualRoles,
              });
            }}
          >
            <Field text="Título del aviso">
              <input required name="title" aria-label="Título del aviso" className={field} placeholder="Ej. Mantenimiento programado" />
            </Field>
            <Field text="Mensaje interno">
              <textarea
                required
                name="body"
                aria-label="Mensaje interno"
                rows={3}
                className={`${field} h-auto py-2`}
                placeholder="Describe el aviso para el equipo"
              />
            </Field>
            <Field text="Enlace interno (opcional)">
              <input name="link" aria-label="Enlace interno opcional" className={field} placeholder="/admin/pedidos/123" />
            </Field>
            <RolePicker
              value={manualRoles}
              onChange={(next) => {
                setManualRoles(next);
                void previewRecipients(next, "manual");
              }}
            />
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <p className="text-[10.5px] font-semibold text-slate-500">
                Destinatarios activos: <span className="font-bold text-slate-900">{recipientCounts.manual}</span>
              </p>
              <button
                className={primaryButton}
                disabled={busy || !manualRoles.length || recipientCounts.manual === 0}
              >
                <Icon path={ICON.send} className="h-3.5 w-3.5" />
                Enviar aviso
              </button>
            </div>
          </form>
        ) : null}

        {tab === "plantilla" ? (
          <div className="space-y-4">
            <form
              className="space-y-3"
              onSubmit={(event) => {
                const data = new FormData(event.currentTarget);
                void submit(event, "/api/admin/notificaciones/plantillas", {
                  name: data.get("name"),
                  titleTemplate: data.get("titleTemplate"),
                  bodyTemplate: data.get("bodyTemplate"),
                  linkTemplate: data.get("linkTemplate"),
                });
              }}
            >
              <Field text="Nombre de plantilla">
                <input required name="name" aria-label="Nombre de plantilla" className={field} placeholder="Ej. Pago aprobado" />
              </Field>
              <Field text="Título de la plantilla">
                <input
                  required
                  name="titleTemplate"
                  aria-label="Título de la plantilla"
                  className={field}
                  placeholder="Pago {{entity.code}}"
                />
              </Field>
              <Field text="Cuerpo de la plantilla">
                <textarea
                  required
                  name="bodyTemplate"
                  aria-label="Cuerpo de la plantilla"
                  rows={3}
                  className={`${field} h-auto py-2`}
                  placeholder="Variables permitidas: {{entity.status}}"
                />
              </Field>
              <Field text="Ruta interna (opcional)">
                <input
                  name="linkTemplate"
                  aria-label="Ruta interna de la plantilla"
                  className={field}
                  placeholder="/admin/pedidos"
                />
              </Field>
              <div className="flex justify-end border-t border-slate-100 pt-3">
                <button className={primaryButton} disabled={busy}>
                  <Icon path={ICON.checkCircle} className="h-3.5 w-3.5" />
                  Guardar plantilla
                </button>
              </div>
            </form>
            {templates.length ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-[10.5px] font-semibold text-slate-500">
                {templates.length} plantillas persistidas.
              </p>
            ) : null}
          </div>
        ) : null}

        {tab === "regla" ? (
          <div className="space-y-4">
            <form
              className="space-y-3"
              onSubmit={(event) => {
                const data = new FormData(event.currentTarget);
                void submit(event, "/api/admin/notificaciones/reglas", {
                  name: data.get("name"),
                  eventType: data.get("eventType"),
                  status: "ACTIVE",
                  severity: data.get("severity"),
                  audienceRoles: ruleRoles,
                  audienceUserIds: [],
                  assigneeAudience: data.get("assigneeAudience") === "on",
                  condition: {
                    field: data.get("conditionField"),
                    operator: data.get("conditionOperator"),
                    value: data.get("conditionValue"),
                  },
                  templateId: data.get("templateId") || null,
                  cooldownSeconds: Number(data.get("cooldownSeconds") || 0),
                });
              }}
            >
              <Field text="Nombre de la regla">
                <input required name="name" aria-label="Nombre de la regla" className={field} placeholder="Ej. Stock crítico" />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field text="Evento que activa la regla">
                  <select name="eventType" aria-label="Evento que activa la regla" className={field}>
                    {eventTypes.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </Field>
                <Field text="Severidad">
                  <select name="severity" aria-label="Severidad de la regla" className={field}>
                    <option>INFO</option>
                    <option>WARNING</option>
                    <option>CRITICAL</option>
                  </select>
                </Field>
              </div>
              <Field text="Plantilla asociada">
                <select name="templateId" aria-label="Plantilla de la regla" className={field}>
                  <option value="">Sin plantilla</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field text="Campo de condición">
                  <select name="conditionField" aria-label="Campo de condición" className={field}>
                    <option value="entity.status">Estado de entidad</option>
                    <option value="entity.amount">Importe</option>
                    <option value="entity.ageDays">Antigüedad</option>
                    <option value="inventory.available">Stock disponible</option>
                    <option value="payment.difference">Diferencia de pago</option>
                  </select>
                </Field>
                <Field text="Operador">
                  <select name="conditionOperator" aria-label="Operador de condición" className={field}>
                    <option value="eq">es igual a</option>
                    <option value="neq">es distinto de</option>
                    <option value="gt">mayor que</option>
                    <option value="lt">menor que</option>
                  </select>
                </Field>
              </div>
              <Field text="Valor de condición">
                <input
                  required
                  name="conditionValue"
                  aria-label="Valor de condición"
                  className={field}
                  placeholder="Ej. 5"
                />
              </Field>
              <Field text="Cooldown en segundos (opcional)">
                <input
                  name="cooldownSeconds"
                  aria-label="Cooldown en segundos opcional"
                  type="number"
                  min="0"
                  step="1"
                  className={field}
                  placeholder="0"
                />
              </Field>
              <RolePicker
                value={ruleRoles}
                onChange={(next) => {
                  setRuleRoles(next);
                  void previewRecipients(next, "rule");
                }}
              />
              <label className="flex items-center gap-2 text-[10.5px] font-semibold text-slate-600">
                <input type="checkbox" name="assigneeAudience" className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-100" /> Incluir responsable de la entidad
              </label>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <p className="text-[10.5px] font-semibold text-slate-500">
                  Destinatarios activos: <span className="font-bold text-slate-900">{recipientCounts.rule}</span>
                </p>
                <button
                  className={primaryButton}
                  disabled={busy || !ruleRoles.length || recipientCounts.rule === 0}
                >
                  <Icon path={ICON.checkCircle} className="h-3.5 w-3.5" />
                  Guardar regla
                </button>
              </div>
            </form>
            {rules.length ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-[10.5px] font-semibold text-slate-500">
                {rules.length} reglas persistidas.
              </p>
            ) : null}
          </div>
        ) : null}

        {tab === "programar" ? (
          <div className="space-y-4">
            <form
              className="space-y-3"
              onSubmit={(event) => {
                const data = new FormData(event.currentTarget);
                void submit(event, "/api/admin/notificaciones/programadas", {
                  title: data.get("title"),
                  body: data.get("body"),
                  link: data.get("link"),
                  scheduledAt: data.get("scheduledAt"),
                  recipientRoles: scheduleRoles,
                  recipientUserIds: [],
                  ruleId: null,
                  templateId: null,
                });
              }}
            >
              <Field text="Título programado">
                <input required name="title" aria-label="Título programado" className={field} placeholder="Ej. Recordatorio de cierre de mes" />
              </Field>
              <Field text="Mensaje programado">
                <textarea
                  required
                  name="body"
                  aria-label="Mensaje programado"
                  rows={2}
                  className={`${field} h-auto py-2`}
                  placeholder="Contenido del aviso"
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field text="Fecha y hora">
                  <input required name="scheduledAt" aria-label="Fecha y hora programadas" type="datetime-local" className={field} />
                </Field>
                <Field text="Enlace (opcional)">
                  <input name="link" aria-label="Enlace programado opcional" className={field} placeholder="/admin/reportes" />
                </Field>
              </div>
              <RolePicker
                value={scheduleRoles}
                onChange={(next) => {
                  setScheduleRoles(next);
                  void previewRecipients(next, "schedule");
                }}
              />
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <p className="text-[10.5px] font-semibold text-slate-500">
                  Destinatarios activos: <span className="font-bold text-slate-900">{recipientCounts.schedule}</span>
                </p>
                <button
                  className={primaryButton}
                  disabled={busy || !scheduleRoles.length || recipientCounts.schedule === 0}
                >
                  <Icon path={ICON.calendar} className="h-3.5 w-3.5" />
                  Programar aviso
                </button>
              </div>
            </form>
            {schedules.length ? (
              <div className="space-y-1.5 border-t border-slate-100 pt-3">
                {schedules.slice(0, 4).map((schedule) => (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/70 px-2.5 py-1.5"
                  >
                    <span className="truncate text-[11px] font-semibold text-slate-700">{schedule.title}</span>
                    <span className="flex shrink-0 items-center gap-2 text-[10.5px] font-medium text-slate-400">
                      {new Date(schedule.scheduledAt).toLocaleString("es-PE")} · {schedule.status}
                      {schedule.status === "SCHEDULED" ? (
                        <button
                          type="button"
                          onClick={() => void cancelSchedule(schedule.id)}
                          disabled={busy}
                          className="rounded border border-rose-200 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {message ? (
        <p role="status" className="mt-3 text-[10.5px] font-bold text-slate-500">
          {message}
        </p>
      ) : null}
    </div>
  );
}
