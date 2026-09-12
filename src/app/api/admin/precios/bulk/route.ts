import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { applyBulkPrice, previewBulkPrice, type BulkPriceInput } from "@/lib/pricing-bulk-service";
import { clearPublicCatalogRuntimeCache } from "@/lib/catalog-repository";

function readInput(body: unknown): BulkPriceInput {
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  return {
    productIds: Array.isArray(input.productIds) ? input.productIds.filter((value): value is string => typeof value === "string") : [],
    priceType: input.priceType,
    operation: input.operation,
    amount: input.amount,
    percentage: input.percentage,
    currency: input.currency,
    wholesaleMinQty: input.wholesaleMinQty,
    minimumAllowed: input.minimumAllowed,
    reason: input.reason,
    idempotencyKey: input.idempotencyKey,
  };
}

function mapError(error: unknown) {
  if (error instanceof ApiAuthorizationError || (error instanceof Error && ["PRICING_FORBIDDEN", "PRICING_COST_FORBIDDEN"].includes(error.message))) return apiError(error instanceof Error ? error.message : "PRICING_FORBIDDEN", "No tienes permiso para ejecutar esta operación masiva.", 403);
  const message = error instanceof Error ? error.message : "No se pudo procesar la operación masiva.";
  if (message.startsWith("BULK_PREFLIGHT_FAILED:")) return apiError("BULK_PREFLIGHT_FAILED", "La operación fue bloqueada por la revisión previa.", 400, { blocked: Number(message.split(":")[1]) });
  if (message === "BULK_STALE_PREFLIGHT") return apiError(message, "Los precios cambiaron mientras revisabas la operación. Ejecuta la revisión otra vez.", 409);
  if (["BULK_PRODUCTS_REQUIRED", "BULK_PRICE_TYPE_INVALID", "BULK_OPERATION_INVALID", "BULK_AMOUNT_INVALID", "BULK_PERCENTAGE_INVALID", "BULK_CURRENCY_INVALID", "PRICE_REASON_REQUIRED"].includes(message) || message.startsWith("BULK_")) return apiError("BULK_INVALID", "Revisa la selección, operación, importe y motivo.", 400, { detail: message });
  if (/precio|moneda|importe|cantidad|mínimo/.test(message)) return apiError("BULK_INVALID", message, 400);
  return apiError("BULK_UNAVAILABLE", "No se pudo completar la operación masiva.", 503);
}

export async function POST(request: Request) {
  try {
    const actor = await requireApiPermission("pricing.edit");
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
    const input = readInput(body);
    const mode = body && typeof body === "object" && "mode" in body ? (body as { mode?: unknown }).mode : "preflight";
    if (mode === "preflight") return apiSuccess({ preview: await previewBulkPrice(input, actor) });
    if (mode !== "apply") return apiError("BULK_MODE_REQUIRED", "Indica si deseas revisar o aplicar la operación.", 400);
    const result = await applyBulkPrice(input, actor);
    clearPublicCatalogRuntimeCache();
    return apiSuccess({ result });
  } catch (error) {
    return mapError(error);
  }
}
