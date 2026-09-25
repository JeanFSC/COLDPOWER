import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { createDiscountRule, setDiscountRuleStatus, updateDiscountRule } from "@/lib/discount-service";
import { listDiscountRules } from "@/lib/pricing-repository";
import { can } from "@/lib/roles";

// Las mutaciones se delegan a discount-service, que las ejecuta en transaction y registra auditLogs.

function mapError(error: unknown) {
  if (error instanceof ApiAuthorizationError || (error instanceof Error && error.message === "DISCOUNT_FORBIDDEN")) return apiError("DISCOUNT_FORBIDDEN", "No tienes permiso para gestionar descuentos.", 403);
  const message = error instanceof Error ? error.message : "No se pudo actualizar la regla.";
  if (message === "DISCOUNT_NOT_FOUND") return apiError(message, "Regla de descuento no encontrada.", 404);
  if (["DISCOUNT_INVALID_STATUS", "DISCOUNT_INVALID_WINDOW", "DISCOUNT_REASON_REQUIRED"].includes(message)) return apiError(message, "Los datos de la regla no son válidos.", 400);
  if (/nombre|porcentaje|aprobación/.test(message)) return apiError("DISCOUNT_INVALID", message, 400);
  return apiError("DISCOUNT_UNAVAILABLE", message, 503);
}

export async function GET() {
  try {
    let actor;
    try {
      actor = await requireApiPermission("pricing.view");
    } catch (error) {
      if (!(error instanceof ApiAuthorizationError)) throw error;
      actor = await requireApiPermission("pricing.discount.apply");
    }
    if (!can(actor.role, "pricing.view") && !can(actor.role, "pricing.discount.apply")) return apiError("PRICING_FORBIDDEN", "No tienes permiso para consultar reglas de descuento.", 403);
    return apiSuccess({ items: await listDiscountRules() });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("PRICING_FORBIDDEN", "No tienes permiso para ver descuentos.", 403);
    return apiError("DISCOUNT_UNAVAILABLE", "No se pudieron cargar las reglas.", 503);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireApiPermission("pricing.discount.manage");
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
    const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const result = await createDiscountRule({ name: input.name, maxPercentage: input.maxPercentage, approvalAbovePercentage: input.approvalAbovePercentage, validFrom: input.validFrom, validUntil: input.validUntil, reason: input.reason }, actor);
    return apiSuccess(result, 201);
  } catch (error) {
    return mapError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireApiPermission("pricing.discount.manage");
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
    const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const id = typeof input.id === "string" ? input.id.trim() : "";
    if (!id) return apiError("DISCOUNT_ID_REQUIRED", "id es obligatorio.", 400);
    const hasDetails = ["name", "maxPercentage", "approvalAbovePercentage", "validFrom", "validUntil"].some((key) => key in input);
    const result = hasDetails
      ? await updateDiscountRule(id, { name: input.name, maxPercentage: input.maxPercentage, approvalAbovePercentage: input.approvalAbovePercentage, status: input.status, validFrom: input.validFrom, validUntil: input.validUntil, reason: input.reason }, actor)
      : await setDiscountRuleStatus(id, input.status, input.reason, actor);
    return apiSuccess(result);
  } catch (error) {
    return mapError(error);
  }
}
