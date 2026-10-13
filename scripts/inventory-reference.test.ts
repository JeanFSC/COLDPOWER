import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { inventoryReferenceHref } from "../src/lib/inventory-reference";

test("purchase receipts and purchase orders navigate through distinct identifiers", () => {
  assert.equal(inventoryReferenceHref("purchase_receipt", "receipt&1"), "/admin/compras?receiptId=receipt%261");
  assert.equal(inventoryReferenceHref("purchase", "purchase-1"), "/admin/compras?purchaseId=purchase-1");
  assert.equal(inventoryReferenceHref(null, null), null);
  assert.equal(inventoryReferenceHref("manual", "ref-1"), null);
  assert.equal(inventoryReferenceHref("stock_import", "batch&1"), "/admin/inventario?tab=imports&importBatchId=batch%261");
});

test("existing inventory reference destinations remain explicit", () => {
  assert.equal(inventoryReferenceHref("order", "1"), "/admin/pedidos?orderId=1");
  assert.equal(inventoryReferenceHref("sale", "1"), "/admin/ventas?saleId=1");
  assert.equal(inventoryReferenceHref("transfer_cancel", "1"), "/admin/inventario?tab=transfers&transferId=1");
  assert.equal(inventoryReferenceHref("reservation_expiry", "1"), "/admin/inventario?tab=reservations&reservationId=1");
});

test("receipt navigation resolves its persisted parent order behind purchases permission", () => {
  const page = readFileSync("src/app/admin/compras/page.tsx", "utf8");
  const repository = readFileSync("src/lib/purchases-repository.ts", "utf8");
  assert.match(page, /requirePermission\("purchases.view"\)/);
  assert.match(page, /query.get\("receiptId"\) \? getPurchaseDetailForReceipt/);
  assert.match(repository, /where\(eq\(purchaseReceipts.id, receiptId\)\)/);
  assert.match(repository, /return receipt \? getPurchaseDetail\(receipt.purchaseId\) : null/);
});

test("stock import destination queries the exact batch and exposes a return link", () => {
  const page = readFileSync("src/app/admin/inventario/page.tsx", "utf8");
  const service = readFileSync("src/lib/inventory-admin-service.ts", "utf8");
  const workspace = readFileSync("src/components/admin/InventoryAdminWorkspace.tsx", "utf8");
  assert.match(page, /requirePermission\("inventory.view"\)/);
  assert.match(page, /getInventoryAdminPage\(filters, incomingParams.get\("importBatchId"\)/);
  assert.match(service, /where\(importBatchId \? eq\(inventoryImportBatches.id, importBatchId\) : undefined\)/);
  assert.match(workspace, /href="\/admin\/inventario\?tab=imports#inventory-operations"/);
  assert.match(workspace, /InventoryOperationsTabs key=\{actionParams.get\("tab"\) \|\| "movements"\}/);
});
