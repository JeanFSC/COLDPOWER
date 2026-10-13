import { csvCell } from "@/lib/csv";
import { tabularWorkbook, type WorkbookValue } from "@/lib/tabular-workbook";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { parseOperationsFilters, OperationsInvalidFilterError } from "@/lib/operations-contract";
import { getOperationsExport } from "@/lib/operations-workspace";
import { writeAuditLog } from "@/lib/audit";

export async function GET(request: Request) {
  let actor: Awaited<ReturnType<typeof requireApiPermission>>;
  try {
    actor = await requireApiPermission("operations.view");
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("OPERATIONS_FORBIDDEN", "No tienes permiso para exportar la vista operativa.", 403);
    return apiError("OPERATIONS_UNAVAILABLE", "No se pudo validar el acceso.", 503);
  }
  try {
    const params = new URL(request.url).searchParams;
    const filters = parseOperationsFilters(params);
    const rows = await getOperationsExport(filters);
    const headers = ["cola", "id", "codigo", "cliente", "producto", "estado", "etapa", "vendedor", "local", "metodo_entrega", "fecha", "vencimiento", "prioridad", "sku", "disponible", "reservado", "severidad"];
    const values = rows.map((row) => {
      const value = (key: string) => (row as Record<string, unknown>)[key];
      return [
      value("queue"), value("id"), value("code"), value("customer"), value("product"), value("status"), value("stage"), value("seller"), value("location"),
      value("deliveryMethod"), value("date"), value("due"), value("priority"), value("sku"), value("available"), value("reserved"), value("severity"),
    ] as WorkbookValue[];
    });
    await writeAuditLog({ actorId: actor.userId, actorRole: actor.role, action: "operations.exported", entityType: "operations_workspace", entityId: "operations", module: "operations", metadata: { rows: rows.length, filters: { range: filters.range, from: filters.from, to: filters.to, locationId: filters.locationId, sellerId: filters.sellerId, status: filters.status } } });
    if (params.get("format") === "csv") {
      return new Response([headers, ...values].map(row => row.map(csvCell).join(",")).join("\n"), { status: 200, headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="operaciones.csv"', "Cache-Control": "no-store" } });
    }
    return new Response(Buffer.from(tabularWorkbook("Operaciones", headers, values)), { status: 200, headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": 'attachment; filename="operaciones.xlsx"', "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof OperationsInvalidFilterError) return apiError("OPERATIONS_INVALID_FILTER", error.message, 400);
    return apiError("OPERATIONS_EXPORT_UNAVAILABLE", "No se pudo generar la exportación operativa.", 503);
  }
}
