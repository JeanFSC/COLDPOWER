import type { Metadata } from "next";
import { AuditModule } from "@/components/admin/AdminAuditModule";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import { diffAuditSnapshots, presentAuditItem, type AuditListItem, type AuditPageResponse } from "@/lib/audit-contract";
import { resolveAuditPageFilters } from "@/lib/audit-page-filters";
import { sanitizeAuditValue } from "@/lib/operational-semantics";
import { getAuditPage, getAuditDetail, getRelatedAuditEvents, listSavedAuditFilters } from "@/lib/audit-repository";

export const metadata: Metadata = {
  title: "Auditoría | Panel admin ColdPower",
  description: "Historial append-only de cambios operativos de ColdPower.",
};

type Params = Record<string, string | string[] | undefined>;

function toQuery(params: Params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value) && value[0]) query.set(key, value[0]);
  }
  return query;
}

const emptyPage: AuditPageResponse = {
  items: [], page: 1, pageSize: 25, totalItems: 0, totalPages: 1,
  metrics: {
    events: { current: 0, previous: 0, deltaPct: null }, critical: { current: 0, previous: 0, deltaPct: null },
    sensitive: { current: 0, previous: 0, deltaPct: null }, logins: { current: 0, previous: 0, deltaPct: null },
    integrationErrors: { current: 0, previous: 0, deltaPct: null }, failed: { current: 0, previous: 0, deltaPct: null },
  },
  facets: { modules: [], severities: [] },
  trend: [], trendPrevious: [], alerts: [],
};

export default async function AdminAuditoriaPage({ searchParams }: { searchParams?: Promise<Params> }) {
  const actor = await requirePermission("audit.view");
  const canViewSensitive = can(actor.role, "audit.sensitive.view");
  const params = (await searchParams) ?? {};
  const query = toQuery(params);
  const eventId = query.get("eventId") ?? undefined;
  const tabParam = query.get("tab");
  const tab: "info" | "cambios" | "relacionado" = tabParam === "cambios" || tabParam === "relacionado" ? tabParam : "info";

  // baseQuery drives every href the page builds (pagination, tabs, row links, saved
  // filters) — it is the current filter set with page/eventId/tab stripped, so those
  // three are always set explicitly by the link building them, never inherited by accident.
  const { filters, filterNotice, baseQuery, exportHref } = resolveAuditPageFilters(query);

  const [pageResult, detailResult, savedFilterResult] = await Promise.all([
    getAuditPage(filters).catch((error) => {
      console.error("ColdPower: no se pudo cargar la auditoría", error);
      return null;
    }),
    eventId ? getAuditDetail(eventId).then(item => ({ item, error: null as string | null })).catch((error) => {
      console.error("ColdPower: no se pudo cargar el detalle de auditoría", error);
      return { item: null, error: "No se pudo cargar el evento. Actualiza la página para volver a intentarlo." };
    }) : Promise.resolve({ item: null, error: null }),
    listSavedAuditFilters(actor.userId).then(items => ({ items, error: false })).catch((error) => {
      console.error("ColdPower: no se pudieron cargar los filtros guardados", error);
      return { items: [], error: true };
    }),
  ]);
  // Everything handed to the client component is serialized into the page payload, so
  // redaction must happen here, not only in what the UI chooses to render.
  const present = <T extends AuditListItem>(item: T) => presentAuditItem(item, canViewSensitive, sanitizeAuditValue);
  const page = pageResult ? { ...pageResult, items: pageResult.items.map(present) } : emptyPage;
  const loadError = pageResult === null;
  const selectedResult = detailResult.item;
  const savedFilters = savedFilterResult.items;
  const savedFiltersError = savedFilterResult.error;

  const selected = selectedResult ? present(selectedResult) : null;
  const detailError = detailResult.error ?? (eventId && !selected ? "El evento solicitado no existe." : null);

  const relatedResult = selected ? await getRelatedAuditEvents(selectedResult!).then(items => ({ items, error: false })).catch((error) => {
    console.error("ColdPower: no se pudieron cargar los eventos relacionados", error);
    return { items: [], error: true };
  }) : { items: [], error: false };
  const relatedEvents = relatedResult.items.map(present);
  const relatedEventsError = relatedResult.error;
  const diff = selected && canViewSensitive ? diffAuditSnapshots(selected.before, selected.after) : [];


  return (
    <AuditModule
      actorRole={actor.role}
      metrics={page.metrics}
      trend={page.trend}
      trendPrevious={page.trendPrevious}
      alerts={page.alerts}
      rows={page.items}
      pagination={{ page: page.page, totalPages: page.totalPages, totalItems: page.totalItems }}
      facets={{ modules: page.facets.modules, severities: page.facets.severities }}
      filters={filters}
      baseQuery={baseQuery}
      exportHref={exportHref}
      selected={selected}
      relatedEvents={relatedEvents}
      diff={diff}
      canViewSensitive={canViewSensitive}
      tab={tab}
      savedFilters={savedFilters}
      loadError={loadError}
      filterNotice={filterNotice}
      detailError={detailError}
      relatedEventsError={relatedEventsError}
      savedFiltersError={savedFiltersError}
    />
  );
}
