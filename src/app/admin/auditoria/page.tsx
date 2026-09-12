import type { Metadata } from "next";
import { Tanda2Audit } from "@/components/admin/AdminTanda2Workspaces";
import { requirePermission } from "@/lib/auth";
import { parseAuditFilters, type AuditPageResponse } from "@/lib/audit-contract";
import { getAuditPage } from "@/lib/audit-repository";

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

function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.slice(0, 4).map(formatAuditValue).join(", ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .slice(0, 4)
      .map(([key, item]) => `${key}: ${formatAuditValue(item)}`)
      .join("; ");
  }
  return String(value);
}

function summarizeSnapshot(value: Record<string, unknown> | null | undefined) {
  if (!value) return "—";
  const entries = Object.entries(value).filter(([, item]) => item !== undefined && item !== null);
  if (!entries.length) return "—";
  return entries.slice(0, 3).map(([key, item]) => `${key}: ${formatAuditValue(item)}`).join(" · ");
}

const emptyPage: AuditPageResponse = {
  items: [],
  page: 1,
  pageSize: 25,
  totalItems: 0,
  totalPages: 1,
  metrics: { total: 0, critical: 0, actors: 0, failedAttempts: null },
  facets: { modules: [], actions: [], entityTypes: [], severities: [] },
};

export default async function AdminAuditoriaPage({
  searchParams,
}: {
  searchParams?: Promise<Params>;
}) {
  await requirePermission("audit.view");
  const params = (await searchParams) ?? {};
  const query = toQuery(params);
  let page = emptyPage;
  let loadError = false;

  try {
    page = await getAuditPage(parseAuditFilters(query));
  } catch (error) {
    console.error("ColdPower: no se pudo cargar la auditoría", error);
    loadError = true;
  }

  const rows = page.items.map((entry) => ({
    id: entry.id,
    date: entry.createdAt.toLocaleString("es-PE"),
    user: entry.actorId || "SYSTEM",
    action: entry.action,
    entity: `${entry.entityType} / ${entry.entityId}`,
    module: entry.module,
    severity: entry.severity,
    result: "SUCCESS",
    actorRole: entry.actorRole,
    requestId: entry.requestId,
    correlationId: entry.correlationId,
    metadata: JSON.stringify(entry.metadata ?? {}, null, 2),
    before: summarizeSnapshot(entry.before),
    after: summarizeSnapshot(entry.after),
    origin: entry.origin ?? undefined,
    tone: entry.severity === "CRITICAL" ? "red" as const : entry.severity === "WARNING" ? "orange" as const : "blue" as const,
  }));

  const exportHref = `/api/admin/auditoria/export${query.toString() ? `?${query.toString()}` : ""}`;
  const controls = (
    <form id="audit-filters" method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="grid gap-1 text-[10px] font-bold text-[#526b84]">Buscar<input name="query" defaultValue={query.get("query") ?? ""} placeholder="ID, acción, actor..." className="h-9 rounded-lg border border-[#dce6ee] px-2 text-[10px]" /></label>
      <label className="grid gap-1 text-[10px] font-bold text-[#526b84]">Módulo<select name="module" defaultValue={query.get("module") ?? ""} className="h-9 rounded-lg border border-[#dce6ee] px-2 text-[10px]"><option value="">Todos</option>{page.facets.modules.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label className="grid gap-1 text-[10px] font-bold text-[#526b84]">Severidad<select name="severity" defaultValue={query.get("severity") ?? ""} className="h-9 rounded-lg border border-[#dce6ee] px-2 text-[10px]"><option value="">Todas</option>{page.facets.severities.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label className="grid gap-1 text-[10px] font-bold text-[#526b84]">Desde<input type="date" name="dateFrom" defaultValue={query.get("dateFrom") ?? ""} className="h-9 rounded-lg border border-[#dce6ee] px-2 text-[10px]" /></label>
      <label className="grid gap-1 text-[10px] font-bold text-[#526b84]">Hasta<input type="date" name="dateTo" defaultValue={query.get("dateTo") ?? ""} className="h-9 rounded-lg border border-[#dce6ee] px-2 text-[10px]" /></label>
      <div className="flex items-end sm:col-span-2 lg:col-span-4"><button type="submit" className="h-9 rounded-lg bg-[#102f51] px-4 text-[10px] font-extrabold text-white">Aplicar filtros</button></div>
    </form>
  );
  return (
    <Tanda2Audit
      rows={rows}
      metrics={page.metrics}
      pagination={{ page: page.page, totalPages: page.totalPages, totalItems: page.totalItems }}
      exportHref={exportHref}
      selectedId={query.get("eventId") ?? undefined}
      baseQuery={query.toString()}
      controls={loadError ? <p className="rounded-lg border border-[#e3ebf2] p-3 text-[11px] text-[#7d91a5]">No se pudo conectar a la base de datos. Mostrando un estado vacío.</p> : controls}
    />
  );
}
