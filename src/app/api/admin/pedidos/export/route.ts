import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { OrdersInvalidFilterError, parseOrdersFilters } from "@/lib/orders-contract";
import { getOrdersPage } from "@/lib/orders-repository";
import { writeAuditLog } from "@/lib/audit";

function csv(value: unknown) {
  const text = value instanceof Date ? value.toISOString() : value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  try {
    const actor = await requireApiPermission("orders.view");
    const filters = parseOrdersFilters(new URL(request.url).searchParams);
    const first = await getOrdersPage({ ...filters, page: 1, pageSize: 100 });
    const rows = [...first.items];
    for (let page = 2; page <= first.totalPages; page += 1) rows.push(...(await getOrdersPage({ ...filters, page, pageSize: 100 })).items);
    await writeAuditLog({ actorId: actor.userId, actorRole: actor.role, action: "orders.exported", entityType: "order", entityId: "orders-export", metadata: { filters, rowCount: rows.length, pii: true } });
    const header = ["id", "codigo", "cliente", "correo", "estado", "entrega", "direccion", "total", "moneda", "creado", "actualizado"];
    const body = rows.map((row) => [row.id, row.code, row.customerName, row.customerEmail, row.status, row.deliveryMethod, row.deliveryAddress, row.total, row.currency, row.createdAt, row.updatedAt].map(csv).join(","));
    return new Response(`\uFEFF${header.map(csv).join(",")}\n${body.join("\n")}\n`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="pedidos-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("ORDERS_EXPORT_FORBIDDEN", "No tienes permiso para exportar pedidos.", 403);
    if (error instanceof OrdersInvalidFilterError) return apiError("ORDERS_INVALID_FILTER", "Los filtros de pedidos no son válidos.", 400);
    return apiError("ORDERS_EXPORT_FAILED", "No se pudo exportar pedidos.", 503);
  }
}
