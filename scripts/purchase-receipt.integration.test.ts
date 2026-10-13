import assert from "node:assert/strict";
import test from "node:test";
import { and, eq, inArray } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { auditLogs, inventoryBalances, inventoryMovements, products, users } from "../src/db/schema";
import { purchaseItems, purchaseReceipts, purchases } from "../src/db/purchases-schema";
import { reportSchedules } from "../src/db/reporting-schema";
import { cancelPurchase, createPurchase, createSupplier, receivePurchase, updateSupplier } from "../src/lib/purchases-service";
import { validatePurchaseInput, validateSupplierInput } from "../src/lib/purchases-validation";
import { adjustInventoryInTransaction } from "../src/lib/inventory-transaction";

test("QA: recepción concurrente no duplica stock ni supera el pendiente", { skip: process.env.QA_PURCHASE_RECEIPT !== "1", timeout: 60_000 }, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const db = getDb();
  const tag = `qa-receipt-${crypto.randomUUID()}`;
  const productId = "product-ea613220-8707-42c0-abdb-80b6c2d639d3", locationId = "cp-dashboard-v5-location-branch-2";
  let supplierId: string | undefined, purchaseId: string | undefined;
  let actor: { userId: string; role: string } | undefined;
  let beforeStock: { onHand: number; reserved: number } | undefined;
  const readStock = async () => (await db.select().from(inventoryBalances).where(and(eq(inventoryBalances.productId, productId), eq(inventoryBalances.locationId, locationId))))[0];
  try {
    assert.equal((await db.select().from(products).where(eq(products.id, productId)))[0].sku, "QA-AUD-20261006");
    const baseline = await readStock();
    assert.ok(baseline);
    assert.ok(baseline.onHand - baseline.reserved + 1 > Math.max(0, baseline.minimumStock ?? 0), "La recepción QA no debe activar avisos de stock a terceros.");
    beforeStock = { onHand: baseline.onHand, reserved: baseline.reserved };
    const [reference] = await db.select().from(reportSchedules).where(eq(reportSchedules.id, "report-schedule-e0115752-abcf-47af-a8e9-81716c52ce49"));
    assert.match(reference?.name ?? "", /^QA AUDITORÍA/);
    const [owner] = await db.select().from(users).where(eq(users.id, reference.createdBy));
    assert.equal(owner.status, "ACTIVE");
    actor = { userId: owner.id, role: owner.roleCode ?? owner.role };
    const supplier = await createSupplier(validateSupplierInput({ name: `QA AUDITORÍA — ${tag}`, country: "PE", currency: "PEN", email: `${tag}@example.test`, notes: "QA AUDITORÍA — recepción simulada" }), actor);
    supplierId = supplier.id;
    purchaseId = (await createPurchase(validatePurchaseInput({ supplierId, locationId, currency: "PEN", notes: tag, items: [{ productId, quantity: 3, unitCost: "5.00" }], idempotencyKey: `${tag}-oc` }), actor)).purchase.id;
    const input = { purchaseId, items: [{ productId, quantity: 1 }], idempotencyKey: `${tag}-first` };
    const first = await Promise.allSettled([receivePurchase(input, actor), receivePurchase(input, actor)]);
    console.log(JSON.stringify({ tag, purchaseId, concurrentReceipt: first.map(result => result.status) }));
    assert.equal(first.filter(result => result.status === "fulfilled").length, 2);
    assert.equal(first.filter(result => result.status === "fulfilled" && result.value.idempotent).length, 1);
    assert.equal((await db.select().from(purchaseReceipts).where(eq(purchaseReceipts.purchaseId, purchaseId))).length, 1);
    assert.equal((await readStock()).onHand, beforeStock.onHand + 1);
    assert.equal((await readStock()).reserved, beforeStock.reserved);
    assert.equal((await db.select().from(purchases).where(eq(purchases.id, purchaseId)))[0].status, "PARTIAL_RECEIVED");
    assert.equal((await receivePurchase(input, actor)).idempotent, true);
    await assert.rejects(receivePurchase({ ...input, purchaseId: `${tag}-another-order` }, actor), /otra orden de compra/);
    const final = await Promise.allSettled([1, 2].map(attempt => receivePurchase({ purchaseId: purchaseId!, items: [{ productId, quantity: 2 }], idempotencyKey: `${tag}-final-${attempt}` }, actor!)));
    assert.equal(final.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(final.filter(result => result.status === "rejected").length, 1);
    assert.equal((await db.select().from(purchases).where(eq(purchases.id, purchaseId)))[0].status, "RECEIVED");
    assert.equal((await db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId)))[0].quantityReceived, 3);
    assert.equal((await readStock()).onHand, beforeStock.onHand + 3);
    assert.equal((await readStock()).reserved, beforeStock.reserved);
    const receipts = await db.select().from(purchaseReceipts).where(eq(purchaseReceipts.purchaseId, purchaseId));
    assert.equal(receipts.length, 2);
    const receiptIds = receipts.map(row => row.id);
    const movements = await db.select().from(inventoryMovements).where(and(eq(inventoryMovements.referenceType, "purchase_receipt"), inArray(inventoryMovements.referenceId, receiptIds)));
    assert.equal(movements.length, 2);
    assert.equal(movements.reduce((total, row) => total + row.quantity, 0), 3);
    assert.equal((await db.select().from(auditLogs).where(and(eq(auditLogs.action, "purchases.receipt_posted"), inArray(auditLogs.entityId, receiptIds)))).length, 2);
    console.log(JSON.stringify({ tag, purchaseId, receipts: receiptIds, receivedUnits: 3, duplicateStock: 0 }));
  } finally {
    try {
      if (actor && purchaseId) {
        const lines = await db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId));
        const received = lines.reduce((total, line) => total + line.quantityReceived, 0);
        if (received > 0) await db.transaction(tx => adjustInventoryInTransaction(tx, { productId, locationId, quantity: received, type: "ADJUSTMENT_OUT", reason: "QA AUDITORÍA — cierre fixture", notes: "Retirar únicamente unidades sintéticas recibidas por esta OC QA; conservar reserva y stock previo", performedBy: actor!.userId, performedByRole: actor!.role, referenceType: "qa_audit_cleanup", referenceId: purchaseId, idempotencyKey: `${tag}-cleanup` }));
        const [row] = await db.select().from(purchases).where(eq(purchases.id, purchaseId));
        if (["PENDING", "PARTIAL_RECEIVED"].includes(row.status)) await cancelPurchase(purchaseId, "QA AUDITORÍA — cerrar fixture", actor);
        if (beforeStock) {
          const restored = await readStock();
          assert.deepEqual({ onHand: restored.onHand, reserved: restored.reserved }, beforeStock);
          console.log(JSON.stringify({ tag, cleanupUnits: received, stockRestored: true }));
        }
      }
      if (actor && supplierId) assert.equal((await updateSupplier(supplierId, { status: "INACTIVE" }, actor, "QA AUDITORÍA — cierre fixture")).status, "INACTIVE");
    } finally { await closeDb(); }
  }
});
