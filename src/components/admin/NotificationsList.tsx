"use client";

import { useState } from "react";
import { Archive, Check, Undo2 } from "lucide-react";
import { notificationBodyLabel, notificationEventLabel } from "@/lib/notification-display";

type NotificationState = "UNREAD" | "READ" | "DISMISSED";
type NotificationPriority = "Alta" | "Media" | "Baja";
type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  state: NotificationState;
  link: string | null;
  createdAt: Date | string;
  readAt: Date | string | null;
  dismissedAt: Date | string | null;
  metadata: Record<string, unknown> | null;
  dedupeKey: string | null;
  priority: NotificationPriority;
};

const stateLabels: Record<NotificationState, string> = {
  UNREAD: "No leída",
  READ: "Leída",
  DISMISSED: "Descartada",
};
const priorityClasses: Record<NotificationPriority, string> = {
  Alta: "bg-rose-50 text-rose-600 border-rose-100",
  Media: "bg-amber-50 text-amber-600 border-amber-100",
  Baja: "bg-emerald-50 text-emerald-600 border-emerald-100",
};
const priorityIconBg: Record<NotificationPriority, string> = {
  Alta: "bg-rose-50 text-rose-500",
  Media: "bg-amber-50 text-amber-500",
  Baja: "bg-emerald-50 text-emerald-500",
};
const priorityIconPath: Record<NotificationPriority, string> = {
  Alta: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  Media: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  Baja: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
};

function formatRelative(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `Hace ${days} d`;
}

function getErrorMessage(response: Response, fallback: string) {
  return response
    .json()
    .then((payload: unknown) => {
      if (payload && typeof payload === "object" && "error" in payload) {
        const error = (payload as { error?: unknown }).error;
        if (typeof error === "string" && error.trim()) return error;
        if (error && typeof error === "object" && "message" in error) {
          const message = (error as { message?: unknown }).message;
          if (typeof message === "string" && message.trim()) return message;
        }
      }
      return fallback;
    })
    .catch(() => fallback);
}

function pageNumbers(current: number, total: number) {
  const width = Math.min(5, total);
  const start = Math.max(1, Math.min(current - 2, total - width + 1));
  return Array.from({ length: width }, (_, index) => start + index);
}

export function NotificationsList({
  notifications,
  pagination,
  queryString,
  types,
  selectedId,
  loadError = null,
}: {
  notifications: Notification[];
  pagination: { page: number; totalPages: number; totalItems: number };
  queryString: string;
  types: string[];
  selectedId?: string | null;
  loadError?: string | null;
}) {
  const [rows, setRows] = useState(notifications);
  // useState(initial) only reads its argument on first mount — a server refresh (e.g. after
  // sending a new notice from the management panel below) delivers a fresh `notifications`
  // prop without remounting this component, which would otherwise leave the list stuck
  // showing stale rows while the pagination/count text above (driven straight from props)
  // already reflects the new data. Syncing during render (React's documented pattern for
  // this — see "Adjusting state when a prop changes") avoids the extra commit an effect
  // would cause.
  const [previousNotifications, setPreviousNotifications] = useState(notifications);
  if (notifications !== previousNotifications) {
    setPreviousNotifications(notifications);
    setRows(notifications);
  }
  const [selected, setSelected] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"error" | "success">("success");
  const filters = new URLSearchParams(queryString);
  const retryHref = queryString ? `/admin/notificaciones?${queryString}` : "/admin/notificaciones";
  const allSelected = rows.length > 0 && rows.every((row) => selected.includes(row.id));

  function announce(text: string, kind: "error" | "success") {
    setMessage(text);
    setMessageKind(kind);
  }

  function applyState(ids: string[], nextState: NotificationState) {
    const idSet = new Set(ids);
    setRows((current) => current.map((row) => {
      if (!idSet.has(row.id)) return row;
      return {
        ...row,
        state: nextState,
        readAt: nextState === "READ" ? new Date() : null,
        dismissedAt: nextState === "DISMISSED" ? new Date() : null,
      };
    }));
  }

  async function update(id: string, state: NotificationState) {
    setBusyId(id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/notificaciones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });
      if (!response.ok) {
        announce(await getErrorMessage(response, "No se pudo actualizar la notificación."), "error");
        return;
      }
      applyState([id], state);
      announce("Notificación actualizada.", "success");
    } catch {
      announce("No se pudo actualizar la notificación. Revisa tu conexión e inténtalo nuevamente.", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function bulk(state: Extract<NotificationState, "READ" | "DISMISSED">) {
    if (!selected.length) return;
    setBulkBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/notificaciones/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected, state }),
      });
      if (!response.ok) {
        announce(await getErrorMessage(response, "No se pudieron actualizar las notificaciones seleccionadas."), "error");
        return;
      }
      applyState(selected, state);
      setSelected([]);
      announce("Notificaciones actualizadas.", "success");
    } catch {
      announce("No se pudieron actualizar las notificaciones. Revisa tu conexión e inténtalo nuevamente.", "error");
    } finally {
      setBulkBusy(false);
    }
  }

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  function toggleAll() {
    setSelected(allSelected ? [] : rows.map((row) => row.id));
  }

  function hrefFor(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams(queryString);
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) params.delete(key);
      else params.set(key, value);
    }
    return `/admin/notificaciones?${params.toString()}`;
  }

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-2xs">
      <div className="flex items-center justify-between border-b border-slate-100 p-4">
        <div>
          <h2 className="text-[15px] font-bold leading-tight text-slate-900">Bandeja de notificaciones</h2>
          <p className="mt-0.5 text-[11px] text-slate-400">{pagination.totalItems.toLocaleString("es-PE")} resultados</p>
        </div>
      </div>

      <form method="get" className="space-y-2.5 border-b border-slate-100 p-3">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <input name="query" defaultValue={filters.get("query") ?? ""} placeholder="Buscar en notificaciones..." className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" type="text" />
        </div>
        <div className="flex items-center gap-2">
          <select aria-label="Filtrar por tipo de notificación" name="type" defaultValue={filters.get("type") ?? ""} className="flex-1 appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-2.5 pr-6 text-[11.5px] text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">Todos los tipos</option>
            {types.map((type) => <option key={type} value={type}>{notificationEventLabel(type)}</option>)}
          </select>
          <select aria-label="Filtrar por estado de notificación" name="state" defaultValue={filters.get("state") ?? ""} className="flex-1 appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-2.5 pr-6 text-[11.5px] text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">Todos los estados</option>
            <option value="UNREAD">No leídas</option>
            <option value="READ">Leídas</option>
            <option value="DISMISSED">Descartadas</option>
          </select>
          <button className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11.5px] font-medium text-slate-600 hover:bg-slate-50">Filtrar</button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          <label className="flex items-center gap-1">Desde <span>(DD/MM/AAAA)</span><input name="dateFrom" type="date" aria-label="Desde, formato DD/MM/AAAA" title="Formato: DD/MM/AAAA" defaultValue={filters.get("dateFrom") ?? ""} className="ml-1 rounded border border-slate-200 px-1.5 py-1 text-[11px]" /></label>
          <label className="flex items-center gap-1">Hasta <span>(DD/MM/AAAA)</span><input name="dateTo" type="date" aria-label="Hasta, formato DD/MM/AAAA" title="Formato: DD/MM/AAAA" defaultValue={filters.get("dateTo") ?? ""} className="ml-1 rounded border border-slate-200 px-1.5 py-1 text-[11px]" /></label>
          <a href="/admin/notificaciones" className="ml-auto font-medium text-blue-600 hover:text-blue-700">Limpiar</a>
        </div>
      </form>

      {loadError ? (
        <div role="alert" className="m-3 flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11.5px] font-medium text-amber-900">
          <span>{loadError || "No pudimos cargar las notificaciones."}</span>
          <a href={retryHref} className="font-bold underline">Reintentar</a>
        </div>
      ) : null}
      {message ? <p role={messageKind === "error" ? "alert" : "status"} aria-live={messageKind === "error" ? "assertive" : "polite"} className={`px-3 pt-2 text-[11px] font-semibold ${messageKind === "error" ? "text-rose-600" : "text-slate-500"}`}>{message}</p> : null}

      {selected.length ? (
        <div className="mx-3 mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px]">
          <span className="mr-1 font-semibold text-slate-600">{selected.length} seleccionada(s)</span>
          <button type="button" disabled={bulkBusy} onClick={() => void bulk("READ")} className="rounded-md border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700 disabled:opacity-50">Marcar leídas</button>
          <button type="button" disabled={bulkBusy} onClick={() => void bulk("DISMISSED")} className="rounded-md border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700 disabled:opacity-50">Descartar</button>
        </div>
      ) : null}

      {!loadError && rows.length ? (
        <div className="flex-1 divide-y divide-slate-100">
          {rows.map((row) => {
            const isSelected = selectedId === row.id;
            return (
              <div key={row.id} className={isSelected ? "flex items-start gap-3 border-l-4 border-blue-600 bg-blue-50/50 p-3.5 transition-colors hover:bg-blue-50" : "flex items-start gap-3 p-3.5 transition-colors hover:bg-slate-50"}>
                <input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggle(row.id)} aria-label={`Seleccionar ${row.title}`} className="mt-2 shrink-0 rounded border-slate-300" />
                {row.state === "UNREAD" ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" /> : <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-transparent" />}
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${priorityIconBg[row.priority]}`}>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d={priorityIconPath[row.priority]} strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <a href={hrefFor({ notificationId: row.id })} className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`truncate text-xs font-bold ${row.state === "UNREAD" ? "text-slate-900" : "text-slate-700"}`}>{row.title}</h3>
                    <span className="shrink-0 text-[11px] text-slate-400">{formatRelative(row.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[11.5px] text-slate-500">{notificationBodyLabel(row.body)}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">{stateLabels[row.state]}</span>
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${priorityClasses[row.priority]}`}>{row.priority}</span>
                  </div>
                </a>
                <div className="mt-1 flex w-14 shrink-0 items-center justify-end gap-0.5">
                  {row.state !== "READ" ? (
                    <button type="button" title="Marcar leída" aria-label="Marcar leída" disabled={busyId === row.id || bulkBusy} className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50" onClick={() => void update(row.id, "READ")}>
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button type="button" title="Marcar no leída" aria-label="Marcar no leída" disabled={busyId === row.id || bulkBusy} className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50" onClick={() => void update(row.id, "UNREAD")}>
                      <Undo2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {row.state !== "DISMISSED" ? (
                    <button type="button" title="Descartar" aria-label="Descartar" disabled={busyId === row.id || bulkBusy} className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50" onClick={() => void update(row.id, "DISMISSED")}>
                      <Archive className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-2 p-2.5 text-[11px] text-slate-400">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Seleccionar todas las notificaciones de esta página" />
            Seleccionar todas las de esta página
          </div>
        </div>
      ) : null}
      {!loadError && !rows.length ? <div className="p-6 text-center text-[11.5px] text-slate-400">No hay notificaciones para este alcance.</div> : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 p-3 text-[11.5px] text-slate-500">
        <span>Mostrando {rows.length} de {pagination.totalItems}</span>
        {pagination.totalPages > 1 ? (
          <nav aria-label="Paginación de notificaciones" className="flex items-center gap-1">
            {pagination.page > 1 ? <a href={hrefFor({ page: String(pagination.page - 1) })} className="rounded p-1 text-slate-400 hover:text-slate-600">Anterior</a> : null}
            {pageNumbers(pagination.page, pagination.totalPages).map((page) => (
              <a key={page} href={hrefFor({ page: String(page) })} aria-current={pagination.page === page ? "page" : undefined} className={pagination.page === page ? "flex h-6 w-6 items-center justify-center rounded border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-600" : "flex h-6 w-6 items-center justify-center rounded text-xs hover:bg-slate-100"}>{page}</a>
            ))}
            {pagination.page < pagination.totalPages ? <a href={hrefFor({ page: String(pagination.page + 1) })} className="rounded p-1 text-slate-400 hover:text-slate-600">Siguiente</a> : null}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
