import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs } from "@/db/schema";
import { orderIncidents, orderItems, orders } from "@/db/sales-schema";
import { isValidPickedQuantity } from "@/lib/sales-validation";

type Actor = { userId: string | null; role?: string | null };
type IncidentType = typeof orderIncidents.$inferInsert.type;

export class OrderFulfillmentError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) { super(message); this.name = "OrderFulfillmentError"; }
}

function id(prefix: string) { return `${prefix}-${crypto.randomUUID()}`; }
function audit(actor: Actor, action: string, orderId: string, before: unknown, after: unknown, metadata?: Record<string, unknown>) {
  return { id: id("audit"), actorId: actor.userId, actorRole: actor.role ?? null, action, entityType: "order", entityId: orderId, before: before as Record<string, unknown> | null, after: after as Record<string, unknown> | null, metadata: metadata ?? null };
}

export async function updatePickedQuantity(input: { orderId: string; orderItemId: string; pickedQuantity: number; expectedVersion?: number }, actor: Actor) {
  return getDb().transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, input.orderId)).for("update").limit(1);
    if (!order) throw new OrderFulfillmentError("ORDER_NOT_FOUND", "Pedido no encontrado.", 404);
    if (order.status !== "PREPARING") throw new OrderFulfillmentError("ORDER_NOT_PREPARING", "Inicia la preparación antes de registrar el picking.", 409);
    if (input.expectedVersion !== undefined && order.version !== input.expectedVersion) throw new OrderFulfillmentError("ORDER_VERSION_CONFLICT", "El pedido fue actualizado por otra persona. Recarga el detalle.", 409);
    const [item] = await tx.select().from(orderItems).where(and(eq(orderItems.id, input.orderItemId), eq(orderItems.orderId, input.orderId))).for("update").limit(1);
    if (!item) throw new OrderFulfillmentError("ORDER_ITEM_NOT_FOUND", "Producto del pedido no encontrado.", 404);
    if (!isValidPickedQuantity(input.pickedQuantity, item.quantity)) throw new OrderFulfillmentError("PICKED_QUANTITY_INVALID", `La cantidad preparada debe estar entre 0 y ${item.quantity}.`, 422);
    const now = new Date();
    const [updatedItem] = await tx.update(orderItems).set({ pickedQuantity: input.pickedQuantity, pickedAt: input.pickedQuantity === item.quantity ? now : null, pickedBy: input.pickedQuantity > 0 ? actor.userId : null }).where(eq(orderItems.id, item.id)).returning();
    const [updatedOrder] = await tx.update(orders).set({ version: order.version + 1, updatedAt: now }).where(eq(orders.id, order.id)).returning();
    const allItems = await tx.select({ quantity: orderItems.quantity, pickedQuantity: orderItems.pickedQuantity }).from(orderItems).where(eq(orderItems.orderId, order.id));
    const allComplete = allItems.length > 0 && allItems.every((row) => row.quantity === row.pickedQuantity);
    await tx.insert(auditLogs).values(audit(actor, "orders.picking_updated", order.id, { orderItemId: item.id, pickedQuantity: item.pickedQuantity, version: order.version }, { orderItemId: item.id, pickedQuantity: updatedItem.pickedQuantity, version: updatedOrder.version }, { allComplete }));
    return { order: updatedOrder, item: updatedItem, allComplete };
  });
}

export async function createOrderIncident(input: { orderId: string; orderItemId?: string | null; type: IncidentType; note: string; blocker?: boolean }, actor: Actor) {
  if (!input.note.trim()) throw new OrderFulfillmentError("ORDER_INCIDENT_NOTE_REQUIRED", "Describe la incidencia.", 422);
  return getDb().transaction(async (tx) => {
    const [order] = await tx.select({ id: orders.id, status: orders.status }).from(orders).where(eq(orders.id, input.orderId)).for("update").limit(1);
    if (!order) throw new OrderFulfillmentError("ORDER_NOT_FOUND", "Pedido no encontrado.", 404);
    if (["DELIVERED", "CANCELLED"].includes(order.status)) throw new OrderFulfillmentError("ORDER_INCIDENT_NOT_ALLOWED", "El pedido ya está cerrado.", 409);
    if (input.orderItemId) {
      const [item] = await tx.select({ id: orderItems.id }).from(orderItems).where(and(eq(orderItems.id, input.orderItemId), eq(orderItems.orderId, input.orderId))).limit(1);
      if (!item) throw new OrderFulfillmentError("ORDER_ITEM_NOT_FOUND", "El producto no pertenece al pedido.", 422);
    }
    const [incident] = await tx.insert(orderIncidents).values({ id: id("order-incident"), orderId: input.orderId, orderItemId: input.orderItemId ?? null, type: input.type, note: input.note.trim().slice(0, 1000), blocker: input.blocker ?? false, createdBy: actor.userId }).returning();
    await tx.insert(auditLogs).values(audit(actor, "orders.incident_created", input.orderId, null, incident));
    return incident;
  });
}

export async function resolveOrderIncident(input: { orderId: string; incidentId: string; note?: string }, actor: Actor) {
  return getDb().transaction(async (tx) => {
    const [incident] = await tx.select().from(orderIncidents).where(and(eq(orderIncidents.id, input.incidentId), eq(orderIncidents.orderId, input.orderId))).for("update").limit(1);
    if (!incident) throw new OrderFulfillmentError("ORDER_INCIDENT_NOT_FOUND", "Incidencia no encontrada.", 404);
    if (incident.status === "RESOLVED") return { incident, idempotent: true };
    const [updated] = await tx.update(orderIncidents).set({ status: "RESOLVED", resolvedBy: actor.userId, resolvedAt: new Date(), note: input.note?.trim() ? `${incident.note}\nResolución: ${input.note.trim().slice(0, 800)}` : incident.note }).where(eq(orderIncidents.id, incident.id)).returning();
    await tx.insert(auditLogs).values(audit(actor, "orders.incident_resolved", input.orderId, incident, updated));
    return { incident: updated, idempotent: false };
  });
}
