import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { getPurchaseRequestDetail } from "@/lib/purchases-repository";
import { convertPurchaseRequest, transitionPurchaseRequest } from "@/lib/purchases-service";
import { validatePurchaseInput } from "@/lib/purchases-validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    await requireApiPermission("purchases.view");
    const detail = await getPurchaseRequestDetail((await params).id);
    return detail ? apiSuccess(detail) : apiError("PURCHASE_REQUEST_NOT_FOUND", "Solicitud no encontrada.", 404);
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("PURCHASE_REQUESTS_FORBIDDEN", "No tienes permiso para ver solicitudes.", 403);
    return apiError("PURCHASE_REQUEST_UNAVAILABLE", "No se pudo cargar la solicitud.", 503);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const nextStatus = typeof body.status === "string" ? body.status : "";
    const actor = await requireApiPermission(nextStatus === "APPROVED" || nextStatus === "REJECTED" ? "purchases.approve" : "purchases.manage");
    if (!["SUBMITTED", "APPROVED", "REJECTED", "CANCELLED"].includes(nextStatus)) return apiError("PURCHASE_REQUEST_STATUS_INVALID", "Estado de solicitud no válido.", 400);
    return apiSuccess({ request: await transitionPurchaseRequest((await params).id, nextStatus as "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED", actor, typeof body.reason === "string" ? body.reason : undefined) });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("PURCHASE_REQUESTS_FORBIDDEN", "No tienes permiso para cambiar esta solicitud.", 403);
    return apiError("PURCHASE_REQUEST_STATUS_FAILED", error instanceof Error ? error.message : "No se pudo cambiar el estado.", 400);
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const actor = await requireApiPermission("purchases.manage");
    const body = await request.json();
    const input = validatePurchaseInput(body);
    const result = await convertPurchaseRequest((await params).id, input, actor);
    return apiSuccess({ result }, result.idempotent ? 200 : 201);
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("PURCHASE_REQUESTS_FORBIDDEN", "No tienes permiso para convertir solicitudes.", 403);
    return apiError("PURCHASE_REQUEST_CONVERSION_FAILED", error instanceof Error ? error.message : "No se pudo convertir la solicitud.", 400);
  }
}
