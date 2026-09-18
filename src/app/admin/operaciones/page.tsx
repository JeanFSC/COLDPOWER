import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { locations, users } from "@/db/schema";
import { OperationsCenter } from "@/components/admin/OperationsCenter";
import { getOperationsDaySummary } from "@/lib/operations-day-summary";
import { requirePermission } from "@/lib/auth";
import { getOperationsComparisonPeriods, parseOperationsFilters } from "@/lib/operations-contract";
import { getOperationsWorkspace } from "@/lib/operations-workspace";
import { permissionsForRole } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Operaciones y ventas | Panel admin ColdPower",
  description: "Centro operativo de cotizaciones, pedidos, clientes, stock y seguimientos.",
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

export default async function OperationsWorkspacePage({
  searchParams,
}: {
  searchParams?: Promise<Params>;
}) {
  const actor = await requirePermission("operations.view");
  const query = toQuery((await searchParams) ?? {});
  if (!query.has("pageSize")) query.set("pageSize", "10");
  if (!query.has("queue")) query.set("queue", "quotes");
  if (!query.has("range")) query.set("range", "all");
  const filters = parseOperationsFilters(query);
  const comparisonPeriods = getOperationsComparisonPeriods(filters);
  const hasCustomRange = Boolean(filters.fromAt && filters.toAt);
  const db = getDb();
  const allowedPermissions = permissionsForRole(actor.role);
  // Only the KPI/comparison reads pass summaryScope: "header" — they read nothing but
  // .metrics/.operationalSignals/.teamLoad, so getOperationsWorkspace short-circuits the
  // expensive queue-loading/upsert path for them. The main snapshot below renders the
  // actual work-item queues and must run the full path (no summaryScope).
  const headerOptions = { allowedPermissions, summaryScope: "header" as const };

  // These seven fetches don't depend on each other's results (only on filters/
  // comparisonPeriods, both derived synchronously above), so they used to pay four
  // sequential Neon round trips for no reason. One Promise.all instead of four waves.
  const [locationRows, sellerRows, snapshot, currentKpisResult, previousKpis, currentDay, previousDay] = await Promise.all([
    db.select({ id: locations.id, name: locations.name }).from(locations).where(eq(locations.active, true)).orderBy(locations.name)
      .catch((error) => { console.error("ColdPower: no se pudo cargar el nombre del actor operativo", error); return []; }),
    db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.status, "ACTIVE")).orderBy(users.name)
      .catch((error) => { console.error("ColdPower: no se pudo cargar el nombre del actor operativo", error); return []; }),
    getOperationsWorkspace(filters, { allowedPermissions })
      .catch((error) => { console.error("ColdPower: no se pudo cargar el centro operativo", error); return null; }),
    hasCustomRange ? Promise.resolve(null) : getOperationsWorkspace(comparisonPeriods.current, headerOptions),
    getOperationsWorkspace(comparisonPeriods.previous, headerOptions),
    getOperationsDaySummary({ ...filters, assigneeId: undefined }),
    getOperationsDaySummary({ ...filters, assigneeId: undefined }, -1),
  ]);
  const operationsFilterOptions = {
    locations: locationRows.map((row) => ({ id: row.id, label: row.name })),
    sellers: sellerRows.map((row) => ({ id: row.id, label: row.name ?? row.email ?? row.id })),
  };
  if (!snapshot) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        No se pudo consultar el centro operativo. No se muestran datos inventados.
      </div>
    );
  }
  const currentKpis = currentKpisResult ?? snapshot;

  return (
    <OperationsCenter
      role={actor.role}
      snapshot={snapshot}
      filters={filters}
      filterOptions={operationsFilterOptions}
      day={currentDay}
      comparison={{
        current: currentKpis,
        previous: previousKpis,
        previousDay,
        label: comparisonPeriods.label,
      }}
    />
  );
}
