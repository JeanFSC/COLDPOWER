import type { Metadata } from "next";
import { AdminDashboardView } from "@/components/admin/AdminDashboardView";
import { DashboardInvalidFilterError, parseDashboardFilters, type DashboardFilters } from "@/lib/dashboard-contract";
import { getOperationsDashboard } from "@/lib/operations-dashboard";
import { requirePermission } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Panel admin | ColdPower",
  description: "Dashboard ejecutivo de ColdPower.",
};

type Params = Record<string, string | string[] | undefined>;

export default async function AdminDashboardPage({ searchParams }: { searchParams?: Promise<Params> }) {
  const actor = await requirePermission("dashboard.view");
  const params = (await searchParams) ?? {};
  const query = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) query.set(key, Array.isArray(raw) ? raw[0] ?? "" : raw ?? "");
  let filters: DashboardFilters = { range: "month" };
  try { filters = parseDashboardFilters(query); } catch (error) { if (!(error instanceof DashboardInvalidFilterError)) throw error; }
  let data: Awaited<ReturnType<typeof getOperationsDashboard>> | null = null;
  try {
    data = await getOperationsDashboard(filters, actor);
  } catch (error) {
    console.error("ColdPower: no se pudo cargar el dashboard", error);
  }
  return <AdminDashboardView role={actor.role} data={data} snapshot={null} range={filters.range} />;
}
