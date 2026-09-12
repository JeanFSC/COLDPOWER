import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { createQuoteFollowUp } from "@/lib/quote-service";

export async function POST(request: Request) {
  try {
    const actor = await requireApiPermission("quotes.edit");
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const id = typeof body.quoteId === "string" ? body.quoteId : typeof body.id === "string" ? body.id : "";
    const dueAt = typeof body.dueAt === "string" ? new Date(body.dueAt) : new Date(NaN);
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 180) : "";
    const task = await createQuoteFollowUp(id, { dueAt, title, note: typeof body.note === "string" ? body.note.trim().slice(0, 1000) : null, assignedTo: typeof body.assignedTo === "string" ? body.assignedTo.trim() || null : null }, actor);
    return apiSuccess({ success: true, task }, 201);
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("QUOTES_FORBIDDEN", "No tienes permiso para crear seguimientos.", 403);
    return apiError("QUOTE_FOLLOW_UP_NOT_CREATED", error instanceof Error ? error.message : "No se pudo crear el seguimiento.", 400);
  }
}
