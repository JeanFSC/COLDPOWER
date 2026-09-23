import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { presentAuditItem } from "@/lib/audit-contract";
import { getAuditDetail } from "@/lib/audit-repository";
import { sanitizeAuditValue } from "@/lib/operational-semantics";
import { can } from "@/lib/roles";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) { try { const actor = await requireApiPermission("audit.view"); const { id } = await params; const detail = await getAuditDetail(id); if (!detail) return apiError("AUDIT_NOT_FOUND", "Evento de auditoría no encontrado.", 404); const sensitive = can(actor.role, "audit.sensitive.view"); return apiSuccess({ event: presentAuditItem(detail, sensitive, sanitizeAuditValue), sensitive }); } catch (error) { if (error instanceof ApiAuthorizationError) return apiError("AUDIT_FORBIDDEN", "No tienes permiso para ver auditoría.", 403); return apiError("AUDIT_DETAIL_UNAVAILABLE", "No se pudo cargar el evento.", 503); } }
