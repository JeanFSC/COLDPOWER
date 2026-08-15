import assert from "node:assert/strict";
import test from "node:test";
import { validatePurchaseInput, validateReceiptInput, validateSupplierInput } from "../src/lib/purchases-validation";

test("proveedor exige datos mínimos y no acepta estado arbitrario", () => {
  assert.deepEqual(validateSupplierInput({ name: "Proveedor real", country: "PE", currency: "PEN" }), { name: "Proveedor real", country: "PE", currency: "PEN", identification: null, contactName: null, whatsapp: null, email: null, address: null, notes: null, status: "ACTIVE" });
  assert.throws(() => validateSupplierInput({ name: "", country: "PE", currency: "PEN" }), /nombre/i);
  assert.throws(() => validateSupplierInput({ name: "Proveedor", country: "PE", currency: "PEN", status: "DELETED" }), /estado/i);
});

test("orden de compra valida líneas y recepción valida cantidades", () => {
  const purchase = validatePurchaseInput({ supplierId: "supplier-1", locationId: "location-1", currency: "PEN", items: [{ productId: "product-1", quantity: 3, unitCost: "12.50" }] });
  assert.equal(purchase.items[0].unitCost, "12.50");
  assert.throws(() => validatePurchaseInput({ supplierId: "supplier-1", locationId: "location-1", currency: "PEN", items: [{ productId: "product-1", quantity: 0, unitCost: "12.50" }] }), /cantidad/i);
  assert.deepEqual(validateReceiptInput({ purchaseId: "purchase-1", items: [{ productId: "product-1", quantity: 2 }] }), { purchaseId: "purchase-1", items: [{ productId: "product-1", quantity: 2 }], idempotencyKey: null });
  assert.throws(() => validateReceiptInput({ purchaseId: "purchase-1", items: [{ productId: "product-1", quantity: -1 }] }), /cantidad/i);
});
