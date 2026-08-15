import type { Metadata } from "next";
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
  let snapshot: Awaited<ReturnType<typeof getOperationsWorkspace>> | null = null;
  try {
    snapshot = await getOperationsWorkspace(parseOperationsFilters(query), { allowedPermissions: permissionsForRole(actor.role) });
  } catch (error) {
    console.error("ColdPower: no se pudo cargar el centro operativo", error);
  }
  return <div><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-black text-[#102a43]">Centro operativo</h1><p className="mt-1 text-sm text-[#8195aa]">Colas de cotizaciones, oportunidades, pedidos, seguimientos e inventario.</p></div><div className="flex gap-2"><a href={`/api/admin/operaciones/export${query.toString() ? `?${query.toString()}` : ""}`} className="rounded-lg border border-[#dce6ee] bg-white px-3 py-2 text-xs font-extrabold text-[#304b66]">Exportar operativo</a><form className="flex gap-2"><select name="range" defaultValue={query.get("range") ?? "all"} className="rounded-lg border border-[#dce6ee] bg-white px-2 py-2 text-xs"><option value="all">Todo</option><option value="today">Hoy</option><option value="yesterday">Ayer</option><option value="week">Últimos 7 días</option><option value="month">Últimos 30 días</option><option value="custom">Personalizado</option></select><button className="rounded-lg bg-[#102a43] px-3 py-2 text-xs font-extrabold text-white" type="submit">Aplicar</button></form></div></div>{snapshot ? <AdminDashboardView role={actor.role} data={null} snapshot={snapshot} view="operations" /> : <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">No se pudo consultar el centro operativo. No se muestran datos inventados.</div>}</div>;
}
