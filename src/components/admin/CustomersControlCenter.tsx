"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  EllipsisVertical,
  FileText,
  Filter,
  LoaderCircle,
  Plus,
  Search,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { CustomerDetailPanel } from "@/components/admin/CustomerDetailPanel";
import type {
  CustomerAttentionKey,
  CustomerListItem,
  CustomerListResponse,
} from "@/lib/customer-contract";

type Duplicate = {
  id: string;
  name: string;
  ruc: string | null;
  documentNumber: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  location: string | null;
  matches: Array<{ field: string; strength: "strong" | "weak" }>;
  strong: boolean;
};
type CreateState = {
  name: string;
  legalName: string;
  customerType: string;
  ruc: string;
  documentNumber: string;
  email: string;
  phone: string;
  whatsapp: string;
  location: string;
  contactPreference: string;
  assignedSellerId: string;
  primaryContactName: string;
  primaryContactRole: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  primaryContactWhatsapp: string;
  addressLabel: string;
  address: string;
  notes: string;
};
type CustomerOperationTab = "agenda" | "activity" | "opportunities" | "history";
type CustomerOperationResponse = {
  tab: CustomerOperationTab;
  items: Array<Record<string, unknown>>;
};

const initialCreate: CreateState = {
  name: "",
  legalName: "",
  customerType: "EMPRESA",
  ruc: "",
  documentNumber: "",
  email: "",
  phone: "",
  whatsapp: "",
  location: "",
  contactPreference: "WHATSAPP",
  assignedSellerId: "",
  primaryContactName: "",
  primaryContactRole: "",
  primaryContactEmail: "",
  primaryContactPhone: "",
  primaryContactWhatsapp: "",
  addressLabel: "Entrega",
  address: "",
  notes: "",
};
const typeLabels: Record<string, string> = {
  PERSON: "Persona",
  COMPANY: "Empresa",
  CONSUMIDOR: "Consumidor",
  TECNICO: "Técnico",
  EMPRESA: "Empresa",
  DISTRIBUIDOR: "Distribuidor",
  MAYORISTA: "Mayorista",
};
const statusLabels: Record<string, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  PROSPECT: "Prospecto",
  SUSPENDED: "Suspendido",
  MERGED: "Fusionado",
};
const attentionLabels: Record<CustomerAttentionKey, string> = {
  overdueFollowUp: "Seguimiento vencido",
  unassigned: "Sin responsable",
  stalledOpportunity: "Oportunidad estancada",
  quoteResponse: "Cotización por responder",
};

function dateText(value: Date | string | null | undefined) {
  if (!value) return "Sin actividad";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Sin actividad"
    : date.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}
function activityText(row: CustomerListItem) {
  if (!row.lastActivity) return "Sin actividad";
  return row.lastActivity.subject || row.lastActivity.type;
}
function pageHref(queryString: string, page: number) {
  const params = new URLSearchParams(queryString);
  params.set("page", String(page));
  params.delete("customerId");
  return `/admin/clientes?${params.toString()}`;
}
function filterHref(
  queryString: string,
  key: string,
  value: string | null,
  clearKeys: string[] = [],
) {
  const params = new URLSearchParams(queryString);
  if (value === null) params.delete(key);
  else params.set(key, value);
  for (const clearKey of clearKeys) params.delete(clearKey);
  params.delete("page");
  params.delete("customerId");
  const query = params.toString();
  return `/admin/clientes${query ? `?${query}` : ""}`;
}
function hasCustomerFilters(queryString: string) {
  const params = new URLSearchParams(queryString);
  return [
    "query",
    "q",
    "status",
    "customerType",
    "assignedSellerId",
    "location",
    "department",
    "opportunity",
    "attention",
    "needsAttention",
    "overdueFollowUp",
    "noActivity",
    "hasQuotes",
    "hasSales",
    "createdFrom",
    "createdTo",
    "lastActivityFrom",
    "lastActivityTo",
  ].some((key) => Boolean(params.get(key)));
}
async function payload(response: Response) {
  return response.json().catch(() => null) as Promise<Record<string, unknown> | null>;
}
function failure(data: Record<string, unknown> | null, fallback: string) {
  const error = data?.error;
  return error &&
    typeof error === "object" &&
    typeof (error as { message?: unknown }).message === "string"
    ? (error as { message: string }).message
    : fallback;
}
function operationDate(value: unknown) {
  if (!value) return "Sin fecha";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "Sin fecha" : date.toLocaleString("es-PE");
}
function operationLabel(value: unknown, fallback: string) {
  if (typeof value !== "string" || !value.trim()) return fallback;
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function CustomersControlCenter({
  page,
  queryString,
  canManage,
  canCrmManage,
  canQuotesCreate,
  canSalesView,
  canOrdersView,
  canPaymentsView,
  customerId,
  mergeCandidates,
}: {
  page: CustomerListResponse;
  queryString: string;
  canManage: boolean;
  canCrmManage: boolean;
  canQuotesCreate: boolean;
  canSalesView: boolean;
  canOrdersView: boolean;
  canPaymentsView: boolean;
  customerId?: string | null;
  mergeCandidates: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [drawer, setDrawer] = useState<"create" | "edit" | "merge" | "deactivate" | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [selected, setSelected] = useState<CustomerListItem | null>(null);
  const [create, setCreate] = useState<CreateState>(initialCreate);
  const [createStep, setCreateStep] = useState(1);
  const [duplicatesChecked, setDuplicatesChecked] = useState(false);
  const [edit, setEdit] = useState<CreateState>(initialCreate);
  const [editReason, setEditReason] = useState("");
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [overrideReason, setOverrideReason] = useState("");
  const [mergeIds, setMergeIds] = useState({ primaryId: "", secondaryId: "" });
  const [mergePreview, setMergePreview] = useState<Record<string, unknown> | null>(null);
  const [reason, setReason] = useState("");
  const [force, setForce] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [operationsTab, setOperationsTab] = useState<CustomerOperationTab>("agenda");
  const [operations, setOperations] = useState<CustomerOperationResponse | null>(null);
  const [operationsError, setOperationsError] = useState<{ tab: CustomerOperationTab; message: string } | null>(null);
  const [operationsRevision, setOperationsRevision] = useState(0);
  const baseHref = useMemo(() => {
    const params = new URLSearchParams(queryString);
    params.delete("customerId");
    return `/admin/clientes${params.size ? `?${params.toString()}` : ""}`;
  }, [queryString]);
  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/admin/clientes/operaciones?tab=${operationsTab}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await payload(response);
        if (!response.ok) throw new Error(failure(data, "No se pudieron cargar las operaciones CRM."));
        return data as CustomerOperationResponse;
      })
      .then((data) => {
        if (!cancelled) setOperations(data);
      })
      .catch((error) => {
        if (!cancelled) setOperationsError({ tab: operationsTab, message: error instanceof Error ? error.message : "No se pudieron cargar las operaciones CRM." });
      });
    return () => {
      cancelled = true;
    };
  }, [operationsRevision, operationsTab]);
  const metricCards = [
    {
      label: "Clientes registrados",
      value: page.metrics.total,
      note: "Total filtrado",
      icon: UsersRound,
      color: "blue",
      href: "/admin/clientes",
    },
    {
      label: "Clientes activos",
      value: page.metrics.active,
      note: "Estado activo",
      icon: CheckCircle2,
      color: "green",
      href: "/admin/clientes?status=ACTIVE",
    },
    {
      label: "Por atender",
      value: page.metrics.requiringAttention,
      note: "Acción comercial pendiente",
      icon: Clock3,
      color: "orange",
      href: "/admin/clientes?needsAttention=true",
    },
    {
      label: "Oportunidades activas",
      value: page.metrics.withOpenOpportunity,
      note: "En pipeline",
      icon: Building2,
      color: "purple",
      href: "/admin/clientes?opportunity=OPEN",
    },
  ];
  const close = () => {
    setDrawer(null);
    setNotice(null);
    setReason("");
    setForce(false);
    setEditReason("");
    setDuplicates([]);
    setMergePreview(null);
    setCreateStep(1);
    setDuplicatesChecked(false);
  };
  const openDetail = (id: string, initialComposer?: "activity" | "task") => {
    setActionId(null);
    const params = new URLSearchParams(queryString);
    params.set("customerId", id);
    if (initialComposer) params.set("customerAction", initialComposer);
    else params.delete("customerAction");
    router.push(`/admin/clientes?${params.toString()}`);
  };
  const closeDetail = () => router.push(baseHref);
  const updateCreate = (key: keyof CreateState, value: string) => {
    setDuplicatesChecked(false);
    setCreate((previous) => ({ ...previous, [key]: value }));
  };
  const updateEdit = (key: keyof CreateState, value: string) =>
    setEdit((previous) => ({ ...previous, [key]: value }));

  function openEdit(customer: CustomerListItem) {
    setSelected(customer);
      setEdit({
      name: customer.name,
      legalName: customer.legalName ?? "",
      customerType: customer.customerType,
      ruc: customer.ruc ?? "",
      documentNumber: customer.documentNumber ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      whatsapp: customer.whatsapp ?? "",
        location: customer.location ?? "",
        contactPreference: "WHATSAPP",
        assignedSellerId: customer.assignedSeller?.id ?? "",
        primaryContactName: "",
        primaryContactRole: "",
        primaryContactEmail: "",
        primaryContactPhone: "",
        primaryContactWhatsapp: "",
        addressLabel: "Entrega",
        address: customer.address ?? "",
        notes: "",
    });
    setDrawer("edit");
    setActionId(null);
  }

  async function saveEdit() {
    if (!selected) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/clientes/${encodeURIComponent(selected.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...edit, reason: editReason }),
      });
      const data = await payload(response);
      if (!response.ok) throw new Error(failure(data, "No se pudo actualizar el cliente."));
      close();
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo actualizar el cliente.");
    } finally {
      setBusy(false);
    }
  }

  async function checkDuplicates() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/clientes/dedupe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(create),
      });
      const data = await payload(response);
      if (!response.ok) throw new Error(failure(data, "No se pudieron revisar duplicados."));
      setDuplicates(Array.isArray(data?.duplicates) ? (data.duplicates as Duplicate[]) : []);
      setDuplicatesChecked(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudieron revisar duplicados.");
    } finally {
      setBusy(false);
    }
  }
  async function saveCustomer() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/clientes", {
        method: "POST",
        headers: { "content-type": "application/json" },
       body: JSON.stringify({
         ...create,
         primaryContact: {
           name: create.primaryContactName,
           role: create.primaryContactRole,
           email: create.primaryContactEmail,
           phone: create.primaryContactPhone,
           whatsapp: create.primaryContactWhatsapp,
         },
         primaryAddress: {
           label: create.addressLabel,
           address: create.address,
         },
         duplicateOverrideReason: overrideReason || undefined,
       }),
      });
      const data = await payload(response);
      if (!response.ok) throw new Error(failure(data, "No se pudo crear el cliente."));
      close();
      setCreate(initialCreate);
      setDuplicatesChecked(false);
      router.refresh();
      const customer = data?.customer as { id?: string } | undefined;
      if (customer?.id) openDetail(customer.id);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo crear el cliente.");
    } finally {
      setBusy(false);
    }
  }
  async function loadMergePreview() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/clientes/merge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...mergeIds, preview: true }),
      });
      const data = await payload(response);
      if (!response.ok) throw new Error(failure(data, "No se pudo preparar la fusión."));
      setMergePreview(data?.preview as Record<string, unknown>);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo preparar la fusión.");
    } finally {
      setBusy(false);
    }
  }
  async function merge() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/clientes/merge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...mergeIds, reason }),
      });
      const data = await payload(response);
      if (!response.ok) throw new Error(failure(data, "No se pudieron fusionar los clientes."));
      close();
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudieron fusionar los clientes.");
    } finally {
      setBusy(false);
    }
  }
  async function deactivate() {
    if (!selected) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/admin/clientes/${encodeURIComponent(selected.id)}/status`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "INACTIVE", reason, force }),
        },
      );
      const data = await payload(response);
      if (!response.ok) {
        const details =
          data?.error && typeof data.error === "object"
            ? (data.error as { details?: unknown }).details
            : null;
        if (details && typeof details === "object")
          setNotice(
            `${failure(data, "El cliente tiene operaciones abiertas.")} Oportunidades: ${String((details as { opportunities?: unknown }).opportunities ?? 0)}, cotizaciones: ${String((details as { quotes?: unknown }).quotes ?? 0)}, pedidos: ${String((details as { orders?: unknown }).orders ?? 0)}.`,
          );
        else throw new Error(failure(data, "No se pudo desactivar el cliente."));
        return;
      }
      close();
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo desactivar el cliente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[25px] font-black tracking-[-0.035em] text-[#102a43] sm:text-[28px]">
            Gestión de clientes
          </h1>
          <p className="mt-1.5 text-[11px] font-semibold text-[#7d91a5]">
            Administra tu cartera de clientes y su actividad comercial.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/api/admin/clientes/export?${queryString}`}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#dce6ee] bg-white px-3.5 text-[10px] font-extrabold text-[#304b66]"
          >
            <Download className="h-4 w-4" />
            Exportar
          </Link>
          {canManage ? (
            <button
              type="button"
              onClick={() => {
                setCreate(initialCreate);
                setCreateStep(1);
                setDuplicates([]);
                setDuplicatesChecked(false);
                setDrawer("create");
              }}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#ff830e] px-3.5 text-[10px] font-extrabold text-white shadow-[0_5px_12px_rgba(255,131,14,0.18)]"
            >
              <UserPlus className="h-4 w-4" />
              Nuevo cliente
            </button>
          ) : null}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => {
          const Icon = metric.icon;
          const tint =
            metric.color === "green"
              ? "bg-[#e4f7ef] text-[#159263]"
              : metric.color === "orange"
                ? "bg-[#fff0e0] text-[#f58b20]"
                : metric.color === "purple"
                  ? "bg-[#eee9ff] text-[#8057e8]"
                  : "bg-[#e8f1ff] text-[#2277ee]";
          return (
            <Link
              key={metric.label}
              href={metric.href}
              className="min-h-[116px] rounded-xl border border-[#e2eaf1] bg-white p-3.5 shadow-[0_1px_3px_rgba(16,42,67,0.035)]"
            >
              <div className="flex gap-2.5">
                <span
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tint}`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold text-[#7d91a5]">{metric.label}</p>
                  <p className="mt-1 font-display text-[21px] font-black text-[#102a43]">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-[9px] font-extrabold text-[#159263]">{metric.note}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <form
        action="/admin/clientes"
        className="flex flex-wrap gap-2 rounded-xl border border-[#e2eaf1] bg-white p-2.5 shadow-[0_1px_3px_rgba(16,42,67,0.035)]"
      >
        <label className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-[#dce6ee] px-3">
          <Search className="h-4 w-4 text-[#6d84a0]" />
          <input
            name="query"
            defaultValue={new URLSearchParams(queryString).get("query") ?? ""}
            placeholder="Buscar por nombre, empresa, contacto o email..."
            className="w-full bg-transparent text-[11px] font-semibold text-[#304b66] outline-none placeholder:text-[#9aabba]"
          />
        </label>
        <SelectFilter
          name="status"
          label="Estado"
          values={page.facets.statuses}
          queryString={queryString}
        />
        <SelectFilter
          name="customerType"
          label="Tipo de cliente"
          values={page.facets.customerTypes}
          queryString={queryString}
          labels={typeLabels}
        />
        <SelectFilter
          name="assignedSellerId"
          label="Responsable"
          values={page.facets.sellers.map((seller) => seller.id)}
          queryString={queryString}
          labels={Object.fromEntries(
            page.facets.sellers.map((seller) => [
              seller.id,
              seller.name ?? seller.email ?? "Sin nombre",
            ]),
          )}
        />
        <details className="relative">
          <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-[#dce6ee] px-3.5 text-[10px] font-extrabold text-[#304b66]">
            <Filter className="h-4 w-4" />
            Filtros
          </summary>
          <div className="absolute right-0 z-30 mt-2 grid w-[min(92vw,640px)] gap-3 rounded-xl border border-[#dce6ee] bg-white p-4 shadow-2xl sm:grid-cols-2 lg:grid-cols-3">
            <SelectFilter
              name="location"
              label="Ciudad"
              values={page.facets.locations}
              queryString={queryString}
            />
            <SelectFilter
              name="department"
              label="Departamento"
              values={page.facets.departments}
              queryString={queryString}
            />
            <SelectFilter
              name="opportunity"
              label="Oportunidad"
              values={["OPEN", "NONE"]}
              queryString={queryString}
              labels={{ OPEN: "Con oportunidad activa", NONE: "Sin oportunidad" }}
            />
            <SelectFilter
              name="needsAttention"
              label="Atención"
              values={["true"]}
              queryString={queryString}
              labels={{ true: "Por atender" }}
            />
            <SelectFilter
              name="overdueFollowUp"
              label="Seguimiento"
              values={["true"]}
              queryString={queryString}
              labels={{ true: "Con seguimiento vencido" }}
            />
            <SelectFilter
              name="noActivity"
              label="Actividad"
              values={["true"]}
              queryString={queryString}
              labels={{ true: "Sin actividad" }}
            />
            <SelectFilter
              name="hasQuotes"
              label="Cotizaciones"
              values={["true"]}
              queryString={queryString}
              labels={{ true: "Con cotizaciones" }}
            />
            <SelectFilter
              name="hasSales"
              label="Ventas"
              values={["true"]}
              queryString={queryString}
              labels={{ true: "Con ventas" }}
            />
            <DateFilter name="createdFrom" label="Creado desde" queryString={queryString} />
            <DateFilter name="createdTo" label="Creado hasta" queryString={queryString} />
            <DateFilter
              name="lastActivityFrom"
              label="Última actividad desde"
              queryString={queryString}
            />
            <DateFilter
              name="lastActivityTo"
              label="Última actividad hasta"
              queryString={queryString}
            />
            <button
              type="submit"
              className="h-10 rounded-lg bg-[#2277ee] px-3 text-[10px] font-extrabold text-white sm:col-span-2 lg:col-span-3"
            >
              Aplicar filtros
            </button>
          </div>
        </details>
      </form>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_250px]">
        <section className="overflow-hidden rounded-xl border border-[#e2eaf1] bg-white shadow-[0_1px_3px_rgba(16,42,67,0.035)]">
          <div className="border-b border-[#edf2f6] px-4 py-3.5">
            <h2 className="text-[13px] font-extrabold text-[#102a43]">Clientes</h2>
            <p className="mt-1 text-[10px] font-semibold text-[#8296a9]">
              {page.totalItems} resultados
            </p>
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px] text-left">
              <thead className="bg-[#fbfcfd] text-[8px] font-extrabold uppercase tracking-wide text-[#7890a7]">
                <tr>
                  {[
                    "Cliente",
                    "Tipo",
                    "Contacto",
                    "Teléfono",
                    "Email",
                    "Ciudad",
                    "Actividad reciente",
                    "Estado",
                    "Responsable",
                    "",
                  ].map((head) => (
                    <th key={head} className="px-3 py-3">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {page.items.map((row) => (
                  <CustomerTableRow
                    key={row.id}
                    row={row}
                    canManage={canManage}
                    canCrmManage={canCrmManage}
                    canQuotesCreate={canQuotesCreate}
                    canSalesView={canSalesView}
                    canOrdersView={canOrdersView}
                    actionOpen={actionId === row.id}
                    onAction={() => setActionId(actionId === row.id ? null : row.id)}
                    onOpen={(action) => openDetail(row.id, action)}
                    onEdit={() => openEdit(row)}
                    onDeactivate={() => {
                      setSelected(row);
                      setDrawer("deactivate");
                      setActionId(null);
                    }}
                    onMerge={() => {
                      setMergeIds({ primaryId: row.id, secondaryId: "" });
                      setDrawer("merge");
                      setActionId(null);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-2 p-3 md:hidden">
            {page.items.map((row) => (
              <CustomerCard key={row.id} row={row} onOpen={() => openDetail(row.id)} />
            ))}
          </div>
          {page.items.length === 0 ? (
            <div className="p-10 text-center">
              <UsersRound className="mx-auto h-8 w-8 text-[#9db0c1]" />
              {page.totalItems === 0 && !hasCustomerFilters(queryString) ? (
                <>
                  <p className="mt-3 text-sm font-extrabold text-[#304b66]">
                    Aún no hay clientes registrados.
                  </p>
                  {canManage ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCreate(initialCreate);
                        setCreateStep(1);
                        setDuplicates([]);
                        setDuplicatesChecked(false);
                        setDrawer("create");
                      }}
                      className="mt-3 inline-flex items-center gap-1 rounded-lg bg-[#ff830e] px-3 py-2 text-xs font-extrabold text-white"
                    >
                      <Plus className="h-3.5 w-3.5" /> Nuevo cliente
                    </button>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="mt-3 text-sm font-extrabold text-[#304b66]">
                    No encontramos clientes con estos filtros.
                  </p>
                  <Link
                    className="mt-3 inline-block text-xs font-extrabold text-[#2277ee]"
                    href="/admin/clientes"
                  >
                    Limpiar filtros
                  </Link>
                </>
              )}
            </div>
          ) : null}
          <Pager
            page={page.page}
            totalPages={page.totalPages}
            totalItems={page.totalItems}
            pageSize={page.pageSize}
            queryString={queryString}
          />
        </section>
        <aside className="space-y-3">
          <section className="rounded-xl border border-[#e2eaf1] bg-white p-3.5 shadow-[0_1px_3px_rgba(16,42,67,0.035)]">
            <h2 className="text-[13px] font-extrabold text-[#102a43]">Resumen de clientes</h2>
            <div className="mt-3 grid gap-2">
              {metricCards.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-lg border border-[#edf2f6] bg-[#fbfcfd] p-3"
                >
                  <p className="text-[8px] font-extrabold uppercase tracking-wide text-[#71869c]">
                    {metric.label}
                  </p>
                  <p className="mt-1 text-lg font-black text-[#102a43]">{metric.value}</p>
                  <p className="text-[9px] font-semibold text-[#8296a9]">{metric.note}</p>
                </div>
              ))}
            </div>
          </section>
          <Distribution
            title="Distribución por tipo"
            rows={page.metrics.distributionByType}
            total={page.metrics.total}
            formatLabel={(label) => typeLabels[label] ?? label}
          />
          <Distribution
            title="Distribución geográfica"
            rows={page.metrics.distributionByLocation}
            total={page.metrics.total}
          />
          <AttentionPanel
            rows={page.metrics.attentionCategories}
            queryString={queryString}
          />
        </aside>
      </div>
      <section className="rounded-xl border border-[#e2eaf1] bg-white p-4 shadow-[0_1px_3px_rgba(16,42,67,0.035)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-extrabold text-[#102a43]">Operaciones CRM</h2>
            <p className="mt-1 text-[10px] font-semibold text-[#8296a9]">
              Agenda, actividad, oportunidades e historial cargados desde datos reales.
            </p>
          </div>
          <div className="flex gap-2">
            {canManage ? (
              <button
                type="button"
                onClick={() => setDrawer("merge")}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#dce6ee] px-3 text-[10px] font-extrabold text-[#304b66]"
              >
                <Building2 className="h-4 w-4 text-[#8057e8]" />
                Fusionar clientes
              </button>
            ) : null}
            <Link
              href="/admin/crm"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#dce6ee] px-3 text-[10px] font-extrabold text-[#304b66]"
            >
              <FileText className="h-4 w-4 text-[#2277ee]" />
              Abrir pipeline
            </Link>
          </div>
        </div>
        <div role="tablist" aria-label="Operaciones CRM" className="mt-4 flex overflow-x-auto border-b border-[#edf2f6]">
          {([
            ["agenda", "Agenda"],
            ["activity", "Actividad"],
            ["opportunities", "Oportunidades"],
            ["history", "Historial"],
          ] as Array<[CustomerOperationTab, string]>).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={operationsTab === tab}
              onClick={() => setOperationsTab(tab)}
              className={`shrink-0 border-b-2 px-3 py-3 text-[11px] font-extrabold ${operationsTab === tab ? "border-[#2277ee] text-[#2277ee]" : "border-transparent text-[#71869c] hover:text-[#304b66]"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-4">
          {operations?.tab !== operationsTab && operationsError?.tab !== operationsTab ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="h-16 animate-pulse rounded-lg bg-[#f2f6f9]" />
              <div className="h-16 animate-pulse rounded-lg bg-[#f2f6f9]" />
            </div>
          ) : null}
          {operationsError?.tab === operationsTab ? (
            <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
              {operationsError.message}
              <button type="button" onClick={() => setOperationsRevision((revision) => revision + 1)} className="ml-2 font-extrabold underline">
                Reintentar
              </button>
            </div>
          ) : null}
          {operationsError?.tab !== operationsTab && operations?.tab === operationsTab && operations.items.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {operations.items.map((item) => {
                const title = operationsTab === "activity"
                  ? String(item.subject ?? "Actividad comercial")
                  : operationsTab === "opportunities"
                    ? `${String(item.code ?? "Oportunidad")} · ${String(item.title ?? "Sin título")}`
                    : operationsTab === "history"
                      ? operationLabel(item.action, "Actualización registrada")
                      : String(item.title ?? "Seguimiento pendiente");
                const subtitle = operationsTab === "history"
                  ? `${String(item.actor ?? "Sistema")} · ${String(item.entityId ?? "Cliente")}`
                  : `${String(item.customer ?? "Cliente sin nombre")} · ${String(item.actor ?? item.assignee ?? item.seller ?? (item.stage ? operationLabel(item.stage, "Etapa") : "Sin asignar"))}`;
                const date = operationDate(item.dueAt ?? item.occurredAt ?? item.createdAt ?? item.followUpAt);
                return (
                  <article key={String(item.id)} className="rounded-lg border border-[#edf2f6] bg-[#fbfcfd] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-extrabold text-[#304b66]">{title}</p>
                        <p className="mt-1 truncate text-[10px] text-[#8296a9]">{subtitle}</p>
                      </div>
                      <time className="shrink-0 text-[10px] font-bold text-[#71869c]">{date}</time>
                    </div>
                    {operationsTab === "activity" && item.body ? <p className="mt-2 line-clamp-2 text-[10px] text-[#526b84]">{String(item.body)}</p> : null}
                    {operationsTab === "opportunities" && item.nextAction ? <p className="mt-2 text-[10px] text-[#526b84]">Próxima acción: {String(item.nextAction)}</p> : null}
                  </article>
                );
              })}
            </div>
          ) : null}
          {operationsError?.tab !== operationsTab && operations?.tab === operationsTab && operations.items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[#dce6ee] p-4 text-center text-xs font-semibold text-[#8296a9]">
              {operationsTab === "agenda" ? "Todo al día." : operationsTab === "activity" ? "No hay actividad registrada." : operationsTab === "opportunities" ? "No hay oportunidades activas." : "No hay historial de clientes."}
            </p>
          ) : null}
        </div>
      </section>

      <AdminDrawer
        open={Boolean(customerId)}
        onClose={closeDetail}
        title="Cliente 360°"
        size="wide"
      >
        <CustomerDetailPanel
          key={`${customerId ?? ""}-${new URLSearchParams(queryString).get("customerAction") ?? "none"}`}
          customerId={customerId ?? ""}
          closeHref={baseHref}
          canManage={canManage}
          canCrmManage={canCrmManage}
          canSalesView={canSalesView}
          canOrdersView={canOrdersView}
          canPaymentsView={canPaymentsView}
          initialComposer={
            new URLSearchParams(queryString).get("customerAction") as "activity" | "task" | null
          }
        />
      </AdminDrawer>
      <AdminDrawer
        open={drawer === "edit"}
        onClose={close}
        title="Editar cliente"
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={close}
              className="h-10 rounded-lg border border-[#dce6ee] px-4 text-[10px] font-extrabold text-[#304b66]"
            >
              Cancelar
            </button>
            <button
              disabled={busy || !edit.name.trim() || !editReason.trim()}
              onClick={() => void saveEdit()}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#2277ee] px-4 text-[10px] font-extrabold text-white disabled:opacity-50"
            >
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Guardar cambios
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <CreateCustomerForm
            create={edit}
            update={updateEdit}
            duplicates={[]}
            busy={busy}
            onCheck={() => undefined}
            overrideReason=""
            setOverrideReason={() => undefined}
            notice={notice}
            mode="edit"
            sellers={page.facets.sellers}
          />
          <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84]">
            Motivo del cambio *
            <textarea
              value={editReason}
              onChange={(event) => setEditReason(event.target.value)}
              className="min-h-20 rounded-lg border border-[#dce6ee] p-3 text-xs font-medium outline-none focus:border-[#2277ee]"
              placeholder="Deja trazabilidad del cambio."
            />
          </label>
        </div>
      </AdminDrawer>
      <AdminDrawer
        open={drawer === "create"}
        onClose={close}
        title="Nuevo cliente"
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={close}
              className="h-10 rounded-lg border border-[#dce6ee] px-4 text-[10px] font-extrabold text-[#304b66]"
            >
              Cancelar
            </button>
            {createStep > 1 ? (
              <button
                type="button"
                onClick={() => setCreateStep((step) => Math.max(1, step - 1))}
                className="h-10 rounded-lg border border-[#dce6ee] px-4 text-[10px] font-extrabold text-[#304b66]"
              >
                Atrás
              </button>
            ) : null}
            {createStep < 3 ? (
              <button
                type="button"
                disabled={busy || (createStep === 1 && !create.name.trim())}
                onClick={() => setCreateStep((step) => Math.min(3, step + 1))}
                className="h-10 rounded-lg bg-[#2277ee] px-4 text-[10px] font-extrabold text-white disabled:opacity-50"
              >
                Siguiente
              </button>
            ) : (
              <button
                type="button"
                disabled={
                  busy ||
                  !create.name.trim() ||
                  !duplicatesChecked ||
                  (duplicates.some((item) => item.strong) && !overrideReason.trim())
                }
                onClick={() => void saveCustomer()}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#ff830e] px-4 text-[10px] font-extrabold text-white disabled:opacity-50"
              >
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Crear cliente
              </button>
            )}
          </div>
        }
      >
        <CreateCustomerForm
          create={create}
          update={updateCreate}
          duplicates={duplicates}
          busy={busy}
          onCheck={() => void checkDuplicates()}
          overrideReason={overrideReason}
          setOverrideReason={setOverrideReason}
          notice={notice}
          step={createStep}
          sellers={page.facets.sellers}
        />
      </AdminDrawer>
      <AdminDrawer
        open={drawer === "merge"}
        onClose={close}
        title="Fusionar clientes"
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={close}
              className="h-10 rounded-lg border border-[#dce6ee] px-4 text-[10px] font-extrabold text-[#304b66]"
            >
              Cancelar
            </button>
            <button
              disabled={busy || !mergePreview || !reason.trim()}
              onClick={() => void merge()}
              className="h-10 rounded-lg bg-[#ff830e] px-4 text-[10px] font-extrabold text-white disabled:opacity-50"
            >
              Confirmar fusión
            </button>
          </div>
        }
      >
        <MergeForm
          customers={mergeCandidates}
          ids={mergeIds}
          setIds={setMergeIds}
          preview={mergePreview}
          reason={reason}
          setReason={setReason}
          busy={busy}
          notice={notice}
          onPreview={() => void loadMergePreview()}
        />
      </AdminDrawer>
      <AdminDrawer
        open={drawer === "deactivate"}
        onClose={close}
        title="Desactivar cliente"
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={close}
              className="h-10 rounded-lg border border-[#dce6ee] px-4 text-[10px] font-extrabold text-[#304b66]"
            >
              Cancelar
            </button>
            <button
              disabled={busy || !reason.trim()}
              onClick={() => void deactivate()}
              className="h-10 rounded-lg bg-[#ef5350] px-4 text-[10px] font-extrabold text-white disabled:opacity-50"
            >
              Desactivar
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm font-semibold text-[#526b84]">
            Desactivarás a <strong>{selected?.name}</strong>. No se eliminará su historial ni sus
            relaciones.
          </p>
          {notice ? <Notice text={notice} /> : null}
          <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84]">
            Motivo
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="min-h-24 rounded-lg border border-[#dce6ee] p-3 text-xs font-medium outline-none focus:border-[#2277ee]"
              placeholder="Indica por qué se desactiva este cliente."
            />
          </label>
          {notice?.includes("operaciones abiertas") ? (
            <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] font-semibold text-amber-900">
              <input
                type="checkbox"
                checked={force}
                onChange={(event) => setForce(event.target.checked)}
                className="mt-0.5"
              />
              Entiendo el impacto y quiero desactivar de todos modos.
            </label>
          ) : null}
        </div>
      </AdminDrawer>
    </div>
  );
}

function SelectFilter({
  name,
  label,
  values,
  queryString,
  labels = {},
}: {
  name: string;
  label: string;
  values: string[];
  queryString: string;
  labels?: Record<string, string>;
}) {
  const active = new URLSearchParams(queryString).get(name) ?? "";
  return (
    <label className="relative">
      <select
        name={name}
        aria-label={label}
        defaultValue={active}
        className="has-custom-chevron h-10 appearance-none rounded-lg border border-[#dce6ee] bg-white py-0 pl-3 pr-8 text-[10px] font-extrabold text-[#304b66]"
      >
        <option value="">{label}</option>
        {values.map((value) => (
          <option key={value} value={value}>
            {labels[value] ?? value}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-3.5 w-3.5 text-[#6d84a0]" />
    </label>
  );
}
function DateFilter({
  name,
  label,
  queryString,
}: {
  name: string;
  label: string;
  queryString: string;
}) {
  return (
    <label className="grid gap-1 text-[9px] font-extrabold text-[#526b84]">
      {label}
      <input
        type="date"
        name={name}
        defaultValue={new URLSearchParams(queryString).get(name) ?? ""}
        className="h-10 rounded-lg border border-[#dce6ee] bg-white px-3 text-[10px] font-semibold text-[#304b66]"
      />
    </label>
  );
}
function CustomerTableRow({
  row,
  canManage,
  canCrmManage,
  canQuotesCreate,
  canSalesView,
  canOrdersView,
  actionOpen,
  onAction,
  onOpen,
  onEdit,
  onDeactivate,
  onMerge,
}: {
  row: CustomerListItem;
  canManage: boolean;
  canCrmManage: boolean;
  canQuotesCreate: boolean;
  canSalesView: boolean;
  canOrdersView: boolean;
  actionOpen: boolean;
  onAction: () => void;
  onOpen: (action?: "activity" | "task") => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onMerge: () => void;
}) {
  const canDeactivate = row.status !== "INACTIVE";
  const statusLabel = statusLabels[row.status] ?? row.status;
  const statusTone = row.status === "ACTIVE"
    ? "bg-[#e4f7ef] text-[#159263]"
    : row.status === "INACTIVE"
      ? "bg-[#f3f5f7] text-[#71869c]"
      : "bg-[#fff0df] text-[#c96f16]";
  const hasActions = canManage || canCrmManage || canQuotesCreate || canSalesView || canOrdersView;
  return (
    <tr className="border-t border-[#edf2f6] text-[10px] font-semibold text-[#526b84] hover:bg-[#fbfdff]">
      <td className="px-3 py-3">
        <button type="button" onClick={() => onOpen()} className="text-left">
          <span className="block font-extrabold text-[#173654]">{row.name}</span>
          <span className="mt-0.5 block text-[9px] text-[#8296a9]">
            {row.ruc
              ? `RUC ${row.ruc}`
              : row.documentNumber
                ? `Doc. ${row.documentNumber}`
                : (row.legalName ?? "Sin documento registrado")}
          </span>
        </button>
      </td>
      <td className="px-3 py-3">
        <span className="rounded bg-[#e8f1ff] px-1.5 py-1 text-[8px] font-extrabold text-[#2277ee]">
          {typeLabels[row.customerType] ?? row.customerType}
        </span>
      </td>
      <td className="px-3 py-3">{row.legalName ?? row.name}</td>
      <td className="px-3 py-3">{row.phone ?? row.whatsapp ?? "—"}</td>
      <td className="max-w-36 truncate px-3 py-3">{row.email ?? "—"}</td>
      <td className="px-3 py-3">{row.location ?? "—"}</td>
      <td className="px-3 py-3">
        <span className="block font-bold text-[#304b66]">{activityText(row)}</span>
        <span className="text-[9px] text-[#8296a9]">{dateText(row.lastActivityAt)}</span>
      </td>
      <td className="px-3 py-3">
        <span
          className={`rounded-md px-2 py-1 text-[8px] font-extrabold ${statusTone}`}
        >
          {statusLabel}
        </span>
      </td>
      <td className="px-3 py-3">
        {row.assignedSeller?.name ?? row.assignedSeller?.email ?? "Sin asignar"}
      </td>
      <td className="relative px-3 py-3">
        {hasActions ? (
          <>
            <button
              type="button"
              onClick={onAction}
              className="rounded p-1 text-[#526b84] hover:bg-[#edf4fa]"
              aria-label={`Acciones de ${row.name}`}
            >
              <EllipsisVertical className="h-4 w-4" />
            </button>
            {actionOpen ? (
              <div className="absolute right-3 top-10 z-20 w-40 rounded-lg border border-[#dce6ee] bg-white p-1.5 shadow-xl">
                <button
                  type="button"
                  onClick={() => onOpen()}
                  className="block w-full rounded px-2.5 py-2 text-left text-[10px] font-bold text-[#304b66] hover:bg-[#f4f8fc]"
                >
                  Ver cliente 360°
                </button>
                {canCrmManage ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onOpen("activity")}
                      className="block w-full rounded px-2.5 py-2 text-left text-[10px] font-bold text-[#304b66] hover:bg-[#f4f8fc]"
                    >
                      Registrar actividad
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpen("task")}
                      className="block w-full rounded px-2.5 py-2 text-left text-[10px] font-bold text-[#304b66] hover:bg-[#f4f8fc]"
                    >
                      Crear tarea
                    </button>
                    <Link
                      href={`/admin/crm?customerId=${encodeURIComponent(row.id)}&open=new`}
                      className="block w-full rounded px-2.5 py-2 text-left text-[10px] font-bold text-[#304b66] hover:bg-[#f4f8fc]"
                    >
                      Crear oportunidad
                    </Link>
                  </>
                ) : null}
                {canQuotesCreate ? (
                  <Link
                    href={`/admin/cotizaciones?customerId=${encodeURIComponent(row.id)}&new=1`}
                    className="block w-full rounded px-2.5 py-2 text-left text-[10px] font-bold text-[#304b66] hover:bg-[#f4f8fc]"
                  >
                    Crear cotización
                  </Link>
                ) : null}
                {canSalesView ? (
                  <Link
                    href={`/admin/ventas?customerId=${encodeURIComponent(row.id)}`}
                    className="block w-full rounded px-2.5 py-2 text-left text-[10px] font-bold text-[#304b66] hover:bg-[#f4f8fc]"
                  >
                    Ver ventas
                  </Link>
                ) : null}
                {canOrdersView ? (
                  <Link
                    href={`/admin/pedidos?customerId=${encodeURIComponent(row.id)}`}
                    className="block w-full rounded px-2.5 py-2 text-left text-[10px] font-bold text-[#304b66] hover:bg-[#f4f8fc]"
                  >
                    Ver pedidos
                  </Link>
                ) : null}
                {canManage ? (
                  <>
                    <button
                      type="button"
                      onClick={onEdit}
                      className="block w-full rounded px-2.5 py-2 text-left text-[10px] font-bold text-[#304b66] hover:bg-[#f4f8fc]"
                    >
                      Editar cliente
                    </button>
                    <button
                      type="button"
                      onClick={onMerge}
                      className="block w-full rounded px-2.5 py-2 text-left text-[10px] font-bold text-[#304b66] hover:bg-[#f4f8fc]"
                    >
                      Fusionar
                    </button>
                    {canDeactivate ? (
                      <button
                        type="button"
                        onClick={onDeactivate}
                        className="block w-full rounded px-2.5 py-2 text-left text-[10px] font-bold text-[#d94848] hover:bg-red-50"
                      >
                        Desactivar
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </td>
    </tr>
  );
}
function CustomerCard({ row, onOpen }: { row: CustomerListItem; onOpen: () => void }) {
  const statusLabel = statusLabels[row.status] ?? row.status;
  const statusClass = row.status === "ACTIVE"
    ? "text-[#159263]"
    : row.status === "INACTIVE"
      ? "text-[#8296a9]"
      : "text-[#c96f16]";
  return (
    <button onClick={onOpen} className="rounded-lg border border-[#edf2f6] p-3 text-left">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold text-[#173654]">{row.name}</p>
          <p className="mt-1 text-[10px] text-[#8296a9]">
            {row.email ?? row.phone ?? "Sin contacto"}
          </p>
        </div>
        <span className="rounded bg-[#e8f1ff] px-1.5 py-1 text-[8px] font-extrabold text-[#2277ee]">
          {typeLabels[row.customerType] ?? row.customerType}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px]">
        <span className="text-[#8296a9]">{activityText(row)}</span>
        <span className={statusClass}>
          {statusLabel}
        </span>
      </div>
    </button>
  );
}
function Pager({
  page,
  totalPages,
  totalItems,
  pageSize,
  queryString,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  queryString: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf2f6] px-4 py-3 text-[10px] font-semibold text-[#71869c]">
      <span>
        Mostrando {totalItems ? (page - 1) * pageSize + 1 : 0} a{" "}
        {Math.min(page * pageSize, totalItems)} de {totalItems} clientes
      </span>
      <div className="flex items-center gap-1">
        <Link
          aria-disabled={page <= 1}
          href={pageHref(queryString, Math.max(1, page - 1))}
          className="rounded px-2 py-1.5 hover:bg-[#edf4fa]"
        >
          Anterior
        </Link>
        {[page, page + 1]
          .filter(
            (item, index, all) => item >= 1 && item <= totalPages && all.indexOf(item) === index,
          )
          .map((item) => (
            <Link
              key={item}
              href={pageHref(queryString, item)}
              className={`rounded px-2.5 py-1.5 font-extrabold ${item === page ? "bg-[#2277ee] text-white" : "hover:bg-[#edf4fa]"}`}
            >
              {item}
            </Link>
          ))}
        <Link
          aria-disabled={page >= totalPages}
          href={pageHref(queryString, Math.min(totalPages, page + 1))}
          className="rounded px-2 py-1.5 hover:bg-[#edf4fa]"
        >
          Siguiente
        </Link>
      </div>
    </div>
  );
}
function Distribution({
  title,
  rows,
  total,
  formatLabel,
}: {
  title: string;
  rows: Array<{ label: string; count: number }>;
  total: number;
  formatLabel?: (label: string) => string;
}) {
  const grouped = new Map<string, number>();
  for (const row of rows) {
    const label = formatLabel?.(row.label) ?? row.label;
    grouped.set(label, (grouped.get(label) ?? 0) + row.count);
  }
  const displayRows = [...grouped.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  return (
    <section className="rounded-xl border border-[#e2eaf1] bg-white p-3.5 shadow-[0_1px_3px_rgba(16,42,67,0.035)]">
      <h2 className="text-[13px] font-extrabold text-[#102a43]">{title}</h2>
      <div className="mt-3 grid gap-2.5">
        {displayRows.length ? (
          displayRows.map((row) => {
            const pct = total ? Math.max(4, Math.round((row.count / total) * 100)) : 0;
            return (
              <div key={row.label}>
                <div className="flex justify-between text-[10px] font-semibold text-[#526b84]">
                  <span>{row.label}</span>
                  <span>
                    {row.count} ({pct}%)
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#edf2f6]">
                  <span
                    className="block h-full rounded-full bg-[#2277ee]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-[10px] text-[#8296a9]">Sin ubicación registrada.</p>
        )}
      </div>
      <Link
        href="/admin/reportes"
        className="mt-4 inline-flex items-center gap-1 text-[10px] font-extrabold text-[#2277ee]"
      >
        Ver reporte completo →
      </Link>
    </section>
  );
}
function AttentionPanel({
  rows,
  queryString,
}: {
  rows: Array<{ key: CustomerAttentionKey; label: string; count: number }>;
  queryString: string;
}) {
  return (
    <section className="rounded-xl border border-[#e2eaf1] bg-white p-3.5 shadow-[0_1px_3px_rgba(16,42,67,0.035)]">
      <h2 className="text-[13px] font-extrabold text-[#102a43]">Requieren atención</h2>
      <p className="mt-1 text-[10px] font-semibold text-[#8296a9]">
        Casos que necesitan una acción comercial.
      </p>
      <div className="mt-3 grid gap-2">
        {rows.map((row) => (
          <Link
            key={row.key}
            href={filterHref(queryString, "attention", row.key)}
            className="flex items-center justify-between gap-3 rounded-lg border border-[#edf2f6] bg-[#fbfcfd] px-3 py-2.5 text-[10px] font-extrabold text-[#526b84] hover:border-[#b9d2f5] hover:bg-[#f4f8ff]"
          >
            <span>{attentionLabels[row.key] ?? row.label}</span>
            <span className="min-w-6 rounded-full bg-[#fff0e0] px-1.5 py-1 text-center text-[9px] text-[#f58b20]">
              {row.count}
            </span>
          </Link>
        ))}
      </div>
      <Link
        href={filterHref(queryString, "needsAttention", "true", ["attention"])}
        className="mt-4 inline-flex items-center gap-1 text-[10px] font-extrabold text-[#2277ee]"
      >
        Ver toda la cartera por atender →
      </Link>
    </section>
  );
}
function CreateCustomerForm({
  create,
  update,
  duplicates,
  busy,
  onCheck,
  overrideReason,
  setOverrideReason,
  notice,
  mode = "create",
  step = 1,
  sellers = [],
}: {
  create: CreateState;
  update: (key: keyof CreateState, value: string) => void;
  duplicates: Duplicate[];
  busy: boolean;
  onCheck: () => void;
  overrideReason: string;
  setOverrideReason: (value: string) => void;
  notice: string | null;
  mode?: "create" | "edit";
  step?: number;
  sellers?: Array<{ id: string; name: string | null; email: string | null }>;
}) {
  const strong = duplicates.some((item) => item.strong);
  const currentStep = mode === "create" ? step : 0;
  return (
    <div className="space-y-4">
      {notice ? <Notice text={notice} /> : null}
      {mode === "create" ? (
        <>
          <p className="text-[11px] font-semibold text-[#71869c]">
            Completa los datos por etapas. Antes de guardar se revisan RUC, documento, email,
            teléfono y WhatsApp para prevenir duplicados.
          </p>
          <ol className="grid grid-cols-3 gap-2" aria-label="Pasos para crear un cliente">
            {[
              [1, "Identidad"],
              [2, "Contacto"],
              [3, "Relación"],
            ].map(([value, label]) => (
              <li
                key={value}
                className={`rounded-lg border px-2.5 py-2 text-center text-[10px] font-extrabold ${currentStep === value ? "border-[#2277ee] bg-[#e8f1ff] text-[#2277ee]" : "border-[#edf2f6] text-[#8296a9]"}`}
              >
                <span className="mr-1">{value}.</span>{label}
              </li>
            ))}
          </ol>
        </>
      ) : null}
      {mode === "edit" || currentStep === 1 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84]">
            <span>Tipo de cliente *</span>
            <select
              value={create.customerType}
              onChange={(event) => update("customerType", event.target.value)}
              className="h-10 rounded-lg border border-[#dce6ee] px-3 text-xs font-semibold"
            >
              <option value="COMPANY">Empresa corporativa</option>
              <option value="PERSON">Persona</option>
              <option value="EMPRESA">Empresa</option>
              <option value="CONSUMIDOR">Consumidor</option>
              <option value="TECNICO">Técnico</option>
              <option value="DISTRIBUIDOR">Distribuidor</option>
              <option value="MAYORISTA">Mayorista</option>
            </select>
          </label>
          <Field
            label="Nombre / razón social *"
            value={create.name}
            onChange={(value) => update("name", value)}
          />
          <Field
            label="Razón social o nombre comercial"
            value={create.legalName}
            onChange={(value) => update("legalName", value)}
          />
          <Field label="RUC" value={create.ruc} onChange={(value) => update("ruc", value)} />
          <Field
            label="Documento"
            value={create.documentNumber}
            onChange={(value) => update("documentNumber", value)}
          />
        </div>
      ) : null}
      {mode === "edit" || currentStep === 2 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Teléfono"
            value={create.phone}
            onChange={(value) => update("phone", value)}
          />
          <Field
            label="WhatsApp"
            value={create.whatsapp}
            onChange={(value) => update("whatsapp", value)}
          />
          <Field
            label="Email"
            value={create.email}
            type="email"
            onChange={(value) => update("email", value)}
          />
          <Field
            label="Ciudad / ubicación"
            value={create.location}
            onChange={(value) => update("location", value)}
          />
          <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84]">
            <span>Preferencia de contacto</span>
            <select
              value={create.contactPreference}
              onChange={(event) => update("contactPreference", event.target.value)}
              className="h-10 rounded-lg border border-[#dce6ee] px-3 text-xs font-semibold"
            >
              <option value="WHATSAPP">WhatsApp</option>
              <option value="PHONE">Teléfono</option>
              <option value="EMAIL">Email</option>
            </select>
          </label>
        </div>
      ) : null}
      {mode === "edit" || currentStep === 3 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84] sm:col-span-2">
            <span>Responsable</span>
            <select
              value={create.assignedSellerId}
              onChange={(event) => update("assignedSellerId", event.target.value)}
              className="h-10 rounded-lg border border-[#dce6ee] px-3 text-xs font-semibold"
            >
              <option value="">Sin responsable</option>
              {sellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.name ?? seller.email ?? "Responsable sin nombre"}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Contacto principal"
            value={create.primaryContactName}
            onChange={(value) => update("primaryContactName", value)}
          />
          <Field
            label="Cargo"
            value={create.primaryContactRole}
            onChange={(value) => update("primaryContactRole", value)}
          />
          <Field
            label="Teléfono del contacto"
            value={create.primaryContactPhone}
            onChange={(value) => update("primaryContactPhone", value)}
          />
          <Field
            label="WhatsApp del contacto"
            value={create.primaryContactWhatsapp}
            onChange={(value) => update("primaryContactWhatsapp", value)}
          />
          <Field
            label="Email del contacto"
            value={create.primaryContactEmail}
            type="email"
            onChange={(value) => update("primaryContactEmail", value)}
          />
          <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84]">
            <span>Tipo de dirección</span>
            <select
              value={create.addressLabel}
              onChange={(event) => update("addressLabel", event.target.value)}
              className="h-10 rounded-lg border border-[#dce6ee] px-3 text-xs font-semibold"
            >
              <option value="Fiscal">Fiscal</option>
              <option value="Entrega">Entrega</option>
              <option value="Sucursal">Sucursal</option>
              <option value="Almacén">Almacén</option>
              <option value="Otra">Otra</option>
            </select>
          </label>
          <Field
            label="Dirección"
            value={create.address}
            onChange={(value) => update("address", value)}
          />
          <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84] sm:col-span-2">
            <span>Notas internas</span>
            <textarea
              value={create.notes}
              onChange={(event) => update("notes", event.target.value)}
              className="min-h-20 rounded-lg border border-[#dce6ee] p-2.5 text-xs font-medium text-[#304b66] outline-none focus:border-[#2277ee]"
            />
          </label>
        </div>
      ) : null}
      {mode === "create" && currentStep === 3 ? (
        <button
          disabled={busy || !create.name.trim()}
          onClick={onCheck}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#2277ee] px-3 text-[10px] font-extrabold text-[#2277ee] disabled:opacity-50"
        >
          {busy ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Revisar duplicados
        </button>
      ) : null}
      {mode === "create" && currentStep === 3 && duplicates.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-extrabold text-amber-900">Posible cliente existente</p>
          <div className="mt-2 grid gap-2">
            {duplicates.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-amber-100 bg-white p-2.5 text-[10px]"
              >
                <p className="font-extrabold text-[#304b66]">{item.name}</p>
                <p className="mt-1 text-[#71869c]">
                  {item.ruc ??
                    item.documentNumber ??
                    item.email ??
                    item.phone ??
                    "Sin identificador"}
                </p>
                <p className="mt-1 text-amber-800">
                  Coincidencias: {item.matches.map((match) => match.field).join(", ")}
                </p>
              </div>
            ))}
          </div>
          {strong ? (
            <label className="mt-3 grid gap-1.5 text-[10px] font-extrabold text-amber-900">
              Motivo obligatorio para crear de todos modos
              <textarea
                value={overrideReason}
                onChange={(event) => setOverrideReason(event.target.value)}
                className="min-h-20 rounded-lg border border-amber-200 bg-white p-2.5 text-xs font-medium text-[#304b66]"
              />
            </label>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84]">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-lg border border-[#dce6ee] px-3 text-xs font-semibold text-[#304b66] outline-none focus:border-[#2277ee]"
      />
    </label>
  );
}
function MergeForm({
  customers,
  ids,
  setIds,
  preview,
  reason,
  setReason,
  busy,
  notice,
  onPreview,
}: {
  customers: Array<{ id: string; name: string }>;
  ids: { primaryId: string; secondaryId: string };
  setIds: (value: { primaryId: string; secondaryId: string }) => void;
  preview: Record<string, unknown> | null;
  reason: string;
  setReason: (value: string) => void;
  busy: boolean;
  notice: string | null;
  onPreview: () => void;
}) {
  const moved = preview?.moved as Record<string, unknown> | undefined;
  return (
    <div className="space-y-4">
      {notice ? <Notice text={notice} /> : null}
      <p className="text-[11px] font-semibold text-[#71869c]">
        La fusión es transaccional. El secundario queda inactivo con referencia al cliente
        principal; no se elimina historial.
      </p>
      <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84]">
        Principal
        <select
          value={ids.primaryId}
          onChange={(event) => setIds({ ...ids, primaryId: event.target.value })}
          className="h-10 rounded-lg border border-[#dce6ee] px-3 text-xs font-semibold"
        >
          <option value="">Selecciona cliente</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84]">
        Secundario
        <select
          value={ids.secondaryId}
          onChange={(event) => setIds({ ...ids, secondaryId: event.target.value })}
          className="h-10 rounded-lg border border-[#dce6ee] px-3 text-xs font-semibold"
        >
          <option value="">Selecciona cliente</option>
          {customers
            .filter((customer) => customer.id !== ids.primaryId)
            .map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
        </select>
      </label>
      <button
        disabled={busy || !ids.primaryId || !ids.secondaryId}
        onClick={onPreview}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#2277ee] px-3 text-[10px] font-extrabold text-[#2277ee] disabled:opacity-50"
      >
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        Ver impacto
      </button>
      {preview ? (
        <div className="rounded-xl border border-[#d9e7f5] bg-[#f7fbff] p-3">
          <p className="text-xs font-extrabold text-[#173654]">Se moverán</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {Object.entries(moved ?? {}).map(([key, value]) => (
              <div key={key} className="rounded-lg bg-white p-2 text-center">
                <p className="text-sm font-black text-[#102a43]">{String(value)}</p>
                <p className="text-[8px] font-extrabold uppercase text-[#71869c]">{key}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <label className="grid gap-1.5 text-[10px] font-extrabold text-[#526b84]">
        Motivo de la fusión *
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="min-h-20 rounded-lg border border-[#dce6ee] p-3 text-xs font-medium outline-none focus:border-[#2277ee]"
        />
      </label>
    </div>
  );
}
function Notice({ text }: { text: string }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] font-semibold text-amber-900"
    >
      {text}
    </div>
  );
}
