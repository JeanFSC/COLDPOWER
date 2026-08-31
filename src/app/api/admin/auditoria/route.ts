import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { AuditInvalidFilterError, parseAuditFilters } from "@/lib/audit-contract";
import { getAuditPage } from "@/lib/audit-repository";

export async function GET(request: Request) { try { await requireApiPermission("audit.view"); return apiSuccess(await getAuditPage(parseAuditFilters(new URL(request.url).searchParams))); } catch (error) { if (error instanceof ApiAuthorizationError) return apiError("AUDIT_FORBIDDEN", "No tienes permiso para ver auditoría.", 403); if (error instanceof AuditInvalidFilterError) return apiError("AUDIT_INVALID_FILTER", "Los filtros de auditoría no son válidos.", 400); return apiError("AUDIT_UNAVAILABLE", "No se pudo cargar la auditoría.", 503); } }
