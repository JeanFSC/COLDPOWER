import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { parseInventoryMovementsFilters } from "@/lib/inventory-admin-contract";
import { getInventoryMovementsPage } from "@/lib/inventory-admin-service";

export async function GET(request: Request) {
  try {
    await requireApiPermission("inventory.kardex.view");
    return apiSuccess(await getInventoryMovementsPage(parseInventoryMovementsFilters(new URL(request.url).searchParams)));
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("INVENTORY_MOVEMENTS_FORBIDDEN", "No tienes permiso para ver los movimientos.", 403);
    if (error instanceof Error && error.message === "INVENTORY_INVALID_FILTER") return apiError("INVENTORY_INVALID_FILTER", "Los filtros de movimientos no son válidos.", 400);
    return apiError("INVENTORY_MOVEMENTS_UNAVAILABLE", "No se pudieron cargar los movimientos.", 503);
  }
}
