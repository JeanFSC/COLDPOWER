import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { CrmDomainError, updateOpportunityFollowup } from "@/lib/crm-service";
import { taskStatuses, type TaskStatus } from "@/lib/crm-validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; followUpId: string }> }) {
  try {
    const actor = await requireApiPermission("crm.manage");
    const { followUpId } = await params;
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
    const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const status = typeof input.status === "string" ? input.status : undefined;
    if (status && !(taskStatuses as readonly string[]).includes(status)) return apiError("FOLLOW_UP_INVALID", "Estado de seguimiento inválido.", 400);
    const dueAt = input.dueAt === undefined ? undefined : input.dueAt === null ? new Date(NaN) : new Date(String(input.dueAt));
    if (dueAt && Number.isNaN(dueAt.getTime())) return apiError("FOLLOW_UP_INVALID", "La fecha de seguimiento no es válida.", 400);
    const followup = await updateOpportunityFollowup(followUpId, { title: typeof input.title === "string" ? input.title : undefined, dueAt, status: status as TaskStatus | undefined }, actor);
    return apiSuccess({ followup });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("CRM_FORBIDDEN", "No tienes permiso para administrar seguimientos.", 403);
    if (error instanceof CrmDomainError) return apiError(error.code, error.message, error.status);
    return apiError("FOLLOW_UP_NOT_UPDATED", error instanceof Error ? error.message : "No se pudo actualizar el seguimiento.", 400);
  }
}
