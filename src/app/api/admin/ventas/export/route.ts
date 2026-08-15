import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { SalesInvalidFilterError, parseSalesFilters } from "@/lib/sales-contract";
import { getSalesPage } from "@/lib/sales-repository";
import { writeAuditLog } from "@/lib/audit";

function csv(value: unknown) {
  const text = value instanceof Date ? value.toISOString() : value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  try {
    const actor = await requireApiPermission("sales.view");
    const filters = parseSalesFilters(new URL(request.url).searchParams);
    const first = await getSalesPage({ ...filters, page: 1, pageSize: 100 });
    const rows = [...first.items];
    for (let page = 2; page <= first.totalPages; page += 1) rows.push(...(await getSalesPage({ ...filters, page, pageSize: 100 })).items);
    await writeAuditLog({ actorId: actor.userId, actorRole: actor.role, action: "sales.exported", entityType: "sale", entityId: "sales-export", metadata: { filters, rowCount: rows.length, pii: true } });
    const header = ["id", "codigo", "cliente", "correo", "estado", "subtotal", "descuento", "total", "moneda", "facturacion", "referencia_factura", "creado", "actualizado"];
    const body = rows.map((row) => [row.id, row.code, row.customerName, row.customerEmail, row.status, row.subtotal, row.discountAmount, row.total, row.currency, row.invoiceStatus, row.externalInvoiceReference, row.createdAt, row.updatedAt].map(csv).join(","));
    return new Response(`\uFEFF${header.map(csv).join(",")}\n${body.join("\n")}\n`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="ventas-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("SALES_EXPORT_FORBIDDEN", "No tienes permiso para exportar ventas.", 403);
    if (error instanceof SalesInvalidFilterError) return apiError("SALES_INVALID_FILTER", "Los filtros de ventas no son válidos.", 400);
    return apiError("SALES_EXPORT_FAILED", "No se pudo exportar ventas.", 503);
  }
}
