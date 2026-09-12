import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { parseKardexFilters } from "@/lib/inventory-admin-contract";
import { getInventoryKardexPage } from "@/lib/inventory-admin-service";

export async function GET(request: Request) {
  try {
    await requireApiPermission("inventory.kardex.view");
    return apiSuccess(await getInventoryKardexPage(parseKardexFilters(new URL(request.url).searchParams)));
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("INVENTORY_KARDEX_FORBIDDEN", "No tienes permiso para ver el Kardex.", 403);
    if (error instanceof Error && error.message === "INVENTORY_INVALID_FILTER") return apiError("INVENTORY_INVALID_FILTER", "Los filtros del Kardex no son válidos.", 400);
    return apiError("INVENTORY_KARDEX_UNAVAILABLE", "No se pudo cargar el Kardex.", 503);
  }
}
