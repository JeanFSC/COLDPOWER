import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { validateManualPaymentInput } from "@/lib/sales-validation";
import { registerManualPayment } from "@/lib/sales-service";
import { apiError, apiSuccess } from "@/lib/api-errors";

export async function POST(request: Request) {
  try {
    const actor = await requireApiPermission("payments.manual.confirm");
    let body: unknown; try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
    const input = validateManualPaymentInput(body);
    const result = await registerManualPayment({ ...input, idempotencyKey: request.headers.get("Idempotency-Key") ?? undefined }, actor);
    return apiSuccess({ success: true, result }, result.idempotent ? 200 : 201);
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("PAYMENTS_FORBIDDEN", "No tienes permiso para confirmar pagos manuales.", 403);
    const message = error instanceof Error ? error.message : "No se pudo registrar el pago.";
    if (message === "PAYMENT_IDEMPOTENCY_CONFLICT") return apiError(message, "La clave de idempotencia ya fue usada para otro pago.", 409);
    return apiError("PAYMENT_NOT_REGISTERED", message, 400);
  }
}
