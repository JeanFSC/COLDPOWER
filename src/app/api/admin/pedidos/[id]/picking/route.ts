import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { OrderFulfillmentError, updatePickedQuantity } from "@/lib/order-fulfillment-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiPermission("orders.manage");
    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.orderItemId !== "string") return apiError("ORDER_ITEM_REQUIRED", "Selecciona un producto del pedido.", 400);
    const result = await updatePickedQuantity({ orderId: id, orderItemId: body.orderItemId, pickedQuantity: Number(body.pickedQuantity), expectedVersion: typeof body.expectedVersion === "number" ? body.expectedVersion : undefined }, actor);
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("ORDERS_FORBIDDEN", "No tienes permiso para preparar pedidos.", 403);
    if (error instanceof OrderFulfillmentError) return apiError(error.code, error.message, error.status);
    return apiError("ORDER_PICKING_NOT_UPDATED", error instanceof Error ? error.message : "No se pudo actualizar el picking.", 400);
  }
}
