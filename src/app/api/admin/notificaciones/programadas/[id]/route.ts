import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { cancelNotificationSchedule } from "@/lib/notification-rules-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { try { const actor = await requireApiPermission("notifications.manage"); const body = await request.json() as Record<string, unknown>; if (body.action !== "cancel") return apiError("NOTIFICATION_SCHEDULE_ACTION_INVALID", "Acción de programación no válida.", 400); return apiSuccess({ schedule: await cancelNotificationSchedule((await params).id, actor) }); } catch (error) { if (error instanceof ApiAuthorizationError) return apiError("NOTIFICATION_SCHEDULES_FORBIDDEN", "No tienes permiso para modificar programaciones.", 403); return apiError("NOTIFICATION_SCHEDULE_ACTION_FAILED", error instanceof Error ? error.message : "No se pudo modificar la programación.", 400); } }
