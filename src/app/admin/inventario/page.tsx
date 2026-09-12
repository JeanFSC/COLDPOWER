import type { Metadata } from "next";
import { InventoryAdminWorkspace } from "@/components/admin/InventoryAdminWorkspace";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import { parseInventoryFilters } from "@/lib/inventory-admin-contract";
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
  const filters = parseInventoryFilters(toSearchParams((await searchParams) ?? {}));
  const data = await getInventoryAdminPage(filters);
  return (
    <InventoryAdminWorkspace
      data={data}
      filters={filters}
      permissions={{
        canAdjust: can(actor.role, "inventory.adjust"),
        canTransfer: can(actor.role, "inventory.transfer"),
        canReserve: can(actor.role, "inventory.reserve"),
        canKardex: can(actor.role, "inventory.kardex.view"),
      }}
    />
  );
}
