import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { sendQuote } from "@/lib/quote-service";

const channels = ["WHATSAPP", "EMAIL", "PHONE", "IN_PERSON", "PORTAL", "OTHER"] as const;

export async function POST(request: Request) {
  try {
    const actor = await requireApiPermission("quotes.send");
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const id = typeof body.quoteId === "string" ? body.quoteId : typeof body.id === "string" ? body.id : "";
    const channel = typeof body.channel === "string" && channels.includes(body.channel as typeof channels[number]) ? body.channel : "OTHER";
    if (channel === "WHATSAPP" && body.providerConfirmed !== true) return apiError("WHATSAPP_CONFIRMATION_REQUIRED", "Abrir WhatsApp no registra el envío. Confirma un proveedor o registra el envío después de realizarlo.", 409);
    const result = await sendQuote(id, actor, channel, typeof body.recipient === "string" ? body.recipient.trim().slice(0, 240) : null);
    return apiSuccess({ success: true, ...result });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("QUOTES_FORBIDDEN", "No tienes permiso para enviar cotizaciones.", 403);
    return apiError("QUOTE_NOT_SENT", error instanceof Error ? error.message : "No se pudo enviar la cotización.", 400);
  }
}
