"use client";

import { useEffect, useState } from "react";
import {
  CalendarPlus,
  CheckSquare,
  Mail,
  MessageCircle,
  Plus,
  Phone,
  RefreshCw,
  UserRound,
  X,
} from "lucide-react";

type Value = Record<string, unknown>;
type RelationPage = {
  items: Value[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};
type CustomerDetail = {
  customer: Value & {
    name?: string;
    legalName?: string | null;
    email?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    address?: string | null;
    location?: string | null;
    documentNumber?: string | null;
    ruc?: string | null;
    contactPreference?: string | null;
    customerType?: string;
    status?: string;
    assignedSeller?: Value | null;
  };
  contacts: Value[];
  addresses: Value[];
  notes: Value[];
  summary: {
    quoteCount: number;
    opportunityCount: number;
    openOpportunityCount: number;
    saleCount: number | null;
    orderCount: number | null;
    paymentCount: number | null;
    lastActivityAt: Date | string | null;
  };
  quotes: RelationPage;
  opportunities: RelationPage;
  sales: RelationPage | null;
  orders: RelationPage | null;
  payments: RelationPage | null;
  activities: RelationPage;
  tasks: RelationPage;
};
type RelationKey =
  | "quotes"
  | "opportunities"
  | "sales"
  | "orders"
  | "payments"
  | "activities"
  | "tasks";
type DetailTab =
  | "summary"
  | "activities"
  | "opportunities"
  | "quotes"
  | "sales"
  | "orders"
  | "contacts"
  | "addresses"
  | "notes"
  | "payments";
type RelationComposerKind = "contact" | "address" | "note";

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
const typeLabels: Record<string, string> = {
  COMPANY: "Empresa",
  EMPRESA: "Empresa",
  BUSINESS: "Negocio",
  PERSON: "Persona",
  PERSONA: "Persona",
  INDIVIDUAL: "Persona",
};
const statusLabels: Record<string, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  PROSPECT: "Prospecto",
};
const contactPreferenceLabels: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  PHONE: "Llamada telefónica",
  EMAIL: "Correo electrónico",
  NONE: "Sin preferencia",
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
    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof (error as { message?: unknown }).message === "string"
    )
      return (error as { message: string }).message;
    if (typeof error === "string" && error.trim()) return error;
  }
  return fallback;
}

function contactLink(raw: unknown, scheme: "tel" | "mailto" | "whatsapp") {
  if (typeof raw !== "string" || !raw.trim()) return null;
  if (scheme === "mailto") return `mailto:${raw.trim()}`;
  const phone = raw.replace(/[^\d+]/g, "");
  if (!phone) return null;
  return scheme === "whatsapp" ? `https://wa.me/${phone.replace(/^\+/, "")}` : `tel:${phone}`;
}

function humanLabel(raw: unknown, labels: Record<string, string>) {
  if (typeof raw !== "string" || !raw) return "Sin dato";
  return labels[raw] ?? raw.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function unwrapRelation(item: Value) {
  const nested = [
    item.order,
    item.orders,
    item.sale,
    item.sales,
    item.payment,
    item.payments,
  ].filter((entry): entry is Value =>
    Boolean(entry && typeof entry === "object" && !Array.isArray(entry)),
  );
  return nested.reduce<Value>((all, entry) => ({ ...all, ...entry }), item);
}

export function CustomerDetailPanel({
  customerId,
  closeHref,
  initialComposer = null,
  canManage = false,
  canCrmManage = false,
  canSalesView = false,
  canOrdersView = false,
  canPaymentsView = false,
}: {
  customerId: string;
  closeHref: string;
  initialComposer?: "activity" | "task" | null;
  canManage?: boolean;
  canCrmManage?: boolean;
  canSalesView?: boolean;
  canOrdersView?: boolean;
  canPaymentsView?: boolean;
}) {
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>("detail");
  const [activeTab, setActiveTab] = useState<DetailTab>("summary");
  const [composer, setComposer] = useState<"activity" | "task" | null>(initialComposer);
  const [relationComposer, setRelationComposer] = useState<RelationComposerKind | null>(null);

  async function load(relation?: RelationKey, page = 1) {
    setLoadingKey(relation ?? "detail");
    setError(null);
    const params = new URLSearchParams({ pageSize: "5" });
    if (relation) {
      for (const key of Object.keys(relationPageParams) as RelationKey[]) {
        const current = detail?.[key];
        if (current)
          params.set(relationPageParams[key], String(key === relation ? page : current.page));
      }
      params.set(relationPageParams[relation], String(page));
    }
    try {
      const response = await fetch(
        `/api/admin/clientes/${encodeURIComponent(customerId)}?${params.toString()}`,
        { cache: "no-store" },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(errorMessage(payload, "No pudimos cargar el detalle del cliente."));
      setDetail(payload as CustomerDetail);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No pudimos cargar el detalle del cliente.",
      );
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
  const tabs: Array<{ id: DetailTab; label: string }> = [
    { id: "summary", label: "Resumen" },
    { id: "activities", label: "Actividad" },
    { id: "opportunities", label: "Oportunidades" },
    { id: "quotes", label: "Cotizaciones" },
    { id: "contacts", label: "Contactos" },
    { id: "addresses", label: "Direcciones" },
    { id: "notes", label: "Notas" },
  ];
  if (canSalesView) tabs.splice(4, 0, { id: "sales", label: "Ventas" });
  if (canOrdersView) tabs.splice(canSalesView ? 5 : 4, 0, { id: "orders", label: "Pedidos" });
  if (canPaymentsView && detail?.payments) tabs.splice(canSalesView && canOrdersView ? 6 : canSalesView || canOrdersView ? 5 : 4, 0, { id: "payments", label: "Pagos" });

  return (
    <section
      aria-label="Detalle 360 del cliente"
      className="rounded-xl border border-[#e2eaf1] bg-white shadow-[0_1px_3px_rgba(16,42,67,0.035)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf2f6] px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#e8f1ff] text-[#2277ee]">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#2277ee]">
              Detalle 360°
            </p>
            <h2 className="mt-1 text-xl font-black text-[#102a43]">
              {customer?.name ?? "Cargando cliente…"}
            </h2>
            <p className="mt-1 text-xs text-[#8296a9]">
              {customer?.legalName ?? "Consulta comercial, relaciones y seguimiento."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {contactLink(customer?.whatsapp ?? customer?.phone, "whatsapp") ? (
            <a
              aria-label="Abrir WhatsApp"
              href={contactLink(customer?.whatsapp ?? customer?.phone, "whatsapp") ?? undefined}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#dce6ee] text-[#159263]"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          ) : null}
          {contactLink(customer?.phone, "tel") ? (
            <a
              aria-label="Llamar al cliente"
              href={contactLink(customer?.phone, "tel") ?? undefined}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#dce6ee] text-[#304b66]"
            >
              <Phone className="h-4 w-4" />
            </a>
          ) : null}
          {contactLink(customer?.email, "mailto") ? (
            <a
              aria-label="Enviar correo"
              href={contactLink(customer?.email, "mailto") ?? undefined}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#dce6ee] text-[#304b66]"
            >
              <Mail className="h-4 w-4" />
            </a>
          ) : null}
          {canCrmManage ? (
            <>
              <button
                type="button"
                onClick={() => setComposer("activity")}
                className="inline-flex items-center gap-1 rounded-md bg-[#2277ee] px-3 py-2 text-xs font-extrabold text-white"
              >
                <CalendarPlus className="h-3.5 w-3.5" />
                Actividad
              </button>
              <button
                type="button"
                onClick={() => setComposer("task")}
                className="inline-flex items-center gap-1 rounded-md border border-[#dce6ee] px-3 py-2 text-xs font-extrabold text-[#304b66]"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                Tarea
              </button>
            </>
          ) : null}
          <a
            href={closeHref}
            className="inline-flex items-center gap-1 rounded-md border border-[#dce6ee] px-3 py-2 text-xs font-extrabold text-[#304b66]"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Cerrar
          </a>
        </div>
      </div>

      {loadingKey === "detail" && !detail ? (
        <div className="grid gap-3 p-5 sm:grid-cols-4">
          <div className="h-20 animate-pulse rounded-lg bg-[#f2f6f9]" />
          <div className="h-20 animate-pulse rounded-lg bg-[#f2f6f9]" />
          <div className="h-20 animate-pulse rounded-lg bg-[#f2f6f9]" />
          <div className="h-20 animate-pulse rounded-lg bg-[#f2f6f9]" />
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="m-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900"
        >
          {error}
          <button
            type="button"
            onClick={() => void load()}
            className="ml-3 inline-flex items-center gap-1 font-extrabold underline"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Reintentar
          </button>
        </div>
      ) : null}

      {detail && customer && summary ? (
        <div className="p-4 sm:p-5">
          <div
            role="tablist"
            aria-label="Secciones del cliente"
            className="-mx-4 flex overflow-x-auto border-b border-[#edf2f6] px-4 sm:-mx-5 sm:px-5"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 border-b-2 px-3 py-3 text-[11px] font-extrabold ${activeTab === tab.id ? "border-[#2277ee] text-[#2277ee]" : "border-transparent text-[#71869c] hover:text-[#304b66]"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="pt-5">
            {activeTab === "summary" ? (
              <Summary
                customer={customer}
                summary={summary}
                canSalesView={canSalesView}
                canOrdersView={canOrdersView}
                canPaymentsView={canPaymentsView}
              />
            ) : null}
            {activeTab === "activities" ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <RelationSection
                  relationKey="activities"
                  relation={detail.activities}
                  loading={loadingKey === "activities"}
                  onPageChange={(page) => void load("activities", page)}
                />
                <RelationSection
                  relationKey="tasks"
                  relation={detail.tasks}
                  loading={loadingKey === "tasks"}
                  onPageChange={(page) => void load("tasks", page)}
                />
              </div>
            ) : null}
            {activeTab === "opportunities" ? (
              <RelationSection
                relationKey="opportunities"
                relation={detail.opportunities}
                loading={loadingKey === "opportunities"}
                onPageChange={(page) => void load("opportunities", page)}
              />
            ) : null}
            {activeTab === "quotes" ? (
              <RelationSection
                relationKey="quotes"
                relation={detail.quotes}
                loading={loadingKey === "quotes"}
                onPageChange={(page) => void load("quotes", page)}
              />
            ) : null}
            {activeTab === "sales" && canSalesView && detail.sales ? (
              <RelationSection
                relationKey="sales"
                relation={detail.sales}
                loading={loadingKey === "sales"}
                onPageChange={(page) => void load("sales", page)}
              />
            ) : null}
            {activeTab === "orders" && canOrdersView && detail.orders ? (
              <RelationSection
                relationKey="orders"
                relation={detail.orders}
                loading={loadingKey === "orders"}
                onPageChange={(page) => void load("orders", page)}
              />
            ) : null}
            {activeTab === "payments" && canPaymentsView && detail.payments ? (
              <RelationSection
                relationKey="payments"
                relation={detail.payments}
                loading={loadingKey === "payments"}
                onPageChange={(page) => void load("payments", page)}
              />
            ) : null}
            {activeTab === "contacts" ? (
              <RelationPreview
                title="Contactos"
                items={detail.contacts}
                kind="contact"
                keys={["name", "email", "phone", "role"]}
                empty="No hay contactos adicionales registrados."
                addLabel="Agregar contacto"
                canAdd={canManage}
                onAdd={() => setRelationComposer("contact")}
              />
            ) : null}
            {activeTab === "addresses" ? (
              <RelationPreview
                title="Direcciones"
                items={detail.addresses}
                kind="address"
                keys={["label", "address", "city", "location"]}
                empty="No hay direcciones registradas."
                addLabel="Agregar dirección"
                canAdd={canManage}
                onAdd={() => setRelationComposer("address")}
              />
            ) : null}
            {activeTab === "notes" ? (
              <RelationPreview
                title="Notas"
                items={detail.notes}
                kind="note"
                keys={["title", "body", "content", "note"]}
                empty="No hay notas registradas."
                addLabel="Agregar nota"
                canAdd={canManage}
                onAdd={() => setRelationComposer("note")}
              />
            ) : null}
          </div>
        </div>
      ) : null}
      {composer ? (
        <CustomerComposer
          kind={composer}
          customerId={customerId}
          customerName={customer?.name ?? "cliente"}
          onClose={() => setComposer(null)}
          onSaved={() => {
            setComposer(null);
            setActiveTab("activities");
            void load();
          }}
        />
      ) : null}
      {relationComposer ? (
        <CustomerRelationComposer
          kind={relationComposer}
          customerId={customerId}
          customerName={customer?.name ?? "cliente"}
          onClose={() => setRelationComposer(null)}
          onSaved={() => {
            setRelationComposer(null);
            void load();
          }}
        />
      ) : null}
    </section>
  );
}

function Summary({
  customer,
  summary,
  canSalesView,
  canOrdersView,
  canPaymentsView,
}: {
  customer: CustomerDetail["customer"];
  summary: CustomerDetail["summary"];
  canSalesView: boolean;
  canOrdersView: boolean;
  canPaymentsView: boolean;
}) {
  const cards: Array<[string, string | number]> = [
    ["Cotizaciones", summary.quoteCount],
    ["Oportunidades abiertas", summary.openOpportunityCount],
    ...(canOrdersView ? [["Pedidos", summary.orderCount ?? "No disponible"] as [string, string | number]] : []),
    ...(canSalesView ? [["Ventas", summary.saleCount ?? "No disponible"] as [string, string | number]] : []),
    ...(canPaymentsView ? [["Pagos", summary.paymentCount ?? "No disponible"] as [string, string | number]] : []),
    ["Última actividad", dateValue(summary.lastActivityAt)],
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map(([label, text]) => (
          <div key={String(label)} className="rounded-lg border border-[#edf2f6] bg-[#fbfcfd] p-3">
            <p className="text-[10px] font-semibold text-[#8296a9]">{label}</p>
            <strong className="mt-1 block text-sm font-black text-[#102a43]">{text}</strong>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <DetailBlock
          title="Datos principales"
          rows={[
            ["Tipo", humanLabel(customer.customerType, typeLabels)],
            ["Estado", humanLabel(customer.status, statusLabels)],
            ["Razón social", value(customer, ["legalName", "name"])],
            ["Documento / RUC", value(customer, ["ruc", "documentNumber"])],
          ]}
        />
        <DetailBlock
          title="Contacto"
          rows={[
            ["Correo", value(customer, ["email"])],
            ["Teléfono", value(customer, ["phone"])],
            ["WhatsApp", value(customer, ["whatsapp"])],
            ["Preferencia", humanLabel(customer.contactPreference, contactPreferenceLabels)],
            ["Ubicación", value(customer, ["location", "address"])],
          ]}
        />
        <DetailBlock
          title="Responsable"
          rows={[
            [
              "Vendedor",
              value(
                customer.assignedSeller as Value | undefined,
                ["name", "email"],
                "Sin vendedor asignado",
              ),
            ],
            ["Creado", dateValue(customer.createdAt)],
            ["Actualizado", dateValue(customer.updatedAt)],
          ]}
        />
      </div>
    </div>
  );
}

function DetailBlock({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <section className="rounded-lg border border-[#edf2f6] p-4">
      <h3 className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#304b66]">{title}</h3>
      <dl className="mt-3 grid gap-2 text-xs">
        {rows.map(([label, text]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-[#8296a9]">{label}</dt>
            <dd className="max-w-[65%] text-right font-bold text-[#304b66]">{text}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function RelationPreview({
  title,
  items,
  kind,
  keys,
  empty,
  addLabel,
  canAdd = false,
  onAdd,
}: {
  title: string;
  items: Value[];
  kind: RelationComposerKind;
  keys: string[];
  empty: string;
  addLabel?: string;
  canAdd?: boolean;
  onAdd?: () => void;
}) {
  return (
    <section className="rounded-lg border border-[#edf2f6] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#304b66]">{title}</h3>
        {canAdd && onAdd && addLabel ? (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1 rounded-md border border-[#dce6ee] px-2.5 py-1.5 text-[10px] font-extrabold text-[#2277ee]"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {addLabel}
          </button>
        ) : null}
      </div>
      {items.length ? (
        <div className="mt-3 grid gap-2">
          {items.map((item, index) => (
            <RelationCard key={`${title}-${index}`} kind={kind} item={item} keys={keys} />
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-md border border-dashed border-[#dce6ee] p-3 text-xs text-[#8296a9]">
          {empty}
        </p>
      )}
    </section>
  );
}

function RelationCard({ kind, item, keys }: { kind: RelationComposerKind; item: Value; keys: string[] }) {
  if (kind === "contact") {
    return (
      <div className="rounded-md bg-[#fbfcfd] p-3 text-xs">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="font-bold text-[#304b66]">{value(item, keys.slice(0, 1))}</p>
          <div className="flex gap-1.5">
            {item.isPrimary === true ? <span className="rounded bg-[#e8f1ff] px-1.5 py-1 text-[9px] font-extrabold text-[#2277ee]">Principal</span> : null}
            {item.status ? <span className="rounded bg-[#e4f7ef] px-1.5 py-1 text-[9px] font-extrabold text-[#159263]">{humanLabel(item.status, statusLabels)}</span> : null}
          </div>
        </div>
        <div className="mt-2 grid gap-1 text-[11px] text-[#71869c] sm:grid-cols-2">
          <span>Cargo: <strong className="text-[#526b84]">{value(item, ["role"], "Sin cargo")}</strong></span>
          <span>Teléfono: <strong className="text-[#526b84]">{value(item, ["phone"], "Sin teléfono")}</strong></span>
          <span>WhatsApp: <strong className="text-[#526b84]">{value(item, ["whatsapp"], "Sin WhatsApp")}</strong></span>
          <span>Email: <strong className="text-[#526b84]">{value(item, ["email"], "Sin email")}</strong></span>
        </div>
      </div>
    );
  }
  if (kind === "address") {
    return (
      <div className="rounded-md bg-[#fbfcfd] p-3 text-xs">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="font-bold text-[#304b66]">{value(item, ["label"], "Dirección")}</p>
          {item.isPrimary === true ? <span className="rounded bg-[#e8f1ff] px-1.5 py-1 text-[9px] font-extrabold text-[#2277ee]">Principal</span> : null}
        </div>
        <p className="mt-1 text-[11px] text-[#526b84]">{value(item, ["address"])}</p>
        <p className="mt-1 text-[10px] text-[#8296a9]">
          {[item.district, item.province, item.department, item.country].filter((part): part is string => typeof part === "string" && Boolean(part.trim())).join(" · ") || "Sin ubicación detallada"}
        </p>
      </div>
    );
  }
  return (
    <article className="rounded-md bg-[#fbfcfd] p-3 text-xs">
      <p className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#2277ee]">Nota interna</p>
      <p className="mt-1 whitespace-pre-wrap text-[11px] leading-5 text-[#526b84]">{value(item, ["body", "content", "note"])}</p>
      <p className="mt-2 text-[10px] text-[#8296a9]">{dateValue(item.createdAt)} · Solo equipo interno</p>
    </article>
  );
}

function RelationSection({
  relationKey,
  relation,
  loading,
  onPageChange,
}: {
  relationKey: RelationKey;
  relation: RelationPage;
  loading: boolean;
  onPageChange: (page: number) => void;
}) {
  return (
    <section className="rounded-lg border border-[#edf2f6] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#304b66]">
            {relationLabels[relationKey]}
          </h3>
          <p className="mt-1 text-[10px] text-[#8296a9]">
            {relation.totalItems} registros relacionados
          </p>
        </div>
        {loading ? <span className="text-[10px] font-bold text-[#2277ee]">Cargando…</span> : null}
      </div>
      {relation.items.length ? (
        <div className="mt-3 grid gap-2">
          {relation.items.map((item, index) => {
            const row = unwrapRelation(item);
            return (
              <div key={`${relationKey}-${index}`} className="rounded-md bg-[#fbfcfd] p-3">
                <p className="text-xs font-bold text-[#304b66]">
                  {value(
                    row,
                    ["paymentCode", "code", "number", "title", "name", "subject", "reference"],
                    "Registro relacionado",
                  )}
                </p>
                <p className="mt-1 text-[11px] text-[#8296a9]">
                  {humanLabel(value(row, ["status", "stage", "type", "description", "body"]), {})} ·{" "}
                  {dateValue(row.occurredAt ?? row.updatedAt ?? row.createdAt ?? row.dueAt)}
                </p>
                {relationKey === "activities" && (row.result || row.nextAction) ? (
                  <div className="mt-2 grid gap-1 text-[10px] text-[#526b84]">
                    {row.result ? <p><strong>Resultado:</strong> {String(row.result)}</p> : null}
                    {row.nextAction ? <p><strong>Próxima acción:</strong> {String(row.nextAction)}{row.nextActionAt ? ` · ${dateValue(row.nextActionAt)}` : ""}</p> : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 rounded-md border border-dashed border-[#dce6ee] p-3 text-xs text-[#8296a9]">
          No hay registros relacionados.
        </p>
      )}
      {relation.totalPages > 1 ? (
        <div className="mt-3 flex items-center justify-between border-t border-[#edf2f6] pt-3 text-[10px] text-[#8296a9]">
          <span>
            Página {relation.page} de {relation.totalPages}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={loading || relation.page <= 1}
              onClick={() => onPageChange(relation.page - 1)}
              className="rounded border border-[#dce6ee] px-2 py-1 font-bold disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={loading || relation.page >= relation.totalPages}
              onClick={() => onPageChange(relation.page + 1)}
              className="rounded border border-[#dce6ee] px-2 py-1 font-bold disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CustomerComposer({
  kind,
  customerId,
  customerName,
  onClose,
  onSaved,
}: {
  kind: "activity" | "task";
  customerId: string;
  customerName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const raw = Object.fromEntries(new FormData(event.currentTarget).entries());
    const body = Object.fromEntries(
      Object.entries({ ...raw, customerId }).filter(([, item]) => item !== ""),
    );
    try {
      const response = await fetch(
        kind === "activity" ? "/api/admin/actividades" : "/api/admin/tareas",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": `${kind}-${crypto.randomUUID()}`,
          },
          body: JSON.stringify(body),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(errorMessage(payload, "No se pudo guardar."));
      onSaved();
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={kind === "activity" ? "Registrar actividad" : "Crear tarea"}
      className="fixed inset-0 z-[70] grid place-items-center bg-[#102a43]/35 p-4"
    >
      <form
        onSubmit={(event) => void submit(event)}
        className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#2277ee]">
              {kind === "activity" ? "Seguimiento" : "Agenda"}
            </p>
            <h3 className="mt-1 text-lg font-black text-[#102a43]">
              {kind === "activity" ? "Registrar actividad" : "Crear tarea"}
            </h3>
            <p className="mt-1 text-xs text-[#8296a9]">Cliente: {customerName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#71869c]"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 grid gap-3">
          {kind === "activity" ? (
            <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84]">
              Tipo de actividad
              <select
                name="type"
                defaultValue="CALL"
                aria-label="Tipo de actividad"
                className="h-10 rounded-lg border border-[#dce6ee] px-3 text-sm"
              >
                <option value="CALL">Llamada</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">Correo</option>
                <option value="MEETING">Reunión</option>
                <option value="NOTE">Nota</option>
              </select>
            </label>
          ) : null}
          <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84]">
            {kind === "activity" ? "Asunto *" : "Título *"}
            <input
              required
              name={kind === "activity" ? "subject" : "title"}
              placeholder={kind === "activity" ? "Asunto de la actividad" : "Título de la tarea"}
              className="h-10 rounded-lg border border-[#dce6ee] px-3 text-sm"
            />
          </label>
          <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84]">
            {kind === "activity" ? "Detalle" : "Detalle opcional"}
            <textarea
              name={kind === "activity" ? "body" : "description"}
              placeholder="Detalle opcional"
              className="min-h-24 rounded-lg border border-[#dce6ee] px-3 py-2 text-sm"
            />
          </label>
          {kind === "activity" ? (
            <>
              <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84]">
                Fecha y hora de la actividad
                <input
                  name="occurredAt"
                  type="datetime-local"
                  aria-label="Fecha y hora de la actividad"
                  className="h-10 rounded-lg border border-[#dce6ee] px-3 text-sm"
                />
              </label>
              <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84]">
                Resultado
                <textarea
                  name="result"
                  placeholder="Qué se logró o acordó"
                  className="min-h-20 rounded-lg border border-[#dce6ee] px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84]">
                Próxima acción
                <input
                  name="nextAction"
                  placeholder="Ej. Enviar propuesta actualizada"
                  className="h-10 rounded-lg border border-[#dce6ee] px-3 text-sm"
                />
              </label>
              <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84]">
                Fecha de próxima acción
                <input
                  name="nextActionAt"
                  type="datetime-local"
                  aria-label="Fecha de próxima acción"
                  className="h-10 rounded-lg border border-[#dce6ee] px-3 text-sm"
                />
              </label>
              <label className="flex items-start gap-2 rounded-lg border border-[#edf2f6] bg-[#fbfcfd] p-3 text-[11px] font-semibold text-[#526b84]">
                <input name="createFollowUp" value="true" type="checkbox" className="mt-0.5" />
                Crear seguimiento en la agenda con la próxima acción
              </label>
            </>
          ) : null}
          {kind === "task" ? (
            <input
              name="dueAt"
              type="datetime-local"
              className="h-10 rounded-lg border border-[#dce6ee] px-3 text-sm"
            />
          ) : null}
          {message ? (
            <p role="alert" className="text-xs font-semibold text-red-600">
              {message}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[#dce6ee] px-3 py-2 text-xs font-extrabold text-[#304b66]"
            >
              Cancelar
            </button>
            <button
              disabled={busy}
              className="rounded-md bg-[#2277ee] px-3 py-2 text-xs font-extrabold text-white disabled:opacity-50"
            >
              {busy ? "Guardando…" : kind === "activity" ? "Registrar" : "Crear tarea"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function CustomerRelationComposer({
  kind,
  customerId,
  customerName,
  onClose,
  onSaved,
}: {
  kind: RelationComposerKind;
  customerId: string;
  customerName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const title = kind === "contact" ? "Agregar contacto" : kind === "address" ? "Agregar dirección" : "Agregar nota";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const raw = Object.fromEntries(new FormData(event.currentTarget).entries());
    const body = {
      kind,
      customerId,
      ...raw,
      isPrimary: raw.isPrimary === "true",
    };
    try {
      const response = await fetch(`/api/admin/clientes/${encodeURIComponent(customerId)}/relations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `${kind}-${crypto.randomUUID()}`,
        },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(errorMessage(payload, "No se pudo guardar la relación."));
      onSaved();
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "No se pudo guardar la relación.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[80] grid place-items-center bg-[#102a43]/35 p-4">
      <form onSubmit={(event) => void submit(event)} className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#2277ee]">Customer 360°</p>
            <h3 className="mt-1 text-lg font-black text-[#102a43]">{title}</h3>
            <p className="mt-1 text-xs text-[#8296a9]">Cliente: {customerName}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-[#71869c]" aria-label="Cerrar">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          {kind === "contact" ? (
            <>
              <RelationField label="Nombre *" name="name" required placeholder="Nombre del contacto" />
              <RelationField label="Cargo" name="role" placeholder="Cargo o área" />
              <div className="grid gap-3 sm:grid-cols-2">
                <RelationField label="Teléfono" name="phone" placeholder="+51 …" />
                <RelationField label="WhatsApp" name="whatsapp" placeholder="+51 …" />
              </div>
              <RelationField label="Email" name="email" type="email" placeholder="contacto@empresa.com" />
            </>
          ) : null}
          {kind === "address" ? (
            <>
              <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84]">
                Tipo de dirección *
                <select required name="label" defaultValue="Entrega" className="h-10 rounded-lg border border-[#dce6ee] px-3 text-sm">
                  <option value="Fiscal">Fiscal</option>
                  <option value="Entrega">Entrega</option>
                  <option value="Sucursal">Sucursal</option>
                  <option value="Almacén">Almacén</option>
                  <option value="Otra">Otra</option>
                </select>
              </label>
              <RelationField label="Dirección *" name="address" required placeholder="Av. / Jr. / calle y número" />
              <div className="grid gap-3 sm:grid-cols-2">
                <RelationField label="Departamento" name="department" placeholder="Lima" />
                <RelationField label="Provincia" name="province" placeholder="Lima" />
                <RelationField label="Distrito" name="district" placeholder="Miraflores" />
                <RelationField label="País" name="country" placeholder="Perú" />
              </div>
            </>
          ) : null}
          {kind === "note" ? (
            <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84]">
              Nota interna *
              <textarea required name="body" placeholder="Escribe una nota visible solo para el equipo." className="min-h-32 rounded-lg border border-[#dce6ee] px-3 py-2 text-sm" />
            </label>
          ) : null}
          {kind !== "note" ? (
            <label className="flex items-start gap-2 rounded-lg border border-[#edf2f6] bg-[#fbfcfd] p-3 text-[11px] font-semibold text-[#526b84]">
              <input name="isPrimary" value="true" type="checkbox" className="mt-0.5" />
              Marcar como principal
            </label>
          ) : null}
          {message ? <p role="alert" className="text-xs font-semibold text-red-600">{message}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-[#dce6ee] px-3 py-2 text-xs font-extrabold text-[#304b66]">Cancelar</button>
            <button disabled={busy} className="rounded-md bg-[#2277ee] px-3 py-2 text-xs font-extrabold text-white disabled:opacity-50">
              {busy ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function RelationField({
  label,
  name,
  placeholder,
  required = false,
  type = "text",
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84]">
      {label}
      <input required={required} name={name} type={type} placeholder={placeholder} className="h-10 rounded-lg border border-[#dce6ee] px-3 text-sm" />
    </label>
  );
}
