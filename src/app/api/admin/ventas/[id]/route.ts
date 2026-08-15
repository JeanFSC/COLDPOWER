import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs } from "@/db/schema";
import { orderItems, orderStatusHistory, orders, payments, sales } from "@/db/sales-schema";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { releaseInventoryReservationInTransaction } from "@/lib/inventory";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { getSaleDetail } from "@/lib/sales-repository";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireApiPermission("sales.view"); const { id } = await params; const detail = await getSaleDetail(id); return detail ? apiSuccess(detail) : apiError("SALE_NOT_FOUND", "Venta no encontrada.", 404); }
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
    const result = await getDb().transaction(async (tx) => {
      const [sale] = await tx.select().from(sales).where(eq(sales.id, id)).for("update").limit(1);
      if (!sale) throw new Error("Venta no encontrada.");
      if (sale.status === "CANCELLED") return { sale, order: null, idempotent: true };
      const now = new Date();
      const [order] = await tx.select().from(orders).where(eq(orders.saleId, sale.id)).for("update").limit(1);
      if (order && order.status !== "CANCELLED" && order.status !== "DELIVERED") {
        const lines = await tx.select({ reservationId: orderItems.reservationId }).from(orderItems).where(eq(orderItems.orderId, order.id));
        for (const line of lines) if (line.reservationId) await releaseInventoryReservationInTransaction(tx, line.reservationId, actor.userId ?? undefined, actor.role ?? undefined);
        await tx.update(orders).set({ status: "CANCELLED", cancellationReason: reason, cancelledBy: actor.userId, cancelledAt: now, updatedAt: now }).where(eq(orders.id, order.id));
        await tx.insert(orderStatusHistory).values({ id: `order-status-${crypto.randomUUID()}`, orderId: order.id, fromStatus: order.status, toStatus: "CANCELLED", changedBy: actor.userId, note: reason });
      }
      await tx.update(payments).set({ status: "CANCELLED", cancellationReason: reason, cancelledBy: actor.userId, cancelledAt: now, updatedAt: now }).where(and(eq(payments.orderId, order?.id ?? ""), eq(payments.status, "PENDING")));
      const [updated] = await tx.update(sales).set({ status: "CANCELLED", cancellationReason: reason, cancelledBy: actor.userId, cancelledAt: now, updatedAt: now }).where(eq(sales.id, sale.id)).returning();
      await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "sales.cancelled", entityType: "sale", entityId: sale.id, before: { status: sale.status }, after: { status: updated.status }, metadata: { reason, orderId: order?.id ?? null } });
      return { sale: updated, order: order ? { ...order, status: "CANCELLED" as const } : null, idempotent: false };
    });
    return apiSuccess({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cancelar la venta.";
    return apiError(message.includes("no encontrada") ? "SALE_NOT_FOUND" : "SALE_NOT_CANCELLED", message, message.includes("no encontrada") ? 404 : 409);
  }
}
