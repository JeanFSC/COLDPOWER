import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { AdminDashboardView } from "@/components/admin/AdminDashboardView";
import { requirePermission } from "@/lib/auth";
import { parseOperationsFilters } from "@/lib/operations-contract";
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

export default async function OperationsWorkspacePage({ searchParams }: { searchParams?: Promise<Params> }) {
  const actor = await requirePermission("operations.view");
  const query = toQuery((await searchParams) ?? {});
  const filters = parseOperationsFilters(query);
  let actorName: string | null = null;
  try {
    const [profile] = await getDb()
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, actor.userId))
      .limit(1);
    actorName = profile?.name ?? profile?.email ?? null;
  } catch (error) {
    console.error("ColdPower: no se pudo cargar el nombre del actor operativo", error);
  }
  let snapshot: Awaited<ReturnType<typeof getOperationsWorkspace>> | null = null;
  try {
    snapshot = await getOperationsWorkspace(filters, { allowedPermissions: permissionsForRole(actor.role) });
  } catch (error) {
    console.error("ColdPower: no se pudo cargar el centro operativo", error);
  }

  return snapshot ? (
    <AdminDashboardView
      role={actor.role}
      data={null}
      snapshot={snapshot}
      view="operations"
      range={filters.range === "all" ? "month" : filters.range}
      actorName={actorName}
    />
  ) : (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
      No se pudo consultar el centro operativo. No se muestran datos inventados.
    </div>
  );
}
