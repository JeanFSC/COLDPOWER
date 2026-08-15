import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { DashboardInvalidFilterError, parseDashboardFilters } from "@/lib/dashboard-contract";
import { getOperationsDashboard } from "@/lib/operations-dashboard";

export async function GET(request: Request) {
  try {
    const actor = await requireApiPermission("dashboard.view");
    const filters = parseDashboardFilters(new URL(request.url).searchParams);
    return apiSuccess(await getOperationsDashboard(filters, actor));
  } catch (error) {
    if (error instanceof DashboardInvalidFilterError) return apiError("DASHBOARD_INVALID_FILTER", "Los filtros del dashboard no son válidos.", 400);
    if (error instanceof ApiAuthorizationError) return apiError("DASHBOARD_FORBIDDEN", "No tienes permiso para ver el dashboard.", 403);
    return apiError("DASHBOARD_UNAVAILABLE", "No se pudo cargar el dashboard.", 503);
  }
}
