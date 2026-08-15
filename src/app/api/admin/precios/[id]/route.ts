import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { archivePrice, updatePrice } from "@/lib/pricing-service";

// Las mutaciones se delegan a pricing-service, que las ejecuta en transaction y registra auditLogs.

function readBody(body: unknown) {
  return body && typeof body === "object" ? body as Record<string, unknown> : {};
}

function mutationError(error: unknown) {
  if (error instanceof ApiAuthorizationError || (error instanceof Error && error.message === "PRICING_FORBIDDEN")) return apiError("PRICING_FORBIDDEN", "No tienes permiso para editar precios.", 403);
  const message = error instanceof Error ? error.message : "No se pudo actualizar el precio.";
  if (message === "PRICING_COST_FORBIDDEN") return apiError(message, "No tienes permiso para modificar costos.", 403);
  if (message === "PRICE_NOT_FOUND") return apiError(message, "Precio no encontrado.", 404);
  if (message === "PRICE_WINDOW_OVERLAP") return apiError(message, "La ventana de vigencia se superpone con otro precio.", 409);
  if (message === "PRICE_IDEMPOTENCY_CONFLICT") return apiError(message, "La clave de idempotencia ya fue usada para otra operación.", 409);
  if (["PRICE_REASON_REQUIRED", "PRICE_INVALID_WINDOW"].includes(message)) return apiError(message, "Los datos de vigencia y motivo no son válidos.", 400);
  if (/precio|moneda|importe|cantidad|mínimo|estado|Tipo/.test(message)) return apiError("PRICE_INVALID", message, 400);
  return apiError("PRICING_UNAVAILABLE", message, 503);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiPermission("pricing.edit");
    const { id } = await params;
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
    const input = readBody(body);
    const result = await updatePrice(id, { amount: input.amount, currency: input.currency, priceType: input.priceType, wholesaleMinQty: input.wholesaleMinQty, minimumAllowed: input.minimumAllowed, status: input.status, validFrom: input.validFrom, validUntil: input.validUntil, reason: input.reason, idempotencyKey: input.idempotencyKey ?? request.headers.get("Idempotency-Key") }, actor);
    return apiSuccess({ price: result.price, idempotent: result.idempotent });
  } catch (error) {
    return mutationError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiPermission("pricing.edit");
    const { id } = await params;
    const reason = new URL(request.url).searchParams.get("reason") ?? "";
    const result = await archivePrice(id, reason, actor, new URL(request.url).searchParams.get("idempotencyKey") ?? request.headers.get("Idempotency-Key"));
    return apiSuccess({ price: result.price, idempotent: result.idempotent });
  } catch (error) {
    return mutationError(error);
  }
}
