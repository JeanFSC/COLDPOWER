import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { getInventoryDetailTransfers } from "@/lib/inventory-admin-service";
import { parseInventoryDetailReservationFilters } from "@/lib/inventory-detail-reservation-filters";

export async function GET(request: Request) {
  try {
    await requireApiPermission("inventory.view");
    const filters = parseInventoryDetailReservationFilters(new URL(request.url).searchParams);
    if (!filters) return apiError("INVALID_TRANSFER_FILTER", "Producto, local y página válida son obligatorios.", 400);
    return apiSuccess(await getInventoryDetailTransfers(filters.productId, filters.locationId, filters.page));
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("INVENTORY_FORBIDDEN", "No tienes permiso para ver el inventario.", 403);
    return apiError("TRANSFERS_UNAVAILABLE", "No se pudieron cargar los traslados.", 503);
  }
}
