import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { QuoteInvalidFilterError, parseQuoteFilters } from "@/lib/quote-contract";
import { createAdminQuote, parseAdminQuoteInput } from "@/lib/quote-service";
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

export async function POST(request: Request) {
  try {
    const actor = await requireApiPermission("quotes.create");
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
    const input = parseAdminQuoteInput(body && typeof body === "object" ? body as Record<string, unknown> : {});
    const quote = await createAdminQuote(input, actor);
    return apiSuccess({ success: true, quote }, 201);
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("QUOTES_FORBIDDEN", "No tienes permiso para crear cotizaciones.", 403);
    return apiError("QUOTE_NOT_CREATED", error instanceof Error ? error.message : "No se pudo crear la cotización.", 400);
  }
}
