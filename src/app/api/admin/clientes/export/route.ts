import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { parseCustomerFilters, CustomerInvalidFilterError } from "@/lib/customer-contract";
import { getCustomersPage } from "@/lib/customer-repository";
import { writeAuditLog } from "@/lib/audit";

function csv(value: unknown) {
  const text = value instanceof Date ? value.toISOString() : value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  try {
    const actor = await requireApiPermission("customers.export");
    const filters = parseCustomerFilters(new URL(request.url).searchParams);
    const first = await getCustomersPage({ ...filters, page: 1, pageSize: 100 });
    const rows = [...first.items];
    for (let page = 2; page <= first.totalPages; page += 1) {
      const next = await getCustomersPage({ ...filters, page, pageSize: 100 });
      rows.push(...next.items);
    }
    await writeAuditLog({ actorId: actor.userId, actorRole: actor.role, action: "customers.exported", entityType: "customer", entityId: "customers-export", metadata: { filters, rowCount: rows.length, pii: true } });
    const header = ["id", "nombre", "razon_social", "documento", "ruc", "correo", "telefono", "whatsapp", "direccion", "ubicacion", "tipo", "estado", "vendedor", "cotizaciones", "oportunidades_abiertas", "pedidos", "ultima_actividad", "creado", "actualizado"];
    const body = rows.map((row) => [row.id, row.name, row.legalName, row.documentNumber, row.ruc, row.email, row.phone, row.whatsapp, row.address, row.location, row.customerType, row.status, row.assignedSeller?.name ?? row.assignedSeller?.email, row.quoteCount, row.openOpportunityCount, row.orderCount, row.lastActivityAt, row.createdAt, row.updatedAt].map(csv).join(","));
    return new Response(`\uFEFF${header.map(csv).join(",")}\n${body.join("\n")}\n`, { status: 200, headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="clientes-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("CUSTOMERS_EXPORT_FORBIDDEN", "No tienes permiso para exportar clientes.", 403);
    if (error instanceof CustomerInvalidFilterError) return apiError("CUSTOMER_INVALID_FILTER", "Los filtros de clientes no son válidos.", 400);
    return apiError("CUSTOMERS_EXPORT_FAILED", "No se pudo exportar clientes.", 503);
  }
}
