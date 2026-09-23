import { apiError, apiSuccess } from "@/lib/api-errors";
import { PaymentDomainError, processPaymentWebhook } from "@/lib/payment-service";
import { getActivePaymentProviderName } from "@/lib/payments";

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  // Only the active provider may post events; a test provider name is a 404 once a real
  // provider is configured (and vice versa).
  const active = getActivePaymentProviderName();
  if (!active || (active !== "configured" && active !== provider.trim())) return apiError("PAYMENT_PROVIDER_NOT_FOUND", "Proveedor de pagos no encontrado.", 404);
  const rawPayload = await request.text();
  const signature = request.headers.get("x-payment-signature") ?? request.headers.get("x-signature");
  try {
    const result = await processPaymentWebhook(provider.trim(), rawPayload, signature);
    return apiSuccess({ success: true, ...result });
  } catch (error) {
    if (error instanceof PaymentDomainError) return apiError(error.code, error.message, error.status);
    return apiError("PAYMENT_WEBHOOK_FAILED", error instanceof Error ? error.message : "No se pudo procesar el webhook.", 400);
  }
}
