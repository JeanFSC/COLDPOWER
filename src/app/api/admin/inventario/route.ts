import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { parseInventoryFilters } from "@/lib/inventory-admin-contract";
import { getInventoryAdminPage } from "@/lib/inventory-admin-service";

export async function GET(request: Request) {
  try {
    await requireApiPermission("inventory.view");
    return apiSuccess(await getInventoryAdminPage(parseInventoryFilters(new URL(request.url).searchParams)));
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("INVENTORY_FORBIDDEN", "No tienes permiso para ver el inventario.", 403);
    if (error instanceof Error && error.message === "INVENTORY_INVALID_FILTER") return apiError("INVENTORY_INVALID_FILTER", "Los filtros del inventario no son válidos.", 400);
    return apiError("INVENTORY_UNAVAILABLE", "No se pudo cargar el inventario.", 503);
  }
}
