import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { createNewQuoteVersion } from "@/lib/quote-service";

export async function POST(request: Request) {
  try {
    const actor = await requireApiPermission("quotes.edit");
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const id = typeof body.quoteId === "string" ? body.quoteId : typeof body.id === "string" ? body.id : "";
    const quote = await createNewQuoteVersion(id, actor);
    return apiSuccess({ success: true, quote });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("QUOTES_FORBIDDEN", "No tienes permiso para crear versiones.", 403);
    return apiError("QUOTE_VERSION_NOT_CREATED", error instanceof Error ? error.message : "No se pudo crear la nueva versión.", 400);
  }
}
