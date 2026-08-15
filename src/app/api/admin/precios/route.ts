import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { parsePricingFilters } from "@/lib/pricing-contract";
import { getPricingPage } from "@/lib/pricing-repository";
import { createPrice } from "@/lib/pricing-service";
import { can } from "@/lib/roles";

// Las mutaciones se delegan a pricing-service, que las ejecuta en transaction y registra auditLogs.

export async function GET(request: Request) {
  try {
    const actor = await requireApiPermission("pricing.view");
    const filters = parsePricingFilters(new URL(request.url).searchParams);
    const includeCost = can(actor.role, "pricing.cost.view");
    if (filters.priceType === "COST" && !includeCost) return apiError("PRICING_FORBIDDEN", "No tienes permiso para consultar costos.", 403);
    return apiSuccess(await getPricingPage(filters, { includeCost }));
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("PRICING_FORBIDDEN", "No tienes permiso para ver precios.", 403);
    if (error instanceof Error && error.message === "PRICING_INVALID_FILTER") return apiError("PRICING_INVALID_FILTER", "Los filtros de precios no son válidos.", 400);
    return apiError("PRICING_UNAVAILABLE", "No se pudo cargar precios.", 503);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireApiPermission("pricing.edit");
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
    const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const productId = typeof input.productId === "string" ? input.productId.trim() : "";
    if (!productId) return apiError("PRODUCT_REQUIRED", "productId es obligatorio.", 400);
    const result = await createPrice({ productId, amount: input.amount, currency: input.currency, priceType: input.priceType, wholesaleMinQty: input.wholesaleMinQty, minimumAllowed: input.minimumAllowed, status: input.status, validFrom: input.validFrom, validUntil: input.validUntil, reason: input.reason, idempotencyKey: input.idempotencyKey ?? request.headers.get("Idempotency-Key") }, actor);
    return apiSuccess({ price: result.price, idempotent: result.idempotent }, 201);
  } catch (error) {
    if (error instanceof ApiAuthorizationError || (error instanceof Error && error.message === "PRICING_FORBIDDEN")) return apiError("PRICING_FORBIDDEN", "No tienes permiso para editar precios.", 403);
    if (error instanceof Error && error.message === "PRICING_COST_FORBIDDEN") return apiError("PRICING_COST_FORBIDDEN", "No tienes permiso para modificar costos.", 403);
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") return apiError("PRODUCT_NOT_FOUND", "Producto no encontrado.", 404);
    if (error instanceof Error && ["PRICE_REASON_REQUIRED", "PRICE_INVALID_WINDOW"].includes(error.message)) return apiError(error.message, "Los datos de vigencia y motivo no son válidos.", 400);
    if (error instanceof Error && error.message === "PRICE_WINDOW_OVERLAP") return apiError(error.message, "La ventana de vigencia se superpone con otro precio.", 409);
    if (error instanceof Error && error.message === "PRICE_IDEMPOTENCY_CONFLICT") return apiError(error.message, "La clave de idempotencia ya fue usada para otra operación.", 409);
    if (error instanceof Error && /precio|moneda|importe|cantidad|mínimo|estado|porcentaje|Tipo/.test(error.message)) return apiError("PRICE_INVALID", error.message, 400);
    return apiError("PRICING_UNAVAILABLE", "No se pudo guardar el precio.", 503);
  }
}
