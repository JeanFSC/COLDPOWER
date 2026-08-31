import assert from "node:assert/strict";
import test from "node:test";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { inventoryBalances, inventoryMovements, inventoryReservations, locations, products, users } from "@/db/schema";
import { crmActivities, crmTasks, customers, opportunities, opportunityItems, opportunityStageHistory, opportunityFollowups } from "@/db/crm-schema";
import { purchaseItems, purchaseReceiptItems, purchaseReceipts, purchases, suppliers } from "@/db/purchases-schema";
import { adjustInventory, releaseInventoryReservation, reserveInventory } from "@/lib/inventory";
import { createActivity, createCustomer, createOpportunity, createTask } from "@/lib/crm-service";
import { createPurchase, createSupplier, receivePurchase } from "@/lib/purchases-service";

test("CP-050 persiste y reintenta operaciones de inventario, CRM y compras", async () => {
  const db = getDb();
  const [product] = await db.select({ id: products.id, sku: products.sku }).from(products).limit(1);
  const [actor] = await db.select({ id: users.id }).from(users).where(eq(users.status, "ACTIVE")).limit(1);
  assert.ok(product);
  assert.ok(actor);

  const suffix = crypto.randomUUID();
  const locationId = `cp050-location-${suffix}`;
  const actorContext = { userId: actor.id, role: "SUPERADMIN" };
  let customerId: string | undefined;
  let reservationId: string | undefined;
  let opportunityId: string | undefined;
  let purchaseId: string | undefined;
  let receiptId: string | undefined;
  let supplierId: string | undefined;

  try {
    await db.insert(locations).values({ id: locationId, code: `CP50-${suffix.slice(0, 8)}`, name: "CP-050 QA", type: "WAREHOUSE", address: null });
    const opening = await adjustInventory({ productId: product.id, locationId, quantity: 3, type: "OPENING_BALANCE", reason: "CP-050 prueba transaccional", performedBy: actor.id, performedByRole: actorContext.role });
    assert.equal(opening.onHand, 3);

    const reservation = await reserveInventory({ productId: product.id, locationId, quantity: 1, reason: "CP-050 reserva", performedBy: actor.id, performedByRole: actorContext.role, idempotencyKey: `cp050-reservation-${suffix}` });
    reservationId = reservation.reservationId;
    const reservationRetry = await reserveInventory({ productId: product.id, locationId, quantity: 1, reason: "CP-050 reserva", performedBy: actor.id, performedByRole: actorContext.role, idempotencyKey: `cp050-reservation-${suffix}` });
    assert.equal(reservationRetry.reservationId, reservationId);
    await releaseInventoryReservation(reservationId, actor.id, actorContext.role);

    const customer = await createCustomer({ name: "CP-050 QA customer", email: `cp050-${suffix}@example.invalid`, phone: `+51999${suffix.replaceAll("-", "").slice(0, 7)}` }, actorContext);
    customerId = customer.id;
    assert.ok(customerId);
    const opportunity = await createOpportunity({ customerId, title: "CP-050 QA opportunity", origin: "WEB", stage: "NEW", createdBy: actor.id }, actorContext);
    opportunityId = opportunity.id;
    await createActivity({ opportunityId, type: "CALL", subject: "CP-050 QA activity", idempotencyKey: `cp050-activity-${suffix}` }, actorContext);
    const activityRetry = await createActivity({ opportunityId, type: "CALL", subject: "CP-050 QA activity", idempotencyKey: `cp050-activity-${suffix}` }, actorContext);
    assert.equal(activityRetry.idempotent, true);
    const task = await createTask({ opportunityId, title: "CP-050 QA task", idempotencyKey: `cp050-task-${suffix}` }, actorContext);
    assert.equal(task.idempotent, false);

    const supplier = await createSupplier({ name: "CP-050 QA supplier", identification: `CP50-${suffix.slice(0, 8)}`, country: "PE", contactName: null, whatsapp: null, email: null, address: null, currency: "PEN", notes: null, status: "ACTIVE" }, actorContext);
    supplierId = supplier.id;
    const purchase = await createPurchase({ supplierId, locationId, currency: "PEN", notes: "CP-050 QA", items: [{ productId: product.id, quantity: 2, unitCost: "10.00" }], idempotencyKey: `cp050-purchase-${suffix}` }, actorContext);
    purchaseId = purchase.purchase.id;
    const purchaseRetry = await createPurchase({ supplierId, locationId, currency: "PEN", notes: "CP-050 QA", items: [{ productId: product.id, quantity: 2, unitCost: "10.00" }], idempotencyKey: `cp050-purchase-${suffix}` }, actorContext);
    assert.equal(purchaseRetry.idempotent, true);
    const receipt = await receivePurchase({ purchaseId, items: [{ productId: product.id, quantity: 2 }], idempotencyKey: `cp050-receipt-${suffix}` }, actorContext);
    receiptId = receipt.receipt.id;
    const receiptRetry = await receivePurchase({ purchaseId, items: [{ productId: product.id, quantity: 2 }], idempotencyKey: `cp050-receipt-${suffix}` }, actorContext);
    assert.equal(receiptRetry.idempotent, true);
    const [balance] = await db.select({ onHand: inventoryBalances.onHand, reserved: inventoryBalances.reserved }).from(inventoryBalances).where(and(eq(inventoryBalances.productId, product.id), eq(inventoryBalances.locationId, locationId))).limit(1);
    assert.deepEqual(balance, { onHand: 5, reserved: 0 });
  } finally {
    if (receiptId) {
      await db.delete(purchaseReceiptItems).where(eq(purchaseReceiptItems.receiptId, receiptId));
      await db.delete(purchaseReceipts).where(eq(purchaseReceipts.id, receiptId));
    }
    if (purchaseId) {
      await db.delete(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId));
      await db.delete(purchases).where(eq(purchases.id, purchaseId));
    }
    if (supplierId) await db.delete(suppliers).where(eq(suppliers.id, supplierId));
    await db.delete(inventoryReservations).where(eq(inventoryReservations.locationId, locationId));
    await db.delete(inventoryMovements).where(eq(inventoryMovements.locationId, locationId));
    await db.delete(inventoryBalances).where(eq(inventoryBalances.locationId, locationId));
    await db.delete(locations).where(eq(locations.id, locationId));
    if (opportunityId) {
      await db.delete(opportunityItems).where(eq(opportunityItems.opportunityId, opportunityId));
      await db.delete(opportunityStageHistory).where(eq(opportunityStageHistory.opportunityId, opportunityId));
      await db.delete(opportunityFollowups).where(eq(opportunityFollowups.opportunityId, opportunityId));
      await db.delete(crmActivities).where(eq(crmActivities.opportunityId, opportunityId));
      await db.delete(crmTasks).where(eq(crmTasks.opportunityId, opportunityId));
      await db.delete(opportunities).where(eq(opportunities.id, opportunityId));
    }
    if (customerId) await db.delete(customers).where(eq(customers.id, customerId));
  }

  const [remainingLocation] = await db.select({ id: locations.id }).from(locations).where(eq(locations.id, locationId)).limit(1);
  assert.equal(remainingLocation, undefined);
  if (customerId) {
    const [remainingCustomer] = await db.select({ id: customers.id }).from(customers).where(eq(customers.id, customerId)).limit(1);
    assert.equal(remainingCustomer, undefined);
  }
});
