import { and, eq } from "drizzle-orm";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { getDb } from "@/db";
import { customers } from "@/db/crm-schema";
import { orders, payments } from "@/db/sales-schema";
import { ApiAuthorizationError, requireApiUser } from "@/lib/auth";
import { PaymentDomainError, refreshPaymentStatus } from "@/lib/payment-service";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id } = await params;
    const [ownedPayment] = await getDb().select({ id: payments.id }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).where(and(eq(payments.id, id), eq(customers.userId, actor.userId))).limit(1);
    if (!ownedPayment) return apiError("PAYMENT_NOT_FOUND", "Pago no encontrado.", 404);
    return apiSuccess(await refreshPaymentStatus(id));
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("AUTH_REQUIRED", "Debes iniciar sesión para consultar el estado del pago.", 401);
    if (error instanceof PaymentDomainError) return apiError(error.code, error.message, error.status);
    return apiError("PAYMENT_STATUS_CHECK_FAILED", error instanceof Error ? error.message : "No se pudo consultar el pago.", 502);
  }
}
