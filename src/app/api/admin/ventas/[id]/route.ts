import { apiError, apiSuccess } from "@/lib/api-errors";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { getSaleDetail } from "@/lib/sales-repository";
import { can } from "@/lib/roles";
import { cancelSale } from "@/lib/sales-service";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const actor = await requireApiPermission("sales.view"); const { id } = await params; const detail = await getSaleDetail(id, { includeFinancial: can(actor.role, "payments.view") }); return detail ? apiSuccess(detail) : apiError("SALE_NOT_FOUND", "Venta no encontrada.", 404); }
  catch (error) { if (error instanceof ApiAuthorizationError) return apiError("SALES_FORBIDDEN", "No tienes permiso para ver ventas.", 403); return apiError("SALE_DETAIL_UNAVAILABLE", "No se pudo cargar la venta.", 503); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let actor: Awaited<ReturnType<typeof requireApiPermission>>;
  try { actor = await requireApiPermission("sales.cancel"); } catch (error) { if (error instanceof ApiAuthorizationError) return apiError("SALES_FORBIDDEN", "No tienes permiso para cancelar ventas.", 403); return apiError("SALES_AUTH_UNAVAILABLE", "No se pudo validar el acceso a ventas.", 503); }
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
  const reason = body && typeof body === "object" && typeof (body as Record<string, unknown>).reason === "string" ? ((body as Record<string, unknown>).reason as string).trim().slice(0, 500) : "";
  if (!reason) return apiError("CANCELLATION_REASON_REQUIRED", "La cancelación de una venta requiere un motivo.", 400);
  try {
    const result = await cancelSale(id, actor, reason);
    return apiSuccess({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cancelar la venta.";
    const code = message === "SALE_INVOICED_CANNOT_CANCEL" ? message : message === "SALE_DELIVERED_CANNOT_CANCEL" ? message : message === "ORDER_PAID_CANCELLATION_REQUIRES_REFUND" ? "SALE_PAID_CANCELLATION_REQUIRES_REFUND" : message.includes("no encontrada") ? "SALE_NOT_FOUND" : "SALE_NOT_CANCELLED";
    const humanMessage = code === "SALE_INVOICED_CANNOT_CANCEL" ? "Una venta facturada externamente no puede cancelarse desde este flujo." : code === "SALE_DELIVERED_CANNOT_CANCEL" ? "Una venta con pedido entregado no puede cancelarse." : code === "SALE_PAID_CANCELLATION_REQUIRES_REFUND" ? "La venta tiene pagos confirmados; primero gestiona el reembolso." : message;
    return apiError(code, humanMessage, code === "SALE_NOT_FOUND" ? 404 : 409);
  }
}
