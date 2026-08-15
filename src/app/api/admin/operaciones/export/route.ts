import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { parseOperationsFilters, OperationsInvalidFilterError } from "@/lib/operations-contract";
import { getOperationsExport } from "@/lib/operations-workspace";
import { writeAuditLog } from "@/lib/audit";

function csvCell(value: unknown) {
  const text = value instanceof Date ? value.toISOString() : value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  let actor: Awaited<ReturnType<typeof requireApiPermission>>;
  try {
    actor = await requireApiPermission("operations.view");
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("OPERATIONS_FORBIDDEN", "No tienes permiso para exportar la vista operativa.", 403);
    return apiError("OPERATIONS_UNAVAILABLE", "No se pudo validar el acceso.", 503);
  }
  try {
    const filters = parseOperationsFilters(new URL(request.url).searchParams);
    const rows = await getOperationsExport(filters);
    const headers = ["cola", "id", "codigo", "cliente", "producto", "estado", "etapa", "vendedor", "local", "metodo_entrega", "fecha", "vencimiento", "prioridad", "sku", "disponible", "reservado", "severidad"];
    const csvRows = rows.map((row) => {
      const value = (key: string) => (row as Record<string, unknown>)[key];
      return [
      value("queue"), value("id"), value("code"), value("customer"), value("product"), value("status"), value("stage"), value("seller"), value("location"),
      value("deliveryMethod"), value("date"), value("due"), value("priority"), value("sku"), value("available"), value("reserved"), value("severity"),
    ].map(csvCell).join(",");
    });
    await writeAuditLog({ actorId: actor.userId, actorRole: actor.role, action: "operations.exported", entityType: "operations_workspace", entityId: "operations", module: "operations", metadata: { rows: rows.length, filters: { range: filters.range, from: filters.from, to: filters.to, locationId: filters.locationId, sellerId: filters.sellerId, status: filters.status } } });
    return new Response([headers.map(csvCell).join(","), ...csvRows].join("\n"), { status: 200, headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=operaciones.csv", "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof OperationsInvalidFilterError) return apiError("OPERATIONS_INVALID_FILTER", error.message, 400);
    return apiError("OPERATIONS_EXPORT_UNAVAILABLE", "No se pudo generar la exportación operativa.", 503);
  }
}
