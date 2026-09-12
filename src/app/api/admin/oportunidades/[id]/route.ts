import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { getPipelineDetail } from "@/lib/pipeline-repository";
import { changeOpportunityStage, CrmDomainError } from "@/lib/crm-service";
import { opportunityStages, type OpportunityStage } from "@/lib/crm-validation";
import { apiError, apiSuccess } from "@/lib/api-errors";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiPermission("crm.view");
    const { id } = await params;
    const opportunity = await getPipelineDetail(id);
    return opportunity
      ? apiSuccess({
          ...opportunity.opportunity,
          items: opportunity.items,
          stageHistory: opportunity.stageHistory,
          activities: opportunity.activities,
          legacyActivities: opportunity.legacyActivities,
          followUps: opportunity.followUps,
          tasks: opportunity.tasks,
        })
      : apiError("OPPORTUNITY_NOT_FOUND", "Oportunidad no encontrada.", 404);
  } catch (error) {
    if (error instanceof ApiAuthorizationError)
      return apiError("PIPELINE_FORBIDDEN", "No tienes permiso para ver el pipeline.", 403);
    return apiError("OPPORTUNITY_DETAIL_UNAVAILABLE", "No se pudo cargar la oportunidad.", 503);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiPermission("crm.manage");
    const { id } = await params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("INVALID_JSON", "JSON inválido.", 400);
    }
    const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const stage = input.stage;
    if (typeof stage !== "string" || !(opportunityStages as readonly string[]).includes(stage))
      return apiError("INVALID_STAGE", "Etapa inválida.", 400);
    const followUpAt = input.followUpAt
      ? new Date(String(input.followUpAt))
      : input.followUpAt === null
        ? null
        : undefined;
    if (followUpAt && Number.isNaN(followUpAt.getTime()))
      return apiError("INVALID_FOLLOW_UP", "La fecha de seguimiento no es válida.", 400);
    const attempts =
      input.attempts == null || input.attempts === "" ? null : Number(input.attempts);
    if (attempts !== null && (!Number.isInteger(attempts) || attempts < 0 || attempts > 1000))
      return apiError("INVALID_ATTEMPTS", "El número de intentos no es válido.", 400);
    return apiSuccess({
      opportunity: await changeOpportunityStage(
        id,
        stage as OpportunityStage,
        actor,
        typeof input.note === "string" ? input.note : undefined,
        followUpAt,
        typeof input.nextAction === "string" ? input.nextAction : undefined,
        {
          lostReason: typeof input.lostReason === "string" ? input.lostReason : null,
          cancellationReason:
            typeof input.cancellationReason === "string" ? input.cancellationReason : null,
          attempts,
        },
      ),
    });
  } catch (error) {
    if (error instanceof ApiAuthorizationError)
      return apiError("PIPELINE_FORBIDDEN", "No tienes permiso para editar el pipeline.", 403);
    if (error instanceof CrmDomainError) return apiError(error.code, error.message, error.status);
    return apiError(
      "OPPORTUNITY_STAGE_NOT_CHANGED",
      error instanceof Error ? error.message : "No se pudo mover la oportunidad.",
      409,
    );
  }
}
