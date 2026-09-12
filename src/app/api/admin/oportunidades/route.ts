import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import { getPipelineBoard } from "@/lib/pipeline-repository";
import { parsePipelineFilters, PipelineInvalidFilterError } from "@/lib/pipeline-contract";
import { createOpportunity } from "@/lib/crm-service";
import { validateOpportunityInput } from "@/lib/crm-validation";
import { apiError, apiSuccess } from "@/lib/api-errors";

export async function GET(request: Request) {
  try {
    const actor = await requireApiPermission("crm.view");
    return apiSuccess(await getPipelineBoard(parsePipelineFilters(new URL(request.url).searchParams), { canManage: can(actor.role, "crm.manage"), canExport: can(actor.role, "crm.export") }));
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("PIPELINE_FORBIDDEN", "No tienes permiso para ver el pipeline.", 403);
    if (error instanceof PipelineInvalidFilterError) return apiError("PIPELINE_INVALID_FILTER", "Los filtros del pipeline no son válidos.", 400);
    return apiError("PIPELINE_UNAVAILABLE", "No se pudo cargar el pipeline.", 503);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireApiPermission("crm.manage");
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
    const input = validateOpportunityInput(body && typeof body === "object" ? body as Record<string, unknown> : {});
    const opportunity = await createOpportunity(input, actor);
    return apiSuccess({ opportunity }, 201);
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("PIPELINE_FORBIDDEN", "No tienes permiso para crear oportunidades.", 403);
    return apiError("OPPORTUNITY_NOT_SAVED", error instanceof Error ? error.message : "No se pudo guardar la oportunidad.", 400);
  }
}
