import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { QuoteInvalidFilterError, parseQuoteFilters } from "@/lib/quote-contract";
import { getQuotesPage } from "@/lib/quote-repository";
import { writeAuditLog } from "@/lib/audit";

function csv(value: unknown) { const text = value instanceof Date ? value.toISOString() : value == null ? "" : String(value); return `"${text.replaceAll('"', '""')}"`; }

export async function GET(request: Request) {
  try {
    const actor = await requireApiPermission("quotes.export");
    const filters = parseQuoteFilters(new URL(request.url).searchParams);
    const first = await getQuotesPage({ ...filters, page: 1, pageSize: 100 });
    const rows = [...first.items];
    for (let page = 2; page <= first.totalPages; page += 1) rows.push(...(await getQuotesPage({ ...filters, page, pageSize: 100 })).items);
    await writeAuditLog({ actorId: actor.userId, actorRole: actor.role, action: "quotes.exported", entityType: "quote", entityId: "quotes-export", metadata: { filters, rowCount: rows.length, pii: true } });
    const header = ["id", "tracking_code", "cliente", "tipo_cliente", "documento", "telefono", "correo", "contacto_preferido", "producto", "estado", "workflow", "items", "creado", "actualizado"];
    const body = rows.map((row) => [row.id, row.trackingCode, row.name, row.customerType, row.documentNumber, row.phone, row.email, row.preferredContact, row.productName, row.status, row.workflowStatus, row.itemCount, row.createdAt, row.updatedAt].map(csv).join(","));
    return new Response(`\uFEFF${header.map(csv).join(",")}\n${body.join("\n")}\n`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="cotizaciones-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("QUOTES_EXPORT_FORBIDDEN", "No tienes permiso para exportar cotizaciones.", 403);
    if (error instanceof QuoteInvalidFilterError) return apiError("QUOTE_INVALID_FILTER", "Los filtros de cotizaciones no son válidos.", 400);
    return apiError("QUOTES_EXPORT_FAILED", "No se pudo exportar cotizaciones.", 503);
  }
}
