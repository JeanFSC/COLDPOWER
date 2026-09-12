import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { createReportSchedule, listReportSchedules } from "@/lib/reporting-service";

export async function GET() {
  try {
    const actor = await requireApiPermission("reports.view");
    return apiSuccess({ schedules: await listReportSchedules(actor) });
  } catch (error) {
    if (error instanceof ApiAuthorizationError)
      return apiError(
        "REPORT_SCHEDULES_FORBIDDEN",
        "No tienes permiso para ver programaciones.",
        403,
      );
    return apiError(
      "REPORT_SCHEDULES_UNAVAILABLE",
      "No se pudieron cargar las programaciones.",
      503,
    );
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireApiPermission("reports.export");
    const body = await request.json().catch(() => null);
    const result = await createReportSchedule(body, actor);
    return apiSuccess({ result }, result.idempotent ? 200 : 201);
  } catch (error) {
    if (error instanceof ApiAuthorizationError)
      return apiError(
        "REPORT_SCHEDULES_FORBIDDEN",
        "No tienes permiso para programar reportes.",
        403,
      );
    return apiError(
      "REPORT_SCHEDULE_CREATE_FAILED",
      error instanceof Error ? error.message : "No se pudo programar el reporte.",
      400,
    );
  }
}
