import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { approveQuoteDiscount } from "@/lib/quote-service";

export async function PATCH(request: Request) {
  let actor: Awaited<ReturnType<typeof requireApiPermission>>;
  try {
    actor = await requireApiPermission("pricing.discount.approve");
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("QUOTE_DISCOUNT_FORBIDDEN", "No tienes permiso para aprobar descuentos.", 403);
    return apiError("QUOTE_DISCOUNT_AUTH_UNAVAILABLE", "No se pudo validar el acceso.", 503);
  }
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("QUOTE_DISCOUNT_INVALID_JSON", "JSON inválido.", 400); }
  const value = body && typeof body === "object" ? body as Record<string, unknown> : {};
  if (typeof value.approvalId !== "string" || !value.approvalId.trim()) return apiError("QUOTE_DISCOUNT_ID_REQUIRED", "Selecciona una solicitud de descuento.", 400);
  if (typeof value.approved !== "boolean") return apiError("QUOTE_DISCOUNT_DECISION_REQUIRED", "La decisión de descuento es obligatoria.", 400);
  const note = typeof value.note === "string" ? value.note.trim().slice(0, 500) : null;
  try {
    return apiSuccess({ approval: await approveQuoteDiscount(value.approvalId, value.approved, note, actor) });
  } catch (error) {
    return apiError("QUOTE_DISCOUNT_NOT_UPDATED", error instanceof Error ? error.message : "No se pudo actualizar la aprobación.", 409);
  }
}
