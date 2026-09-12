import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { schedulePriceReplacement } from "@/lib/pricing-service";
import { clearPublicCatalogRuntimeCache } from "@/lib/catalog-repository";

export async function POST(request: Request) {
  try {
    const actor = await requireApiPermission("pricing.edit");
    const body = await request.json().catch(() => null);
    const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const priceId = typeof input.priceId === "string" ? input.priceId.trim() : "";
    if (!priceId) return apiError("PRICE_REQUIRED", "priceId es obligatorio.", 400);
    const result = await schedulePriceReplacement(priceId, { amount: input.amount, currency: input.currency, priceType: input.priceType, wholesaleMinQty: input.wholesaleMinQty, minimumAllowed: input.minimumAllowed, status: input.status, validFrom: input.validFrom, validUntil: input.validUntil, reason: input.reason, idempotencyKey: input.idempotencyKey ?? request.headers.get("Idempotency-Key") }, actor);
    clearPublicCatalogRuntimeCache();
    return apiSuccess(result, 201);
  } catch (error) {
    if (error instanceof ApiAuthorizationError || (error instanceof Error && error.message === "PRICING_FORBIDDEN")) return apiError("PRICING_FORBIDDEN", "No tienes permiso para editar precios.", 403);
    if (error instanceof Error && error.message === "PRICING_COST_FORBIDDEN") return apiError(error.message, "No tienes permiso para modificar costos.", 403);
    if (error instanceof Error && error.message === "PRICE_NOT_FOUND") return apiError(error.message, "El precio actual ya no está disponible.", 404);
    if (error instanceof Error && ["PRICE_REPLACEMENT_MUST_BE_FUTURE", "PRICE_REPLACEMENT_TYPE_MISMATCH", "PRICE_REASON_REQUIRED", "PRICE_INVALID_WINDOW"].includes(error.message)) return apiError(error.message, "Revisa la nueva vigencia, el tipo y el motivo.", 400);
    if (error instanceof Error && error.message === "PRICE_WINDOW_OVERLAP") return apiError(error.message, "La nueva vigencia se superpone con otro precio.", 409);
    if (error instanceof Error && /precio|moneda|importe|cantidad|mínimo|estado|Tipo/.test(error.message)) return apiError("PRICE_INVALID", error.message, 400);
    return apiError("PRICING_UNAVAILABLE", "No se pudo programar el reemplazo.", 503);
  }
}
