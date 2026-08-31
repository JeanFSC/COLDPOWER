import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
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
  let actorName: string | null = null;
  const [dashboardResult, actorResult] = await Promise.allSettled([
    getOperationsDashboard(filters, actor),
    getDb().select({ name: users.name, email: users.email }).from(users).where(eq(users.id, actor.userId)).limit(1),
  ]);
  if (dashboardResult.status === "fulfilled") {
    data = dashboardResult.value;
  } else {
    console.error("ColdPower: no se pudo cargar el dashboard", dashboardResult.reason);
  }
  if (actorResult.status === "fulfilled") {
    const [profile] = actorResult.value;
    actorName = profile?.name ?? profile?.email ?? null;
  } else {
    console.error("ColdPower: no se pudo cargar el nombre del actor", actorResult.reason);
  }
  return (
    <AdminDashboardView
      role={actor.role}
      data={data}
      snapshot={null}
      range={filters.range}
      actorName={actorName}
    />
  );
}
