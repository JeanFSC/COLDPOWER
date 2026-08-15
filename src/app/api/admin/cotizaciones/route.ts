import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { QuoteInvalidFilterError, parseQuoteFilters } from "@/lib/quote-contract";
import { getQuotesPage } from "@/lib/quote-repository";

export async function GET(request: Request) {
  try {
    await requireApiPermission("quotes.view");
    return apiSuccess(await getQuotesPage(parseQuoteFilters(new URL(request.url).searchParams)));
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("QUOTES_FORBIDDEN", "No tienes permiso para ver cotizaciones.", 403);
    if (error instanceof QuoteInvalidFilterError) return apiError("QUOTE_INVALID_FILTER", "Los filtros de cotizaciones no son válidos.", 400);
    return apiError("QUOTES_UNAVAILABLE", "No se pudieron cargar las cotizaciones.", 503);
  }
}
