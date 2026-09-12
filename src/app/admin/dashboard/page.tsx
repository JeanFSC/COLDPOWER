import type { Metadata } from "next";
import { Tanda2Dashboard } from "@/components/admin/AdminTanda2Workspaces";
import { DashboardInvalidFilterError, parseDashboardFilters, type DashboardFilters } from "@/lib/dashboard-contract";
import { getOperationsDashboard, listReportOptions } from "@/lib/operations-dashboard";
import { requirePermission } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Dashboard ejecutivo | Panel admin ColdPower",
  description: "Dashboard ejecutivo comercial, financiero y operativo de ColdPower.",
};

// El dashboard reúne métricas operativas que deben reflejar PostgreSQL en cada
// navegación. Mantenerlo dinámico evita servir una instantánea administrativa
// anterior después de un cambio de ventas, clientes, pedidos o pagos.
export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;

export default async function AdminDashboardPage({ searchParams }: { searchParams?: Promise<Params> }) {
  const actor = await requirePermission("dashboard.view");
  const params = (await searchParams) ?? {};
  const query = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) query.set(key, Array.isArray(raw) ? raw[0] ?? "" : raw ?? "");
  let filters: DashboardFilters = { range: "month" };
  try { filters = parseDashboardFilters(query); } catch (error) { if (!(error instanceof DashboardInvalidFilterError)) throw error; }
  const loadedAt = new Date().toISOString();
  const [dashboardResult, optionsResult] = await Promise.allSettled([
    getOperationsDashboard(filters, actor),
    actor.role === "SUPERADMIN" || actor.role === "GERENCIA" ? listReportOptions() : Promise.resolve(null),
  ]);
  const data = dashboardResult.status === "fulfilled" ? dashboardResult.value : null;
  const filterOptions = optionsResult.status === "fulfilled" ? optionsResult.value : null;
  if (dashboardResult.status === "rejected") console.error("ColdPower: no se pudo cargar el dashboard", dashboardResult.reason);
  return <Tanda2Dashboard role={actor.role} data={data} filterOptions={filterOptions} loadedAt={loadedAt} />;
}
