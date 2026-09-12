import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { getInventoryProductOptions } from "@/lib/inventory-admin-service";

export async function GET(request: Request) {
  try {
    await requireApiPermission("inventory.view");
    const params = new URL(request.url).searchParams;
    return apiSuccess({
      products: await getInventoryProductOptions(params.get("query") ?? "", params.get("locationId") ?? undefined),
    });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("INVENTORY_FORBIDDEN", "No tienes permiso para ver el inventario.", 403);
    return apiError("INVENTORY_PRODUCTS_UNAVAILABLE", "No se pudieron buscar productos de inventario.", 503);
  }
}
