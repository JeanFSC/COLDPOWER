import { apiError, apiSuccess } from "@/lib/api-errors";
import { ApiAuthorizationError, requireApiUser } from "@/lib/auth";
import { PaymentDomainError, startPaymentForOrder } from "@/lib/payment-service";

export const dynamic = "force-dynamic";

// Resumes a pending payment or starts a new attempt after a rejection.
export async function POST(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { userId } = await requireApiUser();
    const { code } = await params;
    const result = await startPaymentForOrder(decodeURIComponent(code), userId);
    return apiSuccess({ success: true, paymentUrl: result.checkoutUrl });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("AUTH_REQUIRED", "Debes iniciar sesión para pagar tu pedido.", 401);
    if (error instanceof PaymentDomainError) return apiError(error.code, error.message, error.status);
    console.error("ColdPower: no se pudo iniciar el pago", error);
    return apiError("PAYMENT_START_FAILED", "No se pudo iniciar el pago.", 503);
  }
}
