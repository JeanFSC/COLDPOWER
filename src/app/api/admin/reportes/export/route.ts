import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { auditLogs } from "@/db/schema";
import { getDb } from "@/db";
import { DashboardInvalidFilterError } from "@/lib/dashboard-contract";
import { parseReportsFilters } from "@/lib/reports-contract";
import { getReportSnapshot } from "@/lib/reporting-service";
import { toDashboardCsv, toDashboardWorkbook } from "@/lib/dashboard-export";

export async function GET(request: Request) {
  try {
    const actor = await requireApiPermission("reports.export");
    const params = new URL(request.url).searchParams;
    const filters = parseReportsFilters(params);
    const data = await getReportSnapshot(filters, actor);
    await getDb()
      .insert(auditLogs)
      .values({
        id: `audit-${crypto.randomUUID()}`,
        actorId: actor.userId,
        actorRole: actor.role,
        action: "reports.exported",
        entityType: "report",
        entityId: "reports",
        before: null,
        after: null,
        metadata: { filters },
      });
    const csv = params.get("format") === "csv";
    return new Response(csv ? toDashboardCsv(data, actor) : Buffer.from(toDashboardWorkbook(data, actor)), {
      headers: {
        "content-type": csv ? "text/csv; charset=utf-8" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="coldpower-reportes.${csv ? "csv" : "xlsx"}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof DashboardInvalidFilterError)
      return apiError("REPORTS_INVALID_FILTER", "Los filtros del reporte no son válidos.", 400);
    if (error instanceof ApiAuthorizationError)
      return apiError("REPORTS_EXPORT_FORBIDDEN", "No tienes permiso para exportar reportes.", 403);
    return apiError("REPORTS_EXPORT_FAILED", "No se pudo exportar el reporte.", 503);
  }
}
