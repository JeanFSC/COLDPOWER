import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { AuditInvalidFilterError, parseAuditFilters, presentAuditItem } from "@/lib/audit-contract";
import { getAuditPage } from "@/lib/audit-repository";
import { sanitizeAuditValue } from "@/lib/operational-semantics";
import { can } from "@/lib/roles";

export async function GET(request: Request) { try { const actor = await requireApiPermission("audit.view"); const canViewSensitive = can(actor.role, "audit.sensitive.view"); const page = await getAuditPage(parseAuditFilters(new URL(request.url).searchParams)); return apiSuccess({ ...page, items: page.items.map((item) => presentAuditItem(item, canViewSensitive, sanitizeAuditValue)) }); } catch (error) { if (error instanceof ApiAuthorizationError) return apiError("AUDIT_FORBIDDEN", "No tienes permiso para ver auditoría.", 403); if (error instanceof AuditInvalidFilterError) return apiError("AUDIT_INVALID_FILTER", "Los filtros de auditoría no son válidos.", 400); return apiError("AUDIT_UNAVAILABLE", "No se pudo cargar la auditoría.", 503); } }
