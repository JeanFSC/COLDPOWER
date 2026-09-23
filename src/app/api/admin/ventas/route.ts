import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { getQuoteConversionPreview, convertQuoteToSale } from "@/lib/quote-conversion-service";
import { getSalesPage } from "@/lib/sales-repository";
import { parseSalesFilters, SalesInvalidFilterError } from "@/lib/sales-contract";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { createDirectSale } from "@/lib/sales-service";

export async function GET(request: Request) {
  try {
    await requireApiPermission("sales.view");
    const url = new URL(request.url);
    const quoteId = url.searchParams.get("quoteId")?.trim();
    if (quoteId) {
      const preview = await getQuoteConversionPreview(quoteId);
      return apiSuccess({
        quote: { id: preview.quote.id, trackingCode: preview.quote.trackingCode, status: preview.quote.workflowStatus },
        version: { id: preview.version.id, number: preview.version.versionNumber, currency: preview.version.currency, subtotal: preview.version.subtotal, discountAmount: preview.version.discountAmount, taxAmount: preview.version.taxAmount, taxMode: preview.version.taxMode, total: preview.version.total, validUntil: preview.version.validUntil },
        items: preview.items.map((item) => ({ productId: item.productId, sku: item.skuSnapshot, name: item.productNameSnapshot, quantity: item.quantity, baseUnitPrice: item.baseUnitPrice, discountPercentage: item.discountPercentage, discountAmount: item.discountAmount, finalUnitPrice: item.finalUnitPrice, lineTotal: item.lineTotal, currency: item.currency })),
        locations: preview.locations,
        existingSale: preview.existingSale,
      });
    }
    return apiSuccess(await getSalesPage(parseSalesFilters(url.searchParams)));
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("SALES_FORBIDDEN", "No tienes permiso para ver ventas.", 403);
    if (error instanceof SalesInvalidFilterError) return apiError("SALES_INVALID_FILTER", "Los filtros de ventas no son válidos.", 400);
    return apiError("SALES_UNAVAILABLE", error instanceof Error ? error.message : "No se pudieron cargar las ventas.", 503);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireApiPermission("sales.manage");
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
    const value = body && typeof body === "object" ? body as Record<string, unknown> : {};
    if (value.mode === "DIRECT") {
      if ("unitPrice" in value || "price" in value || "currency" in value || "total" in value) return apiError("SERVER_PRICE_ONLY", "El precio de la venta directa se calcula en el servidor.", 400);
      const deliveryMethod = value.deliveryMethod === "DELIVERY" || value.deliveryMethod === "SHIPPING" ? value.deliveryMethod : "PICKUP";
      const items = Array.isArray(value.items) ? value.items.filter((item): item is { productId: string; quantity: number } => Boolean(item && typeof item === "object" && typeof (item as Record<string, unknown>).productId === "string" && Number.isInteger((item as Record<string, unknown>).quantity))) .map((item) => ({ productId: item.productId.trim(), quantity: item.quantity })) : [];
      const result = await createDirectSale({ customerId: typeof value.customerId === "string" ? value.customerId.trim() : "", locationId: typeof value.locationId === "string" ? value.locationId.trim() : "", items, deliveryMethod, address: typeof value.address === "string" ? value.address : null, idempotencyKey: typeof value.idempotencyKey === "string" ? value.idempotencyKey.trim() : "", channel: typeof value.channel === "string" ? value.channel : "DIRECT" }, actor);
      return apiSuccess({ success: true, ...result }, result.idempotent ? 200 : 201);
    }
    if ("items" in value || "unitPrice" in value || "price" in value || "currency" in value || "total" in value) return apiError("QUOTE_SNAPSHOT_ONLY", "La conversión usa únicamente la versión aceptada de la cotización.", 400);
    const result = await convertQuoteToSale({
      quoteId: typeof value.quoteId === "string" ? value.quoteId.trim() : "",
      locationId: typeof value.locationId === "string" ? value.locationId.trim() : "",
      deliveryMethod: value.deliveryMethod === "DELIVERY" || value.deliveryMethod === "SHIPPING" ? value.deliveryMethod : "PICKUP",
      address: typeof value.address === "string" ? value.address.trim().slice(0, 300) || null : null,
    }, actor);
    return apiSuccess({ success: true, ...result }, result.idempotent ? 200 : 201);
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("SALES_FORBIDDEN", "No tienes permiso para convertir ventas.", 403);
    return apiError("SALE_NOT_CREATED", error instanceof Error ? error.message : "No se pudo convertir la cotización.", 400);
  }
}

// Legacy API contract only: unitPrice: "" is deliberately not emitted by the conversion preview.
