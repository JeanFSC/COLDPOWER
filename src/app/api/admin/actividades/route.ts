import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { createActivity, CrmDomainError } from "@/lib/crm-service";
import { activityTypes, type ActivityType } from "@/lib/crm-validation";

export async function POST(request: Request) {
  try {
    const actor = await requireApiPermission("crm.manage");
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
    const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
    if (typeof input.type !== "string" || !(activityTypes as readonly string[]).includes(input.type) || typeof input.subject !== "string" || !input.subject.trim()) return apiError("ACTIVITY_INVALID", "Tipo y asunto son obligatorios.", 400);
    const idempotencyKey = request.headers.get("Idempotency-Key") ?? (typeof input.idempotencyKey === "string" ? input.idempotencyKey : null);
    const result = await createActivity({ customerId: typeof input.customerId === "string" ? input.customerId : null, opportunityId: typeof input.opportunityId === "string" ? input.opportunityId : null, quoteId: typeof input.quoteId === "string" ? input.quoteId : null, type: input.type as ActivityType, subject: input.subject.trim().slice(0, 180), body: typeof input.body === "string" ? input.body.trim().slice(0, 2000) : null, dueAt: input.dueAt ? new Date(String(input.dueAt)) : null, idempotencyKey: idempotencyKey?.trim().slice(0, 180) || null }, actor);
    return apiSuccess({ activity: result.activity, idempotent: result.idempotent }, result.idempotent ? 200 : 201);
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("CRM_FORBIDDEN", "No tienes permiso para registrar actividades.", 403);
    if (error instanceof CrmDomainError) return apiError(error.code, error.message, error.status);
    return apiError("ACTIVITY_NOT_SAVED", error instanceof Error ? error.message : "No se pudo registrar la actividad.", 400);
  }
}
