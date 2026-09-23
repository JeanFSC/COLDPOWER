import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { getPurchaseReceivingOptions } from "@/lib/purchases-repository";

export async function GET(request: Request) {
  try {
    await requireApiPermission("purchases.receive");
    const query = new URL(request.url).searchParams.get("query") ?? "";
    return apiSuccess({ options: await getPurchaseReceivingOptions(query) });
  } catch (error) {
    if (error instanceof ApiAuthorizationError)
      return apiError("PURCHASES_RECEIVE_FORBIDDEN", "No tienes permiso para recibir compras.", 403);
    return apiError("PURCHASE_RECEIVING_OPTIONS_FAILED", "No se pudieron cargar las líneas pendientes.", 503);
  }
}
