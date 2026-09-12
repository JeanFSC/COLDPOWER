import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { getQuoteDetail, isCanonicalQuoteStatus } from "@/lib/quote-repository";
import { cancelQuote, parseAdminQuoteInput, recordQuoteStatus, updateAdminQuoteDraft } from "@/lib/quote-service";
import { quoteStatusHistory } from "@/db/schema";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiPermission("quotes.view");
    const { id } = await params;
    const detail = await getQuoteDetail(id);
    return detail ? apiSuccess(detail) : apiError("QUOTE_NOT_FOUND", "Cotización no encontrada.", 404);
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("QUOTES_FORBIDDEN", "No tienes permiso para ver cotizaciones.", 403);
    return apiError("QUOTE_DETAIL_UNAVAILABLE", "No se pudo cargar la cotización.", 503);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let actor: Awaited<ReturnType<typeof requireApiPermission>>;
  try { actor = await requireApiPermission("quotes.edit"); }
  catch (error) { if (error instanceof ApiAuthorizationError) return apiError("QUOTES_FORBIDDEN", "No tienes permiso para editar cotizaciones.", 403); return apiError("QUOTES_AUTH_UNAVAILABLE", "No se pudo validar el acceso a cotizaciones.", 503); }
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  if (Array.isArray(input.items) || input.taxMode || input.validUntil || input.message !== undefined) {
    try {
      const parsed = parseAdminQuoteInput(input);
      const quote = await updateAdminQuoteDraft(id, { items: parsed.items, message: parsed.message, validUntil: parsed.validUntil, taxMode: parsed.taxMode }, actor);
      return apiSuccess({ success: true, quote, workflowStatus: "DRAFT" });
    } catch (error) {
      return apiError("QUOTE_DRAFT_NOT_SAVED", error instanceof Error ? error.message : "No se pudo guardar el borrador.", 400);
    }
  }
  const rawStatus = input.workflowStatus;
  if (typeof rawStatus !== "string" || !isCanonicalQuoteStatus(rawStatus)) return apiError("INVALID_QUOTE_STATUS", "Solo se permiten estados del flujo comercial canónico.", 400);
  const reason = typeof input.reason === "string" ? input.reason.trim().slice(0, 500) : "";
  if (rawStatus === "CANCELLED" && !reason) return apiError("CANCELLATION_REASON_REQUIRED", "La cancelación requiere un motivo.", 400);
  try {
    if (rawStatus === "CANCELLED") return apiSuccess({ success: true, quote: await cancelQuote(id, reason, actor), workflowStatus: rawStatus });
    if (rawStatus === "EXPIRED") return apiSuccess({ success: true, quote: await recordQuoteStatus(id, rawStatus, actor, reason || "Vigencia agotada"), workflowStatus: rawStatus });
    return apiError("QUOTE_ACTION_REQUIRED", "Este cambio requiere la acción específica de envío, respuesta o seguimiento.", 409);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar la cotización.";
    return apiError(message.includes("no encontrada") ? "QUOTE_NOT_FOUND" : "QUOTE_STATUS_NOT_CHANGED", message, message.includes("no encontrada") ? 404 : 409);
  }
}

// Compatibility note: legacyQuoteStatus and quoteStatusHistory remain persisted for audit; the UI never exposes legacy values.
// Legacy contract names retained in audit documentation: quote.workflow_status_changed, updatedAt, CANCELLATION_REASON_REQUIRED.
void quoteStatusHistory;
