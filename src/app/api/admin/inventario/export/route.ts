import { tabularWorkbook } from "@/lib/tabular-workbook";
import { csvCell } from "@/lib/csv";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { inventoryStatusLabels, parseInventoryFilters } from "@/lib/inventory-admin-contract";
import { getInventoryAdminExport } from "@/lib/inventory-admin-service";

export async function GET(request: Request) {
  try {
    await requireApiPermission("inventory.view");
    const rows = await getInventoryAdminExport(parseInventoryFilters(new URL(request.url).searchParams));
    const header = ["SKU", "Producto", "Local", "Físico", "Reservado", "Disponible", "Mínimo", "Estado", "Última actualización"];
    const values = rows.map((row) => [
      row.sku,
      row.productName,
      `${row.locationCode} · ${row.locationName}`,
      row.onHand,
      row.reserved,
      row.available,
      row.minimumStock === null ? "" : row.minimumStock,
      inventoryStatusLabels[row.status],
      row.updatedAt ?? "",
    ]);
    if (new URL(request.url).searchParams.get("format") === "csv") {
      const body = values.map((row) => row.map(csvCell).join(","));
      return new Response([header.map(csvCell).join(","), ...body].join("\n") + "\n", { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="inventario-coldpower.csv"', "Cache-Control": "no-store" } });
    }
    return new Response(Buffer.from(tabularWorkbook("Inventario", header, values)), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": 'attachment; filename="inventario-coldpower.xlsx"', "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("INVENTORY_EXPORT_FORBIDDEN", "No tienes permiso para exportar el inventario.", 403);
    if (error instanceof Error && error.message === "INVENTORY_INVALID_FILTER") return apiError("INVENTORY_INVALID_FILTER", "Los filtros del inventario no son válidos.", 400);
    return apiError("INVENTORY_EXPORT_UNAVAILABLE", "No se pudo generar la exportación del inventario.", 503);
  }
}
