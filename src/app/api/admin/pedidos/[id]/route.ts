import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { getOrderDetail } from "@/lib/orders-repository";
import { changeOrderStatus } from "@/lib/sales-service";
import { orderStatuses, type OrderStatus } from "@/lib/sales-validation";
import { apiError, apiSuccess } from "@/lib/api-errors";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) { try { await requireApiPermission("orders.view"); const { id } = await params; const detail = await getOrderDetail(id); return detail ? apiSuccess(detail) : apiError("ORDER_NOT_FOUND", "Pedido no encontrado.", 404); } catch(error) { if(error instanceof ApiAuthorizationError)return apiError("ORDERS_FORBIDDEN","No tienes permiso para ver pedidos.",403); return apiError("ORDER_DETAIL_UNAVAILABLE","No se pudo cargar el pedido.",503); } }

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let actor: Awaited<ReturnType<typeof requireApiPermission>>;
  try { actor = await requireApiPermission("orders.manage"); } catch (error) { if (error instanceof ApiAuthorizationError) return apiError("ORDERS_FORBIDDEN", "No tienes permiso para gestionar pedidos.", 403); return apiError("ORDERS_AUTH_UNAVAILABLE", "No se pudo validar el acceso a pedidos.", 503); }
  const { id } = await params;
  let body: unknown; try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
  const status = (body as { status?: unknown })?.status;
  if (typeof status !== "string" || !(orderStatuses as readonly string[]).includes(status)) return apiError("INVALID_ORDER_STATUS", "Estado de pedido inválido.", 400);
  const reason = typeof (body as { reason?: unknown })?.reason === "string" ? ((body as { reason: string }).reason).trim().slice(0, 500) : "";
  if (status === "CANCELLED" && !reason) return apiError("CANCELLATION_REASON_REQUIRED", "La cancelación requiere un motivo.", 400);
  try { return apiSuccess({ order: await changeOrderStatus(id, status as OrderStatus, actor, reason || undefined) }); } catch (error) { return apiError(error instanceof Error && error.message === "CANCELLATION_REASON_REQUIRED" ? error.message : "ORDER_STATUS_NOT_CHANGED", error instanceof Error ? error.message : "No se pudo actualizar el pedido.", 400); }
}
