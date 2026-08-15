import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { PaymentDomainError, refreshPaymentStatus } from "@/lib/payment-service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiPermission("payments.review");
    const { id } = await params;
    return apiSuccess(await refreshPaymentStatus(id, actor));
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("PAYMENTS_REVIEW_FORBIDDEN", "No tienes permiso para revisar pagos.", 403);
    if (error instanceof PaymentDomainError) return apiError(error.code, error.message, error.status);
    return apiError("PAYMENT_STATUS_CHECK_FAILED", error instanceof Error ? error.message : "No se pudo consultar el proveedor.", 502);
  }
}
