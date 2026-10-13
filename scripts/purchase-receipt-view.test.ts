import assert from "node:assert/strict";
import test from "node:test";
import { purchaseReceiptViews } from "../src/lib/purchase-receipt-view";
import { purchaseOrderHref, purchaseReceiptHref } from "../src/lib/purchases-navigation";

test("selecting a receipt retains purchase filters and pagination", () => {
  const query = new URL(purchaseReceiptHref("supplierId=qa-supplier&createdFrom=2026-01-01&currency=PEN&page=2&query=QA&purchaseId=old&receiptId=old", "order&2", "receipt&3"), "http://localhost").searchParams;
  assert.equal(query.get("purchaseId"), "order&2");
  assert.equal(query.get("receiptId"), "receipt&3");
  assert.equal(query.get("supplierId"), "qa-supplier");
  assert.equal(query.get("createdFrom"), "2026-01-01");
  assert.equal(query.get("currency"), "PEN");
  assert.equal(query.get("page"), "2");
  assert.equal(query.get("query"), "QA");
});

test("selecting an order clears a previous receipt while retaining filters", () => {
  const href = purchaseOrderHref("receiptId=old-receipt&purchaseId=old-order&status=RECEIVED&page=2&search=QA%26AUD&requestId=request-1", "order&2");
  const query = new URL(href, "http://localhost").searchParams;
  assert.equal(query.has("receiptId"), false);
  assert.equal(query.get("purchaseId"), "order&2");
  assert.equal(query.get("status"), "RECEIVED");
  assert.equal(query.get("page"), "2");
  assert.equal(query.get("search"), "QA&AUD");
  assert.equal(query.get("requestId"), "request-1");
});

test("receipt views retain individual quantities and group multiple lines once", () => {
  const receipt = { id: "r1", code: "REC1", purchaseId: "oc1", receivedAt: "2026-10-07T12:00:00Z", status: "POSTED" };
  const item = { id: "i1", purchaseItemId: "p1", quantity: 1 };
  const result = purchaseReceiptViews([
    { receipt, item }, { receipt, item },
    { receipt, item: { id: "i2", purchaseItemId: "p2", quantity: 2 } },
    { receipt: { ...receipt, id: "r2", code: "REC2" }, item: { ...item, id: "i3", quantity: 4 } },
  ], [{ id: "p1", skuSnapshot: "0001", productNameSnapshot: "Producto QA" }]);
  assert.equal(result.length, 2);
  assert.deepEqual(result[0].items.map(line => line.quantity), [1, 2]);
  assert.equal(result[0].items[0].sku, "0001");
  assert.equal(result[0].items[1].name, null);
  assert.equal(result[1].items[0].quantity, 4);
});

test("empty receipt stays visible without inventing product lines", () => {
  const result = purchaseReceiptViews([{ receipt: { id: "r", code: "REC", purchaseId: "oc", receivedAt: "2026-10-07", status: "POSTED" }, item: null }], []);
  assert.deepEqual(result[0].items, []);
});
