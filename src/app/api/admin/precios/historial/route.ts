import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import { getPricingHistoryPage } from "@/lib/pricing-repository";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { parsePricingHistoryFilters } from "@/lib/pricing-contract";

export async function GET(request: Request) {
  try {
    const actor = await requireApiPermission("pricing.view");
    const filters = parsePricingHistoryFilters(new URL(request.url).searchParams);
    return apiSuccess(await getPricingHistoryPage(filters, { includeCost: can(actor.role, "pricing.cost.view") }));
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("PRICING_FORBIDDEN", "No tienes permiso para ver historial de precios.", 403);
    if (error instanceof Error && error.message === "PRICING_INVALID_FILTER") return apiError("PRICING_INVALID_FILTER", "Los filtros del historial no son válidos.", 400);
    return apiError("PRICING_UNAVAILABLE", "No se pudo cargar el historial.", 503);
  }
}
