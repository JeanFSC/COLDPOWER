import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { getInventoryDetailActivity } from "@/lib/inventory-admin-service";
import { parseInventoryDetailReservationFilters } from "@/lib/inventory-detail-reservation-filters";

export async function GET(request: Request) {
  try {
    await requireApiPermission("inventory.view");
    const filters = parseInventoryDetailReservationFilters(new URL(request.url).searchParams);
    if (!filters) return apiError("INVALID_ACTIVITY_FILTER", "Producto y local son obligatorios.", 400);
    return apiSuccess(await getInventoryDetailActivity(filters.productId, filters.locationId));
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("INVENTORY_FORBIDDEN", "No tienes permiso para ver el inventario.", 403);
    return apiError("ACTIVITY_UNAVAILABLE", "No se pudo cargar la actividad reciente.", 503);
  }
}
