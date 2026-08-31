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
  try {
    data = await getOperationsDashboard(filters, actor);
  } catch (error) {
    console.error("ColdPower: no se pudo cargar el dashboard", error);
  }
  let actorName: string | null = null;
  try {
    const [profile] = await getDb()
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, actor.userId))
      .limit(1);
    actorName = profile?.name ?? profile?.email ?? null;
  } catch (error) {
    console.error("ColdPower: no se pudo cargar el nombre del actor", error);
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
