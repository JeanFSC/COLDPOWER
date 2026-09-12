import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { DashboardInvalidFilterError, parseDashboardFilters } from "@/lib/dashboard-contract";
import { dashboardHasExportableData, toDashboardCsv } from "@/lib/dashboard-export";
import { buildDashboardReportSections, createDashboardSnapshotPdf } from "@/lib/dashboard-pdf";
import { getOperationsDashboard } from "@/lib/operations-dashboard";

export async function GET(request: Request) {
  try {
    const actor = await requireApiPermission("dashboard.view");
    const url = new URL(request.url);
    const filters = parseDashboardFilters(url.searchParams);
    const data = await getOperationsDashboard(filters, actor);
    if (!dashboardHasExportableData(data)) return apiError("DASHBOARD_EMPTY", "No existen datos para exportar en este alcance.", 404);
    if (url.searchParams.get("format") === "csv") {
      return new Response(toDashboardCsv(data, actor), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=coldpower-dashboard.csv", "cache-control": "no-store" } });
    }
    const bytes = createDashboardSnapshotPdf({
      title: "ColdPower · Dashboard ejecutivo",
      subtitle: "Visión general comercial, financiera y operativa",
      generatedAt: new Date().toLocaleString("es-PE", { timeZone: "America/Lima" }),
      sections: buildDashboardReportSections(data, actor),
    });
    return new Response(bytes, { headers: { "content-type": "application/pdf", "content-disposition": "attachment; filename=coldpower-dashboard.pdf", "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof DashboardInvalidFilterError) return apiError("DASHBOARD_INVALID_FILTER", "Los filtros del dashboard no son válidos.", 400);
    if (error instanceof ApiAuthorizationError) return apiError("DASHBOARD_FORBIDDEN", "No tienes permiso para exportar el dashboard.", 403);
    return apiError("DASHBOARD_UNAVAILABLE", "No se pudo exportar el dashboard.", 503);
  }
}
