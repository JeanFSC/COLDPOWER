import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { PurchasesInvalidFilterError, parsePurchasesFilters } from "@/lib/purchases-contract";
import { getPurchasesPage } from "@/lib/purchases-repository";
import { writeAuditLog } from "@/lib/audit";

function csv(value: unknown) {
  const text = value instanceof Date ? value.toISOString() : value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  try {
    const actor = await requireApiPermission("purchases.view");
    const filters = parsePurchasesFilters(new URL(request.url).searchParams);
    const first = await getPurchasesPage({ ...filters, page: 1, pageSize: 100 });
    const rows = [...first.items];
    for (let page = 2; page <= first.totalPages; page += 1) rows.push(...(await getPurchasesPage({ ...filters, page, pageSize: 100 })).items);
    await writeAuditLog({ actorId: actor.userId, actorRole: actor.role, action: "purchases.exported", entityType: "purchase", entityId: "purchases-export", metadata: { filters, rowCount: rows.length } });
    const header = ["id", "codigo", "proveedor", "estado", "moneda", "subtotal", "creado", "actualizado"];
    const body = rows.map((row) => [row.id, row.code, row.supplierName, row.status, row.currency, row.subtotal, row.createdAt, row.updatedAt].map(csv).join(","));
    return new Response(`\uFEFF${header.map(csv).join(",")}\n${body.join("\n")}\n`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="compras-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("PURCHASES_EXPORT_FORBIDDEN", "No tienes permiso para exportar compras.", 403);
    if (error instanceof PurchasesInvalidFilterError) return apiError("PURCHASES_INVALID_FILTER", "Los filtros de compras no son válidos.", 400);
    return apiError("PURCHASES_EXPORT_FAILED", "No se pudo exportar compras.", 503);
  }
}
