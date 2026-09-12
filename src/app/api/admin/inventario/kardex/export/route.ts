import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { parseKardexFilters } from "@/lib/inventory-admin-contract";
import { getInventoryKardexExport } from "@/lib/inventory-admin-service";

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  try {
    await requireApiPermission("inventory.kardex.view");
    const filters = parseKardexFilters(new URL(request.url).searchParams);
    const items = await getInventoryKardexExport(filters);
    const header = ["Fecha", "Movimiento", "Cantidad", "Entrada", "Salida", "Delta reservado", "Disponible después", "Referencia", "Actor", "Motivo", "Notas"];
    const rows = items.map((item) => [item.createdAt.toISOString(), item.label, item.quantity, item.entry, item.exit, item.reservedDelta, item.availableAfter, item.referenceLabel, item.actorName ?? "Sistema", item.reason ?? "", item.notes ?? ""]);
    const body = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    return new Response(`\uFEFF${body}\r\n`, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="kardex-${filters.productId}-${filters.locationId}.csv"`, "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("INVENTORY_KARDEX_FORBIDDEN", "No tienes permiso para exportar el Kardex.", 403);
    if (error instanceof Error && error.message === "INVENTORY_INVALID_FILTER") return apiError("INVENTORY_INVALID_FILTER", "Los filtros del Kardex no son válidos.", 400);
    return apiError("INVENTORY_KARDEX_EXPORT_UNAVAILABLE", "No se pudo exportar el Kardex.", 503);
  }
}
