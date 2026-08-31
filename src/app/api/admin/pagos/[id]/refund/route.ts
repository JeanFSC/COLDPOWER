import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { PaymentDomainError, refundPayment } from "@/lib/payment-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiPermission("payments.refund");
    const { id } = await params;
    let body: unknown; try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
    const value = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const reason = typeof value.reason === "string" ? value.reason.trim() : "";
    const amount = typeof value.amount === "string" ? value.amount.trim() : undefined;
    const result = await refundPayment(id, { amount, reason, idempotencyKey: request.headers.get("Idempotency-Key") ?? undefined }, actor);
    return apiSuccess({ result }, result.idempotent ? 200 : 201);
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("PAYMENTS_REFUND_FORBIDDEN", "No tienes permiso para reembolsar pagos.", 403);
    if (error instanceof PaymentDomainError) return apiError(error.code, error.message, error.status);
    return apiError("PAYMENT_REFUND_FAILED", error instanceof Error ? error.message : "No se pudo procesar el reembolso.", 400);
  }
}
