import type { Metadata } from "next";
import { AuditModule } from "@/components/admin/AdminAuditModule";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import { diffAuditSnapshots, parseAuditFilters, presentAuditItem, type AuditListItem, type AuditPageResponse } from "@/lib/audit-contract";
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
  const baseParams = new URLSearchParams(query);
  baseParams.delete("page");
  baseParams.delete("eventId");
  baseParams.delete("tab");
  const baseQuery = baseParams.toString();

  const [pageResult, selectedResult, savedFilters] = await Promise.all([
    Promise.resolve().then(() => getAuditPage(parseAuditFilters(query))).catch((error) => {
      console.error("ColdPower: no se pudo cargar la auditoría", error);
      return null;
    }),
    eventId ? getAuditDetail(eventId).catch(() => null) : Promise.resolve(null),
    listSavedAuditFilters(actor.userId).catch(() => []),
  ]);
  // Everything handed to the client component is serialized into the page payload, so
  // redaction must happen here, not only in what the UI chooses to render.
  const present = <T extends AuditListItem>(item: T) => presentAuditItem(item, canViewSensitive, sanitizeAuditValue);
  const page = pageResult ? { ...pageResult, items: pageResult.items.map(present) } : emptyPage;
  const loadError = pageResult === null;

  const selected = selectedResult ? present(selectedResult) : null;

  const relatedEvents = selected ? (await getRelatedAuditEvents(selectedResult!).catch(() => [])).map(present) : [];
  const diff = selected && canViewSensitive ? diffAuditSnapshots(selected.before, selected.after) : [];

  const exportHref = `/api/admin/auditoria/export${query.toString() ? `?${query.toString()}` : ""}`;

  return (
    <AuditModule
      metrics={page.metrics}
      trend={page.trend}
      trendPrevious={page.trendPrevious}
      alerts={page.alerts}
      rows={page.items}
      pagination={{ page: page.page, totalPages: page.totalPages, totalItems: page.totalItems }}
      facets={{ modules: page.facets.modules, severities: page.facets.severities }}
      filters={{
        query: query.get("query") ?? undefined,
        module: query.get("module") ?? undefined,
        severity: query.get("severity") ?? undefined,
        dateFrom: query.get("dateFrom") ?? undefined,
        dateTo: query.get("dateTo") ?? undefined,
      }}
      baseQuery={baseQuery}
      exportHref={exportHref}
      selected={selected}
      relatedEvents={relatedEvents}
      diff={diff}
      canViewSensitive={canViewSensitive}
      tab={tab}
      savedFilters={savedFilters}
      loadError={loadError}
    />
  );
}
