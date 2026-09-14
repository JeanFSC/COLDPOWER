"use client";

import { CalendarClock, CheckCircle2, Clock3, Plus, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import type { DashboardFilters } from "@/lib/dashboard-contract";

type ReportSchedule = {
  id: string;
  name: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  nextRunAt: string | Date;
  lastRunAt: string | Date | null;
  status: "ACTIVE" | "PAUSED" | "CANCELLED";
  recipientRoles: string[];
  recipientUserIds: string[];
  runCount: number;
  lastRun: { status: string; finishedAt: string | Date | null; error: string | null } | null;
};

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

const field =
  "h-10 w-full rounded-lg border border-[#dce6ee] bg-white px-3 text-[11px] font-semibold text-[#304b66] outline-none focus:border-[#2277ee] focus:ring-2 focus:ring-[#dcecff]";

function dateTimeLabel(value: string | Date | null) {
  if (!value) return "N/D";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "N/D"
    : date.toLocaleString("es-PE", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Lima",
      });
}

function frequencyLabel(value: ReportSchedule["frequency"]) {
  return value === "DAILY" ? "Diario" : value === "WEEKLY" ? "Semanal" : "Mensual";
}

function scheduleStatusMeta(status: ReportSchedule["status"]) {
  if (status === "ACTIVE") return { label: "Activa", classes: "bg-[#e4f7ef] text-[#13895a]", icon: CheckCircle2 };
  if (status === "PAUSED") return { label: "Pausada", classes: "bg-[#fff5e8] text-[#a96216]", icon: Clock3 };
  return { label: "Cancelada", classes: "bg-[#fff0f0] text-[#c34242]", icon: XCircle };
}

export function ReportScheduleControls({
  schedules,
  filters,
  currentUserId,
}: {
  schedules: ReportSchedule[];
  filters: DashboardFilters;
  currentUserId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [recipientRoles, setRecipientRoles] = useState<string[]>([]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const firstRunAt = String(data.get("firstRunAt") ?? "");
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/reportes/programados", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          name: data.get("name"),
          frequency: data.get("frequency"),
          firstRunAt: new Date(firstRunAt).toISOString(),
          filters,
          recipientRoles,
          recipientUserIds: [currentUserId],
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!response.ok)
        throw new Error(payload.error?.message ?? "No se pudo programar el reporte.");
      form.reset();
      setRecipientRoles([]);
      setOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo programar el reporte.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/reportes/programados/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!response.ok)
        throw new Error(payload.error?.message ?? "No se pudo cancelar el reporte.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cancelar el reporte.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMessage(null);
          setOpen(true);
        }}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#dce6ee] bg-white px-3.5 text-[11px] font-extrabold text-[#304b66] transition hover:border-[#2277ee] hover:text-[#2277ee]"
      >
        <CalendarClock className="h-4 w-4" aria-hidden="true" />
        Programar
      </button>
      <section className="rounded-[14px] border border-[#e2eaf1] bg-white p-4 shadow-[0_1px_3px_rgba(16,42,67,0.035)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[13px] font-black text-[#102a43]">Reportes programados</h2>
            <p className="mt-1 text-[10px] font-semibold leading-4 text-[#748aa0]">
              Se guardan con los filtros actuales y se entregarán primero en tu inbox interno.
            </p>
          </div>
          <span className="rounded-full bg-[#fff5e8] px-2.5 py-1 text-[9px] font-extrabold text-[#a96216]">
            Worker de ejecución pendiente
          </span>
        </div>
        {message ? (
          <p className="mt-3 text-[10px] font-bold text-[#c34242]" aria-live="polite">
            {message}
          </p>
        ) : null}
        <div className="mt-3 overflow-x-auto">
          {schedules.length ? (
            <table className="w-full min-w-[620px] text-left">
              <thead>
                <tr className="border-b border-[#edf2f6]">
                  {[
                    "Reporte",
                    "Frecuencia",
                    "Próxima ejecución",
                    "Historial",
                    "Estado",
                    "Acción",
                  ].map((header) => (
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
                {schedules.map((schedule) => (
                  <tr key={schedule.id} className="border-b border-[#f1f4f7] last:border-0">
                    <td className="px-2 py-3 text-[10px] font-extrabold text-[#304b66]">
                      {schedule.name}
                      <span className="mt-0.5 block text-[9px] font-semibold text-[#91a3b3]">
                        Inbox propio
                        {schedule.recipientRoles.length
                          ? ` · ${schedule.recipientRoles.length} roles`
                          : ""}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-[10px] font-semibold text-[#526b84]">
                      {frequencyLabel(schedule.frequency)}
                    </td>
                    <td className="px-2 py-3 text-[10px] font-semibold text-[#526b84]">
                      {dateTimeLabel(schedule.nextRunAt)}
                    </td>
                    <td className="px-2 py-3 text-[10px] font-semibold text-[#526b84]">
                      {schedule.runCount ? `${schedule.runCount} ejecución(es)` : "Sin ejecuciones"}
                      {schedule.lastRun ? ` · ${schedule.lastRun.status}` : ""}
                    </td>
                    <td className="px-2 py-3">
                      {(() => {
                        const status = scheduleStatusMeta(schedule.status);
                        const StatusIcon = status.icon;
                        return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[9px] font-extrabold ${status.classes}`}><StatusIcon className="h-3 w-3" aria-hidden="true" />{status.label}</span>;
                      })()}
                    </td>
                    <td className="px-2 py-3">
                      {schedule.status === "ACTIVE" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void cancel(schedule.id)}
                          className="text-[10px] font-extrabold text-[#c34242] hover:underline disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      ) : (
                        <span className="text-[10px] font-semibold text-[#91a3b3]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-[#dce6ee] bg-[#fbfcfd] p-4">
              <Clock3 className="h-5 w-5 text-[#9aabba]" aria-hidden="true" />
              <p className="text-[10px] font-semibold leading-4 text-[#748aa0]">
                Aún no tienes reportes programados. Crea uno para dejar persistido el alcance y su
                frecuencia.
              </p>
            </div>
          )}
        </div>
      </section>
      <AdminDrawer
        open={open}
        onClose={() => (busy ? undefined : setOpen(false))}
        title="Programar reporte"
        size="default"
        footer={
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold text-[#71869c]" aria-live="polite">
              {message ?? "Se conserva el alcance de los filtros actuales."}
            </p>
            <button
              type="submit"
              form="report-schedule-form"
              disabled={busy}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#2277ee] px-3.5 text-[10px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {busy ? "Guardando…" : "Guardar programación"}
            </button>
          </div>
        }
      >
        <form
          id="report-schedule-form"
          className="space-y-5"
          onSubmit={(event) => void save(event)}
        >
          <div>
            <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84]">
              Nombre de la programación
              <input
                required
                name="name"
                className={field}
                placeholder="Ej. Ventas semanales para gerencia"
              />
            </label>
            <p className="mt-1.5 text-[9px] font-semibold text-[#91a3b3]">
              Incluye ventas, margen, pedidos y productos del alcance filtrado.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84]">
              Frecuencia
              <select name="frequency" defaultValue="WEEKLY" className={field}>
                <option value="DAILY">Diario</option>
                <option value="WEEKLY">Semanal</option>
                <option value="MONTHLY">Mensual</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84]">
              Primera ejecución
              <input required type="datetime-local" name="firstRunAt" className={field} />
            </label>
          </div>
          <fieldset>
            <legend className="mb-2 text-[10px] font-extrabold text-[#526b84]">
              Destinatarios internos adicionales
            </legend>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {roleOptions.map(([role, label]) => (
                <label
                  key={role}
                  className="flex items-center gap-2 text-[10px] font-semibold text-[#526b84]"
                >
                  <input
                    type="checkbox"
                    checked={recipientRoles.includes(role)}
                    onChange={(event) =>
                      setRecipientRoles((current) =>
                        event.target.checked
                          ? [...current, role]
                          : current.filter((item) => item !== role),
                      )
                    }
                    className="h-4 w-4 accent-[#2277ee]"
                  />
                  {label}
                </label>
              ))}
            </div>
            <p className="mt-2 text-[9px] font-semibold text-[#91a3b3]">
              Tu inbox queda incluido siempre. No se envía correo ni WhatsApp sin un proveedor
              configurado.
            </p>
          </fieldset>
        </form>
      </AdminDrawer>
    </>
  );
}
