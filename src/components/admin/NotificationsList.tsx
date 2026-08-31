"use client";

import { useMemo, useState } from "react";

type NotificationState = "UNREAD" | "READ" | "DISMISSED";
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
};
type Metrics = { unread: number; read: number; dismissed: number };

const stateLabels: Record<NotificationState, string> = {
  UNREAD: "No leída",
  READ: "Leída",
  DISMISSED: "Descartada",
};

function formatDate(value: Date | string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("es-PE");
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
  metrics,
  unreadCount,
  pagination,
  queryString,
  loadError = null,
}: {
  notifications: Notification[];
  metrics: Metrics;
  unreadCount: number;
  pagination: { page: number; totalPages: number; totalItems: number };
  queryString: string;
  loadError?: string | null;
}) {
  const [rows, setRows] = useState(notifications);
  const [selected, setSelected] = useState<string[]>([]);
  const [localMetrics, setLocalMetrics] = useState(metrics);
  const [localUnreadCount, setLocalUnreadCount] = useState(unreadCount);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"error" | "success">("success");
  const filters = useMemo(() => new URLSearchParams(queryString), [queryString]);
  const retryHref = queryString ? `/admin/notificaciones?${queryString}` : "/admin/notificaciones";
  const allSelected = rows.length > 0 && rows.every((row) => selected.includes(row.id));

  function announce(text: string, kind: "error" | "success") {
    setMessage(text);
    setMessageKind(kind);
  }

  function applyState(ids: string[], nextState: NotificationState) {
    const idSet = new Set(ids);
    const affected = rows.filter((row) => idSet.has(row.id));
    if (!affected.length) return;
    setRows((current) => current.map((row) => {
      if (!idSet.has(row.id)) return row;
      return {
        ...row,
        state: nextState,
        readAt: nextState === "READ" ? new Date() : null,
        dismissedAt: nextState === "DISMISSED" ? new Date() : null,
      };
    }));
    setLocalMetrics((current) => {
      const next = { ...current };
      for (const row of affected) {
        next[row.state.toLowerCase() as keyof Metrics] -= 1;
        next[nextState.toLowerCase() as keyof Metrics] += 1;
      }
      return next;
    });
    setLocalUnreadCount((current) => current + affected.filter((row) => row.state !== "UNREAD" && nextState === "UNREAD").length - affected.filter((row) => row.state === "UNREAD" && nextState !== "UNREAD").length);
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

  function hrefForPage(page: number) {
    const params = new URLSearchParams(queryString);
    params.set("page", String(page));
    return `/admin/notificaciones?${params.toString()}`;
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-md border border-border bg-white p-4"><p className="text-xs text-gray-text">No leídas globales</p><p className="mt-1 text-xl font-black text-dark">{localUnreadCount}</p></div>
        <div className="rounded-md border border-border bg-white p-4"><p className="text-xs text-gray-text">No leídas filtradas</p><p className="mt-1 text-xl font-black text-dark">{localMetrics.unread}</p></div>
        <div className="rounded-md border border-border bg-white p-4"><p className="text-xs text-gray-text">Leídas</p><p className="mt-1 text-xl font-black text-dark">{localMetrics.read}</p></div>
        <div className="rounded-md border border-border bg-white p-4"><p className="text-xs text-gray-text">Descartadas</p><p className="mt-1 text-xl font-black text-dark">{localMetrics.dismissed}</p></div>
      </div>

      <form method="get" className="grid gap-2 rounded-md border border-border bg-white p-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto_auto] lg:items-end">
        <label className="grid gap-1 text-xs font-bold text-gray-text">Buscar<input name="query" defaultValue={filters.get("query") ?? ""} placeholder="Título, cuerpo o tipo" className="h-10 rounded-md border border-border px-3 text-sm font-normal" /></label>
        <label className="grid gap-1 text-xs font-bold text-gray-text">Tipo<input name="type" defaultValue={filters.get("type") ?? ""} placeholder="Ej. ORDER_CREATED" className="h-10 rounded-md border border-border px-3 text-sm font-normal" /></label>
        <label className="grid gap-1 text-xs font-bold text-gray-text">Estado<select name="state" defaultValue={filters.get("state") ?? ""} className="h-10 rounded-md border border-border px-3 text-sm font-normal"><option value="">Todos los estados</option><option value="UNREAD">No leídas</option><option value="READ">Leídas</option><option value="DISMISSED">Descartadas</option></select></label>
        <label className="grid gap-1 text-xs font-bold text-gray-text">Desde<input name="dateFrom" type="date" defaultValue={filters.get("dateFrom") ?? ""} className="h-10 rounded-md border border-border px-3 text-sm font-normal" /></label>
        <label className="grid gap-1 text-xs font-bold text-gray-text">Hasta<input name="dateTo" type="date" defaultValue={filters.get("dateTo") ?? ""} className="h-10 rounded-md border border-border px-3 text-sm font-normal" /></label>
        <div className="flex gap-2"><button className="h-10 rounded-md bg-primary px-4 text-sm font-bold text-white">Filtrar</button><a href="/admin/notificaciones" className="inline-flex h-10 items-center rounded-md border border-border px-3 text-sm font-bold text-dark">Limpiar</a></div>
      </form>

      {loadError ? <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">{loadError || "No pudimos cargar las notificaciones."} <a href={retryHref} className="ml-2 font-extrabold underline">Reintentar</a></div> : null}
      {message ? <p role={messageKind === "error" ? "alert" : "status"} aria-live={messageKind === "error" ? "assertive" : "polite"} className={`text-sm font-bold ${messageKind === "error" ? "text-danger" : "text-gray-text"}`}>{message}</p> : null}

      {selected.length ? <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-white p-3"><span className="mr-2 text-xs font-bold text-gray-text">{selected.length} seleccionada(s)</span><button type="button" disabled={bulkBusy} onClick={() => void bulk("READ")} className="rounded-md border border-border px-3 py-2 text-xs font-bold disabled:opacity-50">Marcar leídas</button><button type="button" disabled={bulkBusy} onClick={() => void bulk("DISMISSED")} className="rounded-md border border-border px-3 py-2 text-xs font-bold disabled:opacity-50">Descartar</button></div> : null}

      {!loadError && rows.length ? <div className="grid gap-3"><div className="flex items-center gap-2 text-xs text-gray-text"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Seleccionar todas las notificaciones de esta página" />Seleccionar todas las de esta página</div>{rows.map((row) => <article key={row.id} className={`rounded-md border border-border bg-white p-5 ${row.state === "UNREAD" ? "shadow-card" : "opacity-75"}`}><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 gap-3"><input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggle(row.id)} aria-label={`Seleccionar ${row.title}`} /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-dark">{row.title}</p><span className="rounded-pill bg-background px-2 py-1 text-[10px] font-extrabold text-gray-text">{stateLabels[row.state]}</span></div><p className="mt-1 text-sm leading-6 text-gray-text">{row.body}</p><p className="mt-2 text-xs text-gray-text">{formatDate(row.createdAt)} · {row.type}</p>{row.link ? <a className="mt-2 inline-block text-xs font-extrabold text-primary" href={row.link}>Abrir detalle</a> : null}</div></div><div className="flex shrink-0 flex-wrap justify-end gap-2">{row.state !== "READ" ? <button type="button" disabled={busyId === row.id || bulkBusy} className="text-xs font-extrabold text-primary disabled:opacity-50" onClick={() => void update(row.id, "READ")}>Marcar leída</button> : <button type="button" disabled={busyId === row.id || bulkBusy} className="text-xs font-extrabold text-primary disabled:opacity-50" onClick={() => void update(row.id, "UNREAD")}>Marcar no leída</button>}{row.state !== "DISMISSED" ? <button type="button" disabled={busyId === row.id || bulkBusy} className="text-xs font-extrabold text-gray-text disabled:opacity-50" onClick={() => void update(row.id, "DISMISSED")}>Descartar</button> : null}</div></div></article>)}</div> : null}
      {!loadError && !rows.length ? <div className="rounded-md border border-dashed border-border bg-white p-6 text-sm text-gray-text">No hay notificaciones para este alcance.</div> : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-gray-text"><span>Mostrando {rows.length} de {pagination.totalItems}</span>{pagination.totalPages > 1 ? <nav aria-label="Paginación de notificaciones" className="flex gap-1">{pagination.page > 1 ? <a href={hrefForPage(pagination.page - 1)} className="rounded border border-border bg-white px-2 py-1 font-bold">Anterior</a> : null}{pageNumbers(pagination.page, pagination.totalPages).map((page) => <a key={page} href={hrefForPage(page)} aria-current={pagination.page === page ? "page" : undefined} className={`rounded border px-2 py-1 ${pagination.page === page ? "border-primary bg-primary text-white" : "border-border bg-white"}`}>{page}</a>)}{pagination.page < pagination.totalPages ? <a href={hrefForPage(pagination.page + 1)} className="rounded border border-border bg-white px-2 py-1 font-bold">Siguiente</a> : null}</nav> : null}</div>
    </div>
  );
}
