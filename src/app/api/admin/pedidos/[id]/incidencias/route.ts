import { orderIncidentTypeEnum } from "@/db/sales-schema";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { createOrderIncident, OrderFulfillmentError, resolveOrderIncident } from "@/lib/order-fulfillment-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiPermission("orders.manage");
    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.type !== "string" || !(orderIncidentTypeEnum.enumValues as readonly string[]).includes(body.type)) return apiError("ORDER_INCIDENT_TYPE_INVALID", "Tipo de incidencia inválido.", 400);
    const incident = await createOrderIncident({ orderId: id, orderItemId: typeof body.orderItemId === "string" ? body.orderItemId : null, type: body.type as typeof orderIncidentTypeEnum.enumValues[number], note: typeof body.note === "string" ? body.note : "", blocker: body.blocker === true }, actor);
    return apiSuccess({ incident }, 201);
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("ORDERS_FORBIDDEN", "No tienes permiso para registrar incidencias.", 403);
    if (error instanceof OrderFulfillmentError) return apiError(error.code, error.message, error.status);
    return apiError("ORDER_INCIDENT_NOT_CREATED", error instanceof Error ? error.message : "No se pudo registrar la incidencia.", 400);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiPermission("orders.manage");
    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.incidentId !== "string") return apiError("ORDER_INCIDENT_ID_REQUIRED", "Selecciona una incidencia.", 400);
    return apiSuccess(await resolveOrderIncident({ orderId: id, incidentId: body.incidentId, note: typeof body.note === "string" ? body.note : undefined }, actor));
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("ORDERS_FORBIDDEN", "No tienes permiso para resolver incidencias.", 403);
    if (error instanceof OrderFulfillmentError) return apiError(error.code, error.message, error.status);
    return apiError("ORDER_INCIDENT_NOT_RESOLVED", error instanceof Error ? error.message : "No se pudo resolver la incidencia.", 400);
  }
}
