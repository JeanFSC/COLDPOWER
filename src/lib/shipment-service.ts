import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs } from "@/db/schema";
import { orders, shipmentEvents, shipments } from "@/db/sales-schema";
import { getTrackingProvider, type ShipmentStatus, type TrackingEvent } from "@/lib/tracking";

type Actor = { userId: string | null; role?: string | null };

export class ShipmentDomainError extends Error {
  constructor(public code: string, message: string, public status = 409) { super(message); this.name = "ShipmentDomainError"; }
}

function newId(prefix: string) { return `${prefix}-${crypto.randomUUID()}`; }

function destinationOf(order: { deliveryAddress: string | null; deliveryDetails: { district?: string; province?: string; department?: string; agencyName?: string } | null }) {
  const details = order.deliveryDetails;
  return [details?.agencyName, details?.district, details?.province, details?.department].filter(Boolean).join(", ") || order.deliveryAddress || null;
}

async function appendEvent(shipmentId: string, event: TrackingEvent) {
  const db = getDb();
  await db.transaction(async (tx) => {
    const inserted = await tx.insert(shipmentEvents).values({ id: newId("shipment-event"), shipmentId, providerEventId: event.providerEventId, status: event.status, description: event.description, location: event.location }).onConflictDoNothing().returning({ id: shipmentEvents.id });
    if (inserted.length) await tx.update(shipments).set({ status: event.status, updatedAt: new Date() }).where(eq(shipments.id, shipmentId));
  });
}

// Registers the courier shipment once the order leaves the warehouse (IN_TRANSIT for Lima
// delivery, SHIPPED for provincial agencies). Idempotent: one shipment per order.
export async function createShipmentForOrder(orderId: string) {
  const provider = getTrackingProvider();
  if (!provider) return null;
  const db = getDb();
  const [existing] = await db.select().from(shipments).where(eq(shipments.orderId, orderId)).limit(1);
  if (existing) return existing;
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.deliveryMethod === "PICKUP") return null;
  const method = order.deliveryMethod;
  const created = await provider.createShipment({ orderCode: order.code, method, destination: destinationOf(order) });
  const [shipment] = await db.insert(shipments).values({ id: newId("shipment"), orderId, provider: provider.name, carrier: created.carrier, trackingNumber: created.trackingNumber, trackingUrl: created.trackingUrl, status: created.initialEvent.status, estimatedDeliveryAt: created.estimatedDeliveryAt }).onConflictDoNothing().returning();
  if (!shipment) return (await db.select().from(shipments).where(eq(shipments.orderId, orderId)).limit(1))[0] ?? null;
  await appendEvent(shipment.id, created.initialEvent);
  return shipment;
}

export async function advanceShipment(orderId: string, actor: Actor) {
  const provider = getTrackingProvider();
  if (!provider || provider.name !== "mock") throw new ShipmentDomainError("TRACKING_MOCK_DISABLED", "El avance manual de seguimiento solo está disponible con el transportista de prueba.", 404);
  const db = getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new ShipmentDomainError("ORDER_NOT_FOUND", "Pedido no encontrado.", 404);
  if (order.deliveryMethod === "PICKUP") throw new ShipmentDomainError("SHIPMENT_NOT_APPLICABLE", "Los pedidos de recojo en tienda no tienen seguimiento de transportista.");
  if (!["IN_TRANSIT", "SHIPPED"].includes(order.status)) throw new ShipmentDomainError("SHIPMENT_NOT_DISPATCHED", "Marca primero el pedido como en camino o enviado.");
  const shipment = await createShipmentForOrder(orderId);
  if (!shipment) throw new ShipmentDomainError("SHIPMENT_NOT_CREATED", "No se pudo registrar el envío.", 503);
  const next = provider.nextEvent({ method: order.deliveryMethod, current: shipment.status as ShipmentStatus, trackingNumber: shipment.trackingNumber, destination: destinationOf(order) });
  if (!next) throw new ShipmentDomainError("SHIPMENT_AWAITING_DELIVERY", "El envío ya está en su último tramo; márcalo como entregado desde el pedido.");
  await appendEvent(shipment.id, next);
  await db.insert(auditLogs).values({ id: newId("audit"), actorId: actor.userId, actorRole: actor.role ?? null, action: "shipments.mock_advanced", entityType: "order", entityId: orderId, before: { status: shipment.status }, after: { status: next.status }, metadata: { trackingNumber: shipment.trackingNumber } });
  return next;
}

export async function markShipmentDelivered(orderId: string) {
  const provider = getTrackingProvider();
  if (!provider) return;
  const db = getDb();
  const [shipment] = await db.select().from(shipments).where(eq(shipments.orderId, orderId)).limit(1);
  if (!shipment || shipment.status === "DELIVERED") return;
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.deliveryMethod === "PICKUP") return;
  await appendEvent(shipment.id, provider.deliveredEvent({ method: order.deliveryMethod, trackingNumber: shipment.trackingNumber, destination: destinationOf(order) }));
}
