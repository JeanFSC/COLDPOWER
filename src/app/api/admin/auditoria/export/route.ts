import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { auditLogs } from "@/db/schema";
import { getDb } from "@/db";
import { AuditInvalidFilterError, parseAuditFilters } from "@/lib/audit-contract";
import { getAuditPage } from "@/lib/audit-repository";
import { sanitizeAuditValue } from "@/lib/operational-semantics";
import { can } from "@/lib/roles";
import { csvCell } from "@/lib/csv";

const MAX_EXPORT_ITEMS = 5_000;

export async function GET(request: Request) {
  try {
    const actor = await requireApiPermission("audit.export");
    const filters = parseAuditFilters(new URL(request.url).searchParams);
    const first = await getAuditPage({ ...filters, page: 1, pageSize: 100 });
    const pages = Math.min(first.totalPages, Math.ceil(MAX_EXPORT_ITEMS / 100));
    const items = [...first.items];
    for (let page = 2; page <= pages && items.length < MAX_EXPORT_ITEMS; page += 1) {
      items.push(...(await getAuditPage({ ...filters, page, pageSize: 100 })).items);
    }
    const truncated = first.totalItems > MAX_EXPORT_ITEMS;
    const limitedItems = items.slice(0, MAX_EXPORT_ITEMS);
    const canViewSensitive = can(actor.role, "audit.sensitive.view");
    const lines = [
      ["ID", "Fecha", "Actor", "Rol", "Acción", "Módulo", "Entidad", "Entidad ID", "Antes", "Después", "Origen", "Request ID", "Correlation ID", "Severidad"].map(csvCell).join(","),
      ...limitedItems.map((item) => [
        item.id,
        item.createdAt.toISOString(),
        item.actorId ?? "SYSTEM",
        item.actorRole,
        item.action,
        item.module,
        item.entityType,
        item.entityId,
        canViewSensitive ? sanitizeAuditValue(item.before) : "[REDACTED]",
        canViewSensitive ? sanitizeAuditValue(item.after) : "[REDACTED]",
        item.origin,
        item.requestId,
        item.correlationId,
        item.severity,
      ].map(csvCell).join(",")),
    ];
    if (truncated) lines.push(["AVISO", `Exportación limitada a ${MAX_EXPORT_ITEMS} registros`, "", "", "", "", "", "", "", "", "", "", "", ""].map(csvCell).join(","));
    await getDb().insert(auditLogs).values({
      id: `audit-${crypto.randomUUID()}`,
      actorId: actor.userId,
      actorRole: actor.role,
      action: "audit.exported",
      entityType: "audit",
      entityId: "collection",
      module: "audit",
      severity: "INFO",
      before: null,
      after: null,
      metadata: { filters, count: limitedItems.length, maxItems: MAX_EXPORT_ITEMS, truncated, sensitive: canViewSensitive },
    });
    return new Response(`\ufeff${lines.join("\r\n")}`, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=coldpower-auditoria.csv",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("AUDIT_EXPORT_FORBIDDEN", "No tienes permiso para exportar auditoría.", 403);
    if (error instanceof AuditInvalidFilterError) return apiError("AUDIT_INVALID_FILTER", "Los filtros de auditoría no son válidos.", 400);
    return apiError("AUDIT_EXPORT_FAILED", "No se pudo exportar la auditoría.", 503);
  }
}
