import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { AuditInvalidFilterError, normalizeSavedAuditFilters } from "@/lib/audit-contract";
import { createSavedAuditFilter, deleteSavedAuditFilter, listSavedAuditFilters } from "@/lib/audit-repository";

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
    const filters = normalizeSavedAuditFilters(body.filters);
    const saved = await createSavedAuditFilter(actor.userId, name, filters);
    return apiSuccess({ filter: saved });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("AUDIT_FORBIDDEN", "No tienes permiso para ver auditoría.", 403);
    if (error instanceof AuditInvalidFilterError) return apiError("AUDIT_INVALID_SAVED_FILTER", "Los criterios del filtro no son v\u00e1lidos.", 400);
    return apiError("AUDIT_SAVED_FILTER_FAILED", "No se pudo guardar el filtro.", 503);
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requireApiPermission("audit.view");
    const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    if (!id || id.length > 200) return apiError("AUDIT_INVALID_SAVED_FILTER", "El filtro indicado no es v\u00e1lido.", 400);
    const deleted = await deleteSavedAuditFilter(actor.userId, id);
    if (!deleted) return apiError("AUDIT_SAVED_FILTER_NOT_FOUND", "El filtro no existe.", 404);
    return apiSuccess({ deleted: true });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("AUDIT_FORBIDDEN", "No tienes permiso para ver auditor\u00eda.", 403);
    return apiError("AUDIT_SAVED_FILTER_DELETE_FAILED", "No se pudo eliminar el filtro.", 503);
  }
}
