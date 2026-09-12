import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import {
  createNotificationSchedule,
  listNotificationSchedules,
} from "@/lib/notification-rules-service";

export async function GET() {
  try {
    await requireApiPermission("notifications.view");
    return apiSuccess({ schedules: await listNotificationSchedules() });
  } catch (error) {
    if (error instanceof ApiAuthorizationError)
      return apiError(
        "NOTIFICATION_SCHEDULES_FORBIDDEN",
        "No tienes permiso para ver programaciones.",
        403,
      );
    return apiError(
      "NOTIFICATION_SCHEDULES_UNAVAILABLE",
      "No se pudieron cargar las programaciones.",
      503,
    );
  }
}
export async function POST(request: Request) {
  try {
    const actor = await requireApiPermission("notifications.manage");
    const body = (await request.json()) as Record<string, unknown>;
    const roles = Array.isArray(body.recipientRoles)
      ? body.recipientRoles.filter((value): value is string => typeof value === "string")
      : [];
    const userIds = Array.isArray(body.recipientUserIds)
      ? body.recipientUserIds.filter((value): value is string => typeof value === "string")
      : [];
    const scheduledAt =
      typeof body.scheduledAt === "string" ? new Date(body.scheduledAt) : new Date(NaN);
    if (Number.isNaN(scheduledAt.getTime()))
      return apiError("NOTIFICATION_SCHEDULE_INVALID", "La fecha programada no es válida.", 400);
    const result = await createNotificationSchedule(
      {
        ruleId: typeof body.ruleId === "string" ? body.ruleId : null,
        templateId: typeof body.templateId === "string" ? body.templateId : null,
        title: typeof body.title === "string" ? body.title : "",
        body: typeof body.body === "string" ? body.body : "",
        link: typeof body.link === "string" ? body.link : null,
        recipientRoles: roles,
        recipientUserIds: userIds,
        scheduledAt,
        idempotencyKey:
          request.headers.get("Idempotency-Key") ??
          (typeof body.idempotencyKey === "string" ? body.idempotencyKey : null),
      },
      actor,
    );
    return apiSuccess({ result }, result.idempotent ? 200 : 201);
  } catch (error) {
    if (error instanceof ApiAuthorizationError)
      return apiError(
        "NOTIFICATION_SCHEDULES_FORBIDDEN",
        "No tienes permiso para programar avisos.",
        403,
      );
    return apiError(
      "NOTIFICATION_SCHEDULE_FAILED",
      error instanceof Error ? error.message : "No se pudo programar el aviso.",
      400,
    );
  }
}
