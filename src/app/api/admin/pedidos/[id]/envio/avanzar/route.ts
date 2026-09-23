import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { advanceShipment, ShipmentDomainError } from "@/lib/shipment-service";

export const dynamic = "force-dynamic";

// Test carrier only: records the next courier event for a dispatched order.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let actor: Awaited<ReturnType<typeof requireApiPermission>>;
  try { actor = await requireApiPermission("orders.manage"); } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("ORDERS_FORBIDDEN", "No tienes permiso para gestionar pedidos.", 403);
    return apiError("ORDERS_AUTH_UNAVAILABLE", "No se pudo validar el acceso a pedidos.", 503);
  }
  const { id } = await params;
  try {
    return apiSuccess({ success: true, event: await advanceShipment(id, actor) });
  } catch (error) {
    if (error instanceof ShipmentDomainError) return apiError(error.code, error.message, error.status);
    console.error("ColdPower: no se pudo avanzar el seguimiento", error);
    return apiError("SHIPMENT_ADVANCE_FAILED", "No se pudo avanzar el seguimiento.", 503);
  }
}
