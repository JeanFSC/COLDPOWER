import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { UserInvalidFilterError, getPendingInvitationsCount, getUserPage, parseUserFilters } from "@/lib/user-administration";

export async function GET(request: Request) {
  try {
    await requireApiPermission("users.view");
    const filters = parseUserFilters(new URL(request.url).searchParams);
    const pending = await getPendingInvitationsCount();
    return apiSuccess(await getUserPage(filters, pending));
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("USERS_FORBIDDEN", "No tienes permiso para ver usuarios.", 403);
    if (error instanceof UserInvalidFilterError) return apiError("USERS_INVALID_FILTER", "Los filtros de usuarios no son válidos.", 400);
    return apiError("USERS_UNAVAILABLE", "No se pudo cargar el listado de usuarios.", 503);
  }
}
