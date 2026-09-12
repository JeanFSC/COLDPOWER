import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { getDb } from "@/db";
import { auditLogs } from "@/db/schema";
import { parsePaymentsFilters, PaymentsInvalidFilterError } from "@/lib/payments-contract";
import { getPaymentsPage } from "@/lib/payments-repository";

function csv(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }

export async function GET(request: Request) {
  try {
    const actor = await requireApiPermission("payments.export");
    const filters = parsePaymentsFilters(new URL(request.url).searchParams);
    const all = await getPaymentsPage({ ...filters, page: 1, pageSize: 100 });
    const items = [...all.items];
    for (let page = 2; page <= all.totalPages; page += 1) items.push(...(await getPaymentsPage({ ...filters, page, pageSize: 100 })).items);
    const lines = [
      ["Pago", "Pedido", "Venta", "Cliente", "Monto", "Moneda", "Método", "Proveedor", "Referencia", "Estado", "Esperado", "Neto recibido", "Diferencia", "Conciliación", "Intentos", "Fecha"].map(csv).join(","),
      ...items.map((item) => [item.id, item.orderCode, item.saleCode, item.customerName, item.amount, item.currency, item.method, item.provider, item.providerReference, item.status, item.expectedAmount, item.netReceivedAmount, item.difference, item.reconciliation, item.attempts, item.createdAt.toISOString()].map(csv).join(",")),
    ];
    await getDb().insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "payments.exported", entityType: "payment", entityId: "collection", before: null, after: null, metadata: { filters, count: items.length } });
    return new Response(`\ufeff${lines.join("\r\n")}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="coldpower-pagos.csv"` } });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("PAYMENTS_EXPORT_FORBIDDEN", "No tienes permiso para exportar pagos.", 403);
    if (error instanceof PaymentsInvalidFilterError) return apiError("PAYMENTS_INVALID_FILTER", "Los filtros de pagos no son válidos.", 400);
    return apiError("PAYMENTS_EXPORT_FAILED", "No se pudo exportar pagos.", 503);
  }
}
