import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { createSavedAuditFilter, listSavedAuditFilters } from "@/lib/audit-repository";

export async function GET() {
  try {
    const actor = await requireApiPermission("audit.view");
    return apiSuccess({ filters: await listSavedAuditFilters(actor.userId) });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("AUDIT_FORBIDDEN", "No tienes permiso para ver auditoría.", 403);
    return apiError("AUDIT_SAVED_FILTERS_UNAVAILABLE", "No se pudieron cargar los filtros guardados.", 503);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireApiPermission("audit.view");
    const body = (await request.json().catch(() => null)) as { name?: unknown; filters?: unknown } | null;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 80 || !body?.filters || typeof body.filters !== "object") {
      return apiError("AUDIT_INVALID_SAVED_FILTER", "El filtro necesita un nombre y al menos un criterio.", 400);
    }
    const saved = await createSavedAuditFilter(actor.userId, name, body.filters as Record<string, unknown>);
    return apiSuccess({ filter: saved });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("AUDIT_FORBIDDEN", "No tienes permiso para ver auditoría.", 403);
    return apiError("AUDIT_SAVED_FILTER_FAILED", "No se pudo guardar el filtro.", 503);
  }
}
