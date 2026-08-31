import { and, eq } from "drizzle-orm";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { getDb } from "@/db";
import { customers } from "@/db/crm-schema";
import { orders } from "@/db/sales-schema";
import { ApiAuthorizationError, requireApiUser } from "@/lib/auth";
import { PaymentDomainError, createProviderPayment } from "@/lib/payment-service";

export async function POST(request: Request) {
  try {
    const actor = await requireApiUser();
    let body: unknown; try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
    const value = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const orderId = typeof value.orderId === "string" ? value.orderId.trim() : "";
    const returnUrl = typeof value.returnUrl === "string" ? value.returnUrl.trim().slice(0, 500) : undefined;
    if (!orderId) return apiError("ORDER_ID_REQUIRED", "El pedido es obligatorio.", 400);
    const [ownedOrder] = await getDb().select({ id: orders.id }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).where(and(eq(orders.id, orderId), eq(customers.userId, actor.userId))).limit(1);
    if (!ownedOrder) return apiError("ORDER_NOT_FOUND", "Pedido no encontrado.", 404);
    return apiSuccess(await createProviderPayment({ orderId, returnUrl, idempotencyKey: request.headers.get("Idempotency-Key") ?? undefined }));
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("AUTH_REQUIRED", "Debes iniciar sesión para crear un pago.", 401);
    if (error instanceof PaymentDomainError) return apiError(error.code, error.message, error.status);
    return apiError("PAYMENT_CREATE_FAILED", error instanceof Error ? error.message : "No se pudo crear el pago.", 400);
  }
}
