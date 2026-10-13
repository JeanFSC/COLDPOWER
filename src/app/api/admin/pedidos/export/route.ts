import { tabularWorkbook } from "@/lib/tabular-workbook";
import { csvCell as csv } from "@/lib/csv";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { OrdersInvalidFilterError, parseOrdersFilters } from "@/lib/orders-contract";
import { getOrdersPage } from "@/lib/orders-repository";
import { writeAuditLog } from "@/lib/audit";
import { can } from "@/lib/roles";

export async function GET(request: Request) {
  try {
    const actor = await requireApiPermission("orders.view");
    const filters = parseOrdersFilters(new URL(request.url).searchParams);
    const canViewAmounts = can(actor.role, "sales.view") || can(actor.role, "payments.view");
    const pageOptions = {
      includeAmounts: canViewAmounts,
      includeFinancial: can(actor.role, "payments.view"),
    };
    const first = await getOrdersPage({ ...filters, page: 1, pageSize: 100 }, pageOptions);
    const rows = [...first.items];
    for (let page = 2; page <= first.totalPages; page += 1) {
      rows.push(...(await getOrdersPage({ ...filters, page, pageSize: 100 }, pageOptions)).items);
    }
    await writeAuditLog({
      actorId: actor.userId,
      actorRole: actor.role,
      action: "orders.exported",
      entityType: "order",
      entityId: "orders-export",
      metadata: { filters, rowCount: rows.length, pii: true },
    });
    const header = [
      "Pedido",
      "Cliente",
      "Productos",
      ...(canViewAmounts ? ["Total", "Moneda"] : []),
      "Estado",
      ...(pageOptions.includeFinancial ? ["Pago"] : []),
      "Atención",
      "Entrega",
      "Local",
      "Vendedor",
      "Fecha",
      "Dirección",
      "Actualizado",
    ];
    const values = rows
      .map((row) =>
        [
          row.code,
          row.customerName,
          `${row.pickedQuantity}/${row.totalQuantity}`,
          ...(canViewAmounts ? [row.total, row.currency] : []),
          row.status,
          ...(pageOptions.includeFinancial ? [row.paymentReconciliation] : []),
          row.attention,
          row.deliveryMethod,
          row.locationName,
          row.sellerName ?? "Sin asignar",
          row.createdAt,
          row.deliveryAddress,
          row.updatedAt,
        ],
      );
    const filename = `pedidos-${new Date().toISOString().slice(0, 10)}`;
    if (new URL(request.url).searchParams.get("format") === "csv") {
      const body = values.map((row) => row.map(csv).join(",")).join("\n");
      return new Response(`\uFEFF${header.map(csv).join(",")}\n${body}\n`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}.csv"`, "Cache-Control": "no-store" } });
    }
    const workbookRows = values.map((row) => row.map((value, index) => canViewAmounts && index === 3 && value != null ? Number(value) : value));
    return new Response(Buffer.from(tabularWorkbook("Pedidos", header, workbookRows)), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}.xlsx"`, "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("ORDERS_EXPORT_FORBIDDEN", "No tienes permiso para exportar pedidos.", 403);
    if (error instanceof OrdersInvalidFilterError) return apiError("ORDERS_INVALID_FILTER", "Los filtros de pedidos no son válidos.", 400);
    return apiError("ORDERS_EXPORT_FAILED", "No se pudo exportar pedidos.", 503);
  }
}
