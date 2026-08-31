import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { parseOperationsFilters, OperationsInvalidFilterError } from "@/lib/operations-contract";
import { getOperationsWorkspace } from "@/lib/operations-workspace";
import { permissionsForRole } from "@/lib/roles";

export async function GET(request: Request) {
  try {
    const actor = await requireApiPermission("operations.view");
    const filters = parseOperationsFilters(new URL(request.url).searchParams);
    return apiSuccess(await getOperationsWorkspace(filters, { allowedPermissions: permissionsForRole(actor.role) }));
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("OPERATIONS_FORBIDDEN", "No tienes permiso para ver operaciones.", 403);
    if (error instanceof OperationsInvalidFilterError) return apiError("OPERATIONS_INVALID_FILTER", error.message, 400);
    return apiError("OPERATIONS_UNAVAILABLE", "No se pudo cargar el centro operativo.", 503);
  }
}
