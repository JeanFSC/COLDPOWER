import assert from "node:assert/strict";
import test from "node:test";
import { eq, like, inArray } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { suppliers, purchases, purchaseItems, purchaseReceipts } from "../src/db/purchases-schema";
import { getSupplierDetail } from "../src/lib/purchases-repository";

test("QA: indicadores del proveedor coinciden con todo su historial", { skip: process.env.QA_SUPPLIER_PERFORMANCE !== "1" }, async () => {
  const db = getDb();
  try {
    const [supplier] = await db.select().from(suppliers).where(like(suppliers.name, "QA AUDITORÍA%"));
    assert.ok(supplier);
    const detail = await getSupplierDetail(supplier.id);
    assert.ok(detail);
    const orders = await db.select().from(purchases).where(eq(purchases.supplierId, supplier.id));
    const ids = orders.map(row => row.id);
    const items = ids.length ? await db.select().from(purchaseItems).where(inArray(purchaseItems.purchaseId, ids)) : [];
    const receipts = ids.length ? await db.select().from(purchaseReceipts).where(inArray(purchaseReceipts.purchaseId, ids)) : [];
    const completed = orders.filter(row => row.status === "RECEIVED");
    const open = orders.filter(row => ["DRAFT", "PENDING", "PARTIAL_RECEIVED"].includes(row.status));
    const latest = new Map<string, Date>();
    for (const receipt of receipts) if (receipt.status === "POSTED" && (!latest.has(receipt.purchaseId) || receipt.receivedAt > latest.get(receipt.purchaseId)!)) latest.set(receipt.purchaseId, receipt.receivedAt);
    const evaluated = completed.filter(row => row.expectedDeliveryAt && latest.has(row.id));
    const onTime = completed.filter(row => row.expectedDeliveryAt && latest.get(row.id) && latest.get(row.id)! <= row.expectedDeliveryAt);
    const ordered = items.reduce((sum, row) => sum + row.quantityOrdered, 0);
    const received = items.reduce((sum, row) => sum + row.quantityReceived, 0);
    assert.equal(detail.performance.openOrders, open.length);
    assert.equal(detail.performance.completedOrders, completed.length);
    assert.equal(detail.performance.totalOrders, orders.length);
    assert.equal(detail.pagination.orders.total, open.length);
    assert.equal(detail.pagination.products.total, new Set(items.map(row => row.skuSnapshot)).size);
    assert.equal(new Set(detail.products.map(row => row.sku)).size, detail.products.length);
    assert.ok(detail.purchases.every(row => ["DRAFT", "PENDING", "PARTIAL_RECEIVED"].includes(row.purchase.status)));
    assert.equal(detail.performance.evaluatedOrders, evaluated.length);
    assert.equal(detail.performance.onTimeRate, evaluated.length ? Number((onTime.length / evaluated.length * 100).toFixed(1)) : null);
    assert.equal(detail.performance.fillRate, ordered ? Number((received / ordered * 100).toFixed(1)) : null);
    assert.equal(detail.pagination.receipts.total, receipts.length);
    assert.ok(detail.receipts.length <= 5);
    const last = await getSupplierDetail(supplier.id, { receiptsPage: 999999 });
    assert.ok(last);
    assert.equal(last.pagination.receipts.page, last.pagination.receipts.pages);
    assert.deepEqual(last.performance, detail.performance);
    if (receipts.length > 5) {
      assert.ok(last.receipts.length > 0);
      const firstIds = new Set(detail.receipts.map(row => row.receipt.id));
      assert.ok(last.receipts.every(row => !firstIds.has(row.receipt.id)));
    }
    console.log(JSON.stringify({ orders: orders.length, receipts: receipts.length, open: open.length, completed: completed.length }));
  } finally { await closeDb(); }
});
