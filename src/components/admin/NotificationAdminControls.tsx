"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

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

const field =
  "h-9 w-full rounded-lg border border-[#dce6ee] bg-white px-3 text-[11px] text-[#304b66] outline-none focus:border-[#2277ee] focus:ring-2 focus:ring-[#dcecff]";
const button =
  "rounded-full bg-[#102a43] px-3 py-2 text-[10px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50";

function RolePicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#8195aa]">
        Destinatarios por rol
      </legend>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {roleOptions.map(([role, label]) => (
          <label
            key={role}
            className="flex items-center gap-1.5 text-[10px] font-semibold text-[#526b84]"
          >
            <input
              type="checkbox"
              checked={value.includes(role)}
              onChange={(event) =>
                onChange(
                  event.target.checked ? [...value, role] : value.filter((item) => item !== role),
                )
              }
            />
            {label}
          </label>
        ))}
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
    <div className="grid gap-3 xl:grid-cols-2">
      <details open className="rounded-xl border border-[#e2eaf1] bg-white p-4">
        <summary className="cursor-pointer text-[12px] font-black text-[#102a43]">
          Nuevo aviso interno
        </summary>
        <form
          className="mt-4 space-y-3"
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
          <input required name="title" aria-label="Título del aviso" className={field} placeholder="Título del aviso" />
          <textarea
            required
            name="body"
            aria-label="Mensaje interno"
            rows={3}
            className={`${field} h-auto py-2`}
            placeholder="Mensaje interno"
          />
          <input name="link" aria-label="Enlace interno opcional" className={field} placeholder="Enlace interno (opcional)" />
          <RolePicker
            value={manualRoles}
            onChange={(next) => {
              setManualRoles(next);
              void previewRecipients(next, "manual");
            }}
          />
          <p className="text-[10px] font-semibold text-[#71869c]">
            Destinatarios activos: {recipientCounts.manual}
          </p>
          <button
            className={button}
            disabled={busy || !manualRoles.length || recipientCounts.manual === 0}
          >
            Enviar aviso
          </button>
        </form>
      </details>

      <details open className="rounded-xl border border-[#e2eaf1] bg-white p-4">
        <summary className="cursor-pointer text-[12px] font-black text-[#102a43]">
          Plantilla de notificación
        </summary>
        <form
          className="mt-4 space-y-3"
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
          <input required name="name" aria-label="Nombre de plantilla" className={field} placeholder="Nombre de plantilla" />
          <input
            required
            name="titleTemplate"
            aria-label="Título de la plantilla"
            className={field}
            placeholder="Título · ejemplo: Pago {{entity.code}}"
          />
          <textarea
            required
            name="bodyTemplate"
            aria-label="Cuerpo de la plantilla"
            rows={3}
            className={`${field} h-auto py-2`}
            placeholder="Cuerpo · variables permitidas {{entity.status}}"
          />
          <input
            name="linkTemplate"
            aria-label="Ruta interna de la plantilla"
            className={field}
            placeholder="Ruta interna, por ejemplo /admin/pedidos"
          />
          <button className={button} disabled={busy}>
            Guardar plantilla
          </button>
        </form>
        {templates.length ? (
          <p className="mt-3 text-[10px] font-semibold text-[#71869c]">
            {templates.length} plantillas persistidas.
          </p>
        ) : null}
      </details>

      <details className="rounded-xl border border-[#e2eaf1] bg-white p-4">
        <summary className="cursor-pointer text-[12px] font-black text-[#102a43]">
          Crear regla declarativa
        </summary>
        <form
          className="mt-4 space-y-3"
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
          <input required name="name" aria-label="Nombre de la regla" className={field} placeholder="Nombre de la regla" />
          <div className="grid grid-cols-2 gap-2">
            <select name="eventType" aria-label="Evento que activa la regla" className={field}>
              {eventTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
            <select name="severity" aria-label="Severidad de la regla" className={field}>
              <option>INFO</option>
              <option>WARNING</option>
              <option>CRITICAL</option>
            </select>
          </div>
          <select name="templateId" aria-label="Plantilla de la regla" className={field}>
            <option value="">Sin plantilla</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <select name="conditionField" aria-label="Campo de condición" className={field}>
              <option value="entity.status">Estado de entidad</option>
              <option value="entity.amount">Importe</option>
              <option value="entity.ageDays">Antigüedad</option>
              <option value="inventory.available">Stock disponible</option>
              <option value="payment.difference">Diferencia de pago</option>
            </select>
            <select name="conditionOperator" aria-label="Operador de condición" className={field}>
              <option value="eq">es igual a</option>
              <option value="neq">es distinto de</option>
              <option value="gt">mayor que</option>
              <option value="lt">menor que</option>
            </select>
          </div>
          <input
            required
            name="conditionValue"
            aria-label="Valor de condición"
            className={field}
            placeholder="Valor de condición"
          />
          <input
            name="cooldownSeconds"
            aria-label="Cooldown en segundos opcional"
            type="number"
            min="0"
            step="1"
            className={field}
            placeholder="Cooldown en segundos (opcional)"
          />
          <RolePicker
            value={ruleRoles}
            onChange={(next) => {
              setRuleRoles(next);
              void previewRecipients(next, "rule");
            }}
          />
          <label className="flex items-center gap-2 text-[10px] font-semibold text-[#526b84]">
            <input type="checkbox" name="assigneeAudience" /> Incluir responsable de la entidad
          </label>
          <button
            className={button}
            disabled={busy || !ruleRoles.length || recipientCounts.rule === 0}
          >
            Guardar regla
          </button>
        </form>
        {rules.length ? (
          <p className="mt-3 text-[10px] font-semibold text-[#71869c]">
            {rules.length} reglas persistidas.
          </p>
        ) : null}
      </details>

      <details className="rounded-xl border border-[#e2eaf1] bg-white p-4">
        <summary className="cursor-pointer text-[12px] font-black text-[#102a43]">
          Programar aviso
        </summary>
        <form
          className="mt-4 space-y-3"
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
          <input required name="title" aria-label="Título programado" className={field} placeholder="Título programado" />
          <textarea
            required
            name="body"
            aria-label="Mensaje programado"
            rows={2}
            className={`${field} h-auto py-2`}
            placeholder="Mensaje programado"
          />
          <div className="grid grid-cols-2 gap-2">
            <input required name="scheduledAt" aria-label="Fecha y hora programadas" type="datetime-local" className={field} />
            <input name="link" aria-label="Enlace programado opcional" className={field} placeholder="Enlace (opcional)" />
          </div>
          <RolePicker
            value={scheduleRoles}
            onChange={(next) => {
              setScheduleRoles(next);
              void previewRecipients(next, "schedule");
            }}
          />
          <p className="text-[10px] font-semibold text-[#71869c]">
            Destinatarios activos: {recipientCounts.schedule}
          </p>
          <button
            className={button}
            disabled={busy || !scheduleRoles.length || recipientCounts.schedule === 0}
          >
            Programar aviso
          </button>
        </form>
        {schedules.length ? (
          <div className="mt-3 space-y-1.5">
            {schedules.slice(0, 4).map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-center justify-between gap-2 text-[10px] font-semibold text-[#71869c]"
              >
                <span className="truncate">{schedule.title}</span>
                <span className="flex shrink-0 items-center gap-2">
                  {new Date(schedule.scheduledAt).toLocaleString("es-PE")} · {schedule.status}
                  {schedule.status === "SCHEDULED" ? (
                    <button
                      type="button"
                      onClick={() => void cancelSchedule(schedule.id)}
                      disabled={busy}
                      className="font-extrabold text-[#c43333] disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </details>

      {message ? (
        <p role="status" className="xl:col-span-2 text-[10px] font-bold text-[#526b84]">
          {message}
        </p>
      ) : null}
    </div>
  );
}
