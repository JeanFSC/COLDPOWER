import { apiError, apiSuccess } from "@/lib/api-errors";
import { PaymentDomainError, processPaymentWebhook } from "@/lib/payment-service";

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
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
