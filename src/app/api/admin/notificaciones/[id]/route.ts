import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { updateNotificationState } from "@/lib/notifications-service";
import { notificationStates } from "@/lib/operations-validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { try { const actor = await requireApiPermission("notifications.view"); const value = await request.json() as Record<string, unknown>; const state = typeof value.state === "string" ? value.state : ""; if (!(notificationStates as readonly string[]).includes(state)) return apiError("NOTIFICATIONS_INVALID", "Estado no válido.", 400); return apiSuccess({ notification: await updateNotificationState((await params).id, state as typeof notificationStates[number], actor) }); } catch (error) { if (error instanceof ApiAuthorizationError) return apiError("NOTIFICATIONS_FORBIDDEN", "No tienes permiso para modificar notificaciones.", 403); return apiError("NOTIFICATIONS_UPDATE_FAILED", error instanceof Error ? error.message : "No se pudo actualizar la notificación.", 400); } }
