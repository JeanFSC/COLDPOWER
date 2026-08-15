import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { getNotificationPreferences } from "@/lib/notifications-service";

export async function GET() { try { const actor = await requireApiPermission("notifications.preferences"); return apiSuccess({ preferences: await getNotificationPreferences(actor.userId) }); } catch (error) { if (error instanceof ApiAuthorizationError) return apiError("NOTIFICATIONS_PREFERENCES_FORBIDDEN", "No tienes permiso para ver preferencias.", 403); return apiError("NOTIFICATIONS_PREFERENCES_UNAVAILABLE", "No se pudieron cargar las preferencias.", 503); } }
