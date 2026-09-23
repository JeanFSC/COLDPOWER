import type { Metadata } from "next";
import { InventoryAdminWorkspace } from "@/components/admin/InventoryAdminWorkspace";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import { parseInventoryFilters, type InventoryAdminFilters } from "@/lib/inventory-admin-contract";
import { getInventoryAdminPage } from "@/lib/inventory-admin-service";

export const metadata: Metadata = {
  title: "Inventario | Panel admin ColdPower",
  description: "Saldos persistentes, Kardex y operaciones protegidas por local.",
};

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

function toSearchParams(input: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first) params.set(key, first);
  }
  return params;
}

export default async function AdminInventarioPage({ searchParams }: PageProps) {
  const actor = await requirePermission("inventory.view");
  const incomingParams = toSearchParams((await searchParams) ?? {});
  let filters: InventoryAdminFilters;
  let filterNotice: string | undefined;
  try {
    filters = parseInventoryFilters(incomingParams);
  } catch (error) {
    if (!(error instanceof Error) || error.message !== "INVENTORY_INVALID_FILTER") throw error;
    filters = parseInventoryFilters(new URLSearchParams());
    filterNotice = "Algunos filtros no eran válidos y se restablecieron a una vista segura.";
  }
  const data = await getInventoryAdminPage(filters);
  return (
    <InventoryAdminWorkspace
      data={data}
      filters={filters}
      filterNotice={filterNotice}
      permissions={{
        canAdjust: can(actor.role, "inventory.adjust"),
        canTransfer: can(actor.role, "inventory.transfer"),
        canReserve: can(actor.role, "inventory.reserve"),
        canKardex: can(actor.role, "inventory.kardex.view"),
      }}
    />
  );
}
