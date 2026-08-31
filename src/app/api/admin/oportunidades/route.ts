import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { getPipelinePage } from "@/lib/pipeline-repository";
import { parsePipelineFilters, PipelineInvalidFilterError } from "@/lib/pipeline-contract";
import { createOpportunity } from "@/lib/crm-service";
import { validateOpportunityInput } from "@/lib/crm-validation";
import { apiError, apiSuccess } from "@/lib/api-errors";

export async function GET(request: Request) {
  try {
    await requireApiPermission("crm.view");
    return apiSuccess(await getPipelinePage(parsePipelineFilters(new URL(request.url).searchParams)));
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
    const raw = body as Record<string, unknown>;
    const opportunity = await createOpportunity(input, actor, Array.isArray(raw.itemIds) ? raw.itemIds.filter((item): item is string => typeof item === "string").slice(0, 100) : []);
    return apiSuccess({ opportunity }, 201);
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("PIPELINE_FORBIDDEN", "No tienes permiso para crear oportunidades.", 403);
    return apiError("OPPORTUNITY_NOT_SAVED", error instanceof Error ? error.message : "No se pudo guardar la oportunidad.", 400);
  }
}
