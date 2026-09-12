import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { recordQuoteResponse } from "@/lib/quote-service";

const responses = ["ACCEPTED", "REJECTED", "NEEDS_CHANGES", "NO_RESPONSE"] as const;
const channels = ["WHATSAPP", "EMAIL", "PHONE", "IN_PERSON", "PORTAL", "OTHER"] as const;

export async function POST(request: Request) {
  try {
    const actor = await requireApiPermission("quotes.edit");
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const id = typeof body.quoteId === "string" ? body.quoteId : typeof body.id === "string" ? body.id : "";
    if (typeof body.response !== "string" || !responses.includes(body.response as typeof responses[number])) return apiError("INVALID_QUOTE_RESPONSE", "Respuesta de cotización inválida.", 400);
    if (typeof body.channel !== "string" || !channels.includes(body.channel as typeof channels[number])) return apiError("INVALID_RESPONSE_CHANNEL", "Canal de respuesta inválido.", 400);
    const quote = await recordQuoteResponse(id, { response: body.response as typeof responses[number], channel: body.channel as typeof channels[number], note: typeof body.note === "string" ? body.note.trim().slice(0, 500) : null, rejectionCode: typeof body.rejectionCode === "string" ? body.rejectionCode.trim().slice(0, 80) : null }, actor);
    return apiSuccess({ success: true, quote });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("QUOTES_FORBIDDEN", "No tienes permiso para registrar respuestas.", 403);
    return apiError("QUOTE_RESPONSE_NOT_SAVED", error instanceof Error ? error.message : "No se pudo registrar la respuesta.", 400);
  }
}
