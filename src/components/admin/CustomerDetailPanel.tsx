"use client";

import { useEffect, useState } from "react";
import { RefreshCw, UserRound, X } from "lucide-react";

type Value = Record<string, unknown>;
type RelationPage = { items: Value[]; page: number; pageSize: number; totalItems: number; totalPages: number };
type CustomerDetail = {
  customer: Value & { name?: string; legalName?: string | null; email?: string | null; phone?: string | null; whatsapp?: string | null; address?: string | null; location?: string | null; documentNumber?: string | null; ruc?: string | null; customerType?: string; status?: string; assignedSeller?: Value | null };
  contacts: Value[];
  addresses: Value[];
  notes: Value[];
  summary: { quoteCount: number; opportunityCount: number; openOpportunityCount: number; saleCount: number; orderCount: number; paymentCount: number | null; lastActivityAt: Date | string | null };
  quotes: RelationPage;
  opportunities: RelationPage;
  sales: RelationPage | null;
  orders: RelationPage;
  payments: RelationPage | null;
  activities: RelationPage;
  tasks: RelationPage;
};
type RelationKey = "quotes" | "opportunities" | "sales" | "orders" | "payments" | "activities" | "tasks";

const relationPageParams: Record<RelationKey, string> = {
  quotes: "quotesPage",
  opportunities: "opportunitiesPage",
  sales: "salesPage",
  orders: "ordersPage",
  payments: "paymentsPage",
  activities: "activitiesPage",
  tasks: "tasksPage",
};

const relationLabels: Record<RelationKey, string> = {
  quotes: "Cotizaciones",
  opportunities: "Oportunidades",
  sales: "Ventas",
  orders: "Pedidos",
  payments: "Pagos",
  activities: "Actividades",
  tasks: "Tareas",
};

function value(record: Value | undefined, keys: string[], fallback = "Sin dato") {
  for (const key of keys) {
    const candidate = record?.[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate;
    if (typeof candidate === "number") return String(candidate);
  }
  return fallback;
}

function dateValue(raw: unknown) {
  if (!raw || (typeof raw !== "string" && !(raw instanceof Date))) return "Sin fecha";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? "Sin fecha" : date.toLocaleString("es-PE");
}

function errorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (error && typeof error === "object" && "message" in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) return message;
    }
    if (typeof error === "string" && error.trim()) return error;
  }
  return fallback;
}

export function CustomerDetailPanel({ customerId, closeHref }: { customerId: string; closeHref: string }) {
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>("detail");

  async function load(relation?: RelationKey, page = 1) {
    setLoadingKey(relation ?? "detail");
    setError(null);
    const params = new URLSearchParams({ pageSize: "5" });
    if (relation) {
      for (const key of Object.keys(relationPageParams) as RelationKey[]) {
        const current = detail?.[key];
        if (current) params.set(relationPageParams[key], String(key === relation ? page : current.page));
      }
      params.set(relationPageParams[relation], String(page));
    }
    try {
      const response = await fetch(`/api/admin/clientes/${encodeURIComponent(customerId)}?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(errorMessage(payload, "No pudimos cargar el detalle del cliente."));
      setDetail(payload as CustomerDetail);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No pudimos cargar el detalle del cliente.");
    } finally {
      setLoadingKey(null);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // The selected customer is the only server input for this panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const customer = detail?.customer;
  const summary = detail?.summary;
  const relationKeys: RelationKey[] = ["quotes", "opportunities", "sales", "orders", "payments", "activities", "tasks"];

  return (
    <section aria-label="Detalle 360 del cliente" className="rounded-xl border border-[#e2eaf1] bg-white shadow-[0_1px_3px_rgba(16,42,67,0.035)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf2f6] px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3"><span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#e8f1ff] text-[#2277ee]"><UserRound className="h-5 w-5" aria-hidden="true" /></span><div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#2277ee]">Detalle 360°</p><h2 className="mt-1 text-xl font-black text-[#102a43]">{customer?.name ?? "Cargando cliente…"}</h2><p className="mt-1 text-xs text-[#8296a9]">Consulta comercial, relaciones y seguimiento del cliente.</p></div></div>
        <a href={closeHref} className="inline-flex items-center gap-1 rounded-md border border-[#dce6ee] px-3 py-2 text-xs font-extrabold text-[#304b66]"><X className="h-3.5 w-3.5" aria-hidden="true" />Cerrar detalle</a>
      </div>

      {loadingKey === "detail" && !detail ? <div className="grid gap-3 p-5 sm:grid-cols-4"><div className="h-20 animate-pulse rounded-lg bg-[#f2f6f9]" /><div className="h-20 animate-pulse rounded-lg bg-[#f2f6f9]" /><div className="h-20 animate-pulse rounded-lg bg-[#f2f6f9]" /><div className="h-20 animate-pulse rounded-lg bg-[#f2f6f9]" /></div> : null}
      {error ? <div role="alert" className="m-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">{error || "No pudimos cargar el detalle del cliente."}<button type="button" onClick={() => void load()} className="ml-3 inline-flex items-center gap-1 font-extrabold underline"><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />Reintentar</button></div> : null}

      {detail && customer && summary ? <div className="space-y-5 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">{[["Cotizaciones", summary.quoteCount], ["Oportunidades abiertas", summary.openOpportunityCount], ["Pedidos", summary.orderCount], ["Ventas", summary.saleCount], ["Pagos", summary.paymentCount ?? "No disponible"], ["Última actividad", dateValue(summary.lastActivityAt)]].map(([label, valueText]) => <div key={String(label)} className="rounded-lg border border-[#edf2f6] bg-[#fbfcfd] p-3"><p className="text-[10px] font-semibold text-[#8296a9]">{label}</p><strong className="mt-1 block text-sm font-black text-[#102a43]">{valueText}</strong></div>)}</div>

        <div className="grid gap-4 lg:grid-cols-3"><div className="rounded-lg border border-[#edf2f6] p-4"><h3 className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#304b66]">Datos principales</h3><dl className="mt-3 grid gap-2 text-xs"><div className="flex justify-between gap-3"><dt className="text-[#8296a9]">Tipo</dt><dd className="text-right font-bold text-[#304b66]">{value(customer, ["customerType"])}</dd></div><div className="flex justify-between gap-3"><dt className="text-[#8296a9]">Estado</dt><dd className="text-right font-bold text-[#304b66]">{value(customer, ["status"])}</dd></div><div className="flex justify-between gap-3"><dt className="text-[#8296a9]">Razón social</dt><dd className="text-right font-bold text-[#304b66]">{value(customer, ["legalName"])}</dd></div><div className="flex justify-between gap-3"><dt className="text-[#8296a9]">Documento / RUC</dt><dd className="text-right font-bold text-[#304b66]">{value(customer, ["ruc", "documentNumber"])}</dd></div></dl></div><div className="rounded-lg border border-[#edf2f6] p-4"><h3 className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#304b66]">Contacto</h3><dl className="mt-3 grid gap-2 text-xs"><div className="flex justify-between gap-3"><dt className="text-[#8296a9]">Correo</dt><dd className="max-w-[65%] truncate text-right font-bold text-[#304b66]">{value(customer, ["email"])}</dd></div><div className="flex justify-between gap-3"><dt className="text-[#8296a9]">Teléfono</dt><dd className="text-right font-bold text-[#304b66]">{value(customer, ["phone"])}</dd></div><div className="flex justify-between gap-3"><dt className="text-[#8296a9]">WhatsApp</dt><dd className="text-right font-bold text-[#304b66]">{value(customer, ["whatsapp"])}</dd></div><div className="flex justify-between gap-3"><dt className="text-[#8296a9]">Ubicación</dt><dd className="text-right font-bold text-[#304b66]">{value(customer, ["location", "address"])}</dd></div></dl></div><div className="rounded-lg border border-[#edf2f6] p-4"><h3 className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#304b66]">Responsable</h3><p className="mt-3 text-sm font-bold text-[#304b66]">{value(customer.assignedSeller as Value | undefined, ["name", "email"], "Sin vendedor asignado")}</p><p className="mt-1 text-xs text-[#8296a9]">Creado: {dateValue(customer.createdAt)}</p><p className="mt-1 text-xs text-[#8296a9]">Actualizado: {dateValue(customer.updatedAt)}</p></div></div>

        <div className="grid gap-4 lg:grid-cols-2">{detail.contacts.length ? <RelationPreview title="Contactos adicionales" items={detail.contacts} keys={["name", "email", "phone"]} /> : null}{detail.addresses.length ? <RelationPreview title="Direcciones" items={detail.addresses} keys={["label", "address", "city", "location"]} /> : null}{detail.notes.length ? <RelationPreview title="Notas" items={detail.notes} keys={["title", "body", "content", "note"]} /> : null}</div>

        <div className="grid gap-4 lg:grid-cols-2">{relationKeys.map((key) => { const relation = detail[key]; if (!relation) return null; return <RelationSection key={key} relationKey={key} relation={relation} loading={loadingKey === key} onPageChange={(page) => void load(key, page)} />; })}</div>
      </div> : null}
    </section>
  );
}

function RelationPreview({ title, items, keys }: { title: string; items: Value[]; keys: string[] }) {
  return <section className="rounded-lg border border-[#edf2f6] p-4"><h3 className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#304b66]">{title}</h3><div className="mt-3 grid gap-2">{items.slice(0, 3).map((item, index) => <div key={`${title}-${index}`} className="rounded-md bg-[#fbfcfd] p-3 text-xs"><p className="font-bold text-[#304b66]">{value(item, keys.slice(0, 1))}</p><p className="mt-1 text-[#8296a9]">{value(item, keys.slice(1))}</p></div>)}</div></section>;
}

function RelationSection({ relationKey, relation, loading, onPageChange }: { relationKey: RelationKey; relation: RelationPage; loading: boolean; onPageChange: (page: number) => void }) {
  return <section className="rounded-lg border border-[#edf2f6] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#304b66]">{relationLabels[relationKey]}</h3><p className="mt-1 text-[10px] text-[#8296a9]">{relation.totalItems} registros relacionados</p></div>{loading ? <span className="text-[10px] font-bold text-[#2277ee]">Cargando…</span> : null}</div>{relation.items.length ? <div className="mt-3 grid gap-2">{relation.items.map((item, index) => <div key={`${relationKey}-${value(item, ["id"], String(index))}`} className="rounded-md bg-[#fbfcfd] p-3"><p className="text-xs font-bold text-[#304b66]">{value(item, ["code", "number", "title", "name", "subject", "id"])}</p><p className="mt-1 text-[11px] text-[#8296a9]">{value(item, ["status", "stage", "type", "description", "body" ])} · {dateValue(item.updatedAt ?? item.createdAt ?? item.dueAt)}</p></div>)}</div> : <p className="mt-3 rounded-md border border-dashed border-[#dce6ee] p-3 text-xs text-[#8296a9]">No hay registros relacionados.</p>}{relation.totalPages > 1 ? <div className="mt-3 flex items-center justify-between border-t border-[#edf2f6] pt-3 text-[10px] text-[#8296a9]"><span>Página {relation.page} de {relation.totalPages}</span><div className="flex gap-1"><button type="button" disabled={loading || relation.page <= 1} onClick={() => onPageChange(relation.page - 1)} className="rounded border border-[#dce6ee] px-2 py-1 font-bold disabled:opacity-40">Anterior</button><button type="button" disabled={loading || relation.page >= relation.totalPages} onClick={() => onPageChange(relation.page + 1)} className="rounded border border-[#dce6ee] px-2 py-1 font-bold disabled:opacity-40">Siguiente</button></div></div> : null}</section>;
}
