import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { getDb } from "@/db";
import { auditLogs } from "@/db/schema";
import { getPromotionPage, parsePromotionFilters, PromotionInvalidFilterError } from "@/lib/promotion-repository";

function csv(value: unknown) {
  const text = value === null || value === undefined ? "" : value instanceof Date ? value.toISOString() : String(value);
  return "\"" + text.replace(/"/g, "\"\"") + "\"";
}

export async function GET(request: Request) {
  try {
    const actor = await requireApiPermission("promotions.export");
    const filters = parsePromotionFilters(new URL(request.url).searchParams);
    const first = await getPromotionPage({ ...filters, page: 1, pageSize: 100 });
    const items = [...first.items];
    for (let page = 2; page <= first.totalPages; page += 1) items.push(...(await getPromotionPage({ ...filters, page, pageSize: 100 })).items);
    const header = ["ID", "Nombre", "Tipo", "Valor", "Estado", "Estado efectivo", "Prioridad", "Política", "Inicio", "Fin", "Productos", "Categorías"];
    const lines = [header.map(csv).join(","), ...items.map((item) => [item.id, item.name, item.type, item.discountValue, item.status, item.effectiveStatus, item.priority, item.policy, item.startsAt, item.endsAt, item.productCount, item.categoryCount].map(csv).join(","))];
    await getDb().insert(auditLogs).values({ id: "audit-" + crypto.randomUUID(), actorId: actor.userId, actorRole: actor.role, action: "promotions.exported", entityType: "promotion", entityId: "collection", module: "promotions", before: null, after: null, metadata: { filters, count: items.length } });
    return new Response("\ufeff" + lines.join("\r\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=coldpower-promociones.csv", "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("PROMOTIONS_EXPORT_FORBIDDEN", "No tienes permiso para exportar promociones.", 403);
    if (error instanceof PromotionInvalidFilterError) return apiError("PROMOTIONS_INVALID_FILTER", "Los filtros de promociones no son válidos.", 400);
    return apiError("PROMOTIONS_EXPORT_FAILED", "No se pudieron exportar las promociones.", 503);
  }
}
