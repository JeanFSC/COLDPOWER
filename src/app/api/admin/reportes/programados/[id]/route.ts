import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { cancelReportSchedule } from "@/lib/reporting-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiPermission("reports.export");
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (body?.action !== "cancel")
      return apiError("REPORT_SCHEDULE_ACTION_INVALID", "Acción de programación no válida.", 400);
    return apiSuccess({ schedule: await cancelReportSchedule((await params).id, actor) });
  } catch (error) {
    if (error instanceof ApiAuthorizationError)
      return apiError(
        "REPORT_SCHEDULES_FORBIDDEN",
        "No tienes permiso para modificar programaciones.",
        403,
      );
    return apiError(
      "REPORT_SCHEDULE_ACTION_FAILED",
      error instanceof Error ? error.message : "No se pudo modificar la programación.",
      400,
    );
  }
}
