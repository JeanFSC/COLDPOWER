import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { createOpportunityFollowup, CrmDomainError } from "@/lib/crm-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiPermission("crm.manage");
    const { id } = await params;
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
    const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const title = typeof input.title === "string" ? input.title.trim() : "";
    const dueAt = input.dueAt ? new Date(String(input.dueAt)) : new Date(NaN);
    if (!title || Number.isNaN(dueAt.getTime())) return apiError("FOLLOW_UP_INVALID", "Título y fecha son obligatorios.", 400);
    const followup = await createOpportunityFollowup({ opportunityId: id, title, dueAt, assignedTo: typeof input.assignedTo === "string" ? input.assignedTo : null }, actor);
    return apiSuccess({ followup }, 201);
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("CRM_FORBIDDEN", "No tienes permiso para administrar seguimientos.", 403);
    if (error instanceof CrmDomainError) return apiError(error.code, error.message, error.status);
    return apiError("FOLLOW_UP_NOT_SAVED", error instanceof Error ? error.message : "No se pudo guardar el seguimiento.", 400);
  }
}
