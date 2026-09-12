import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { DashboardInvalidFilterError } from "@/lib/dashboard-contract";
import { parseReportsFilters } from "@/lib/reports-contract";
import { getReportSnapshot } from "@/lib/reporting-service";

export async function GET(request: Request) {
  try {
    const actor = await requireApiPermission("reports.view");
    return apiSuccess(
      await getReportSnapshot(parseReportsFilters(new URL(request.url).searchParams), actor),
    );
  } catch (error) {
    if (error instanceof DashboardInvalidFilterError)
      return apiError("REPORTS_INVALID_FILTER", "Los filtros del reporte no son válidos.", 400);
    if (error instanceof ApiAuthorizationError)
      return apiError("REPORTS_FORBIDDEN", "No tienes permiso para ver reportes.", 403);
    return apiError("REPORTS_UNAVAILABLE", "No se pudo cargar el reporte.", 503);
  }
}
