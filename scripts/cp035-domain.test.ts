import assert from "node:assert/strict";
import test from "node:test";
import { validateOpportunityInput } from "@/lib/crm-validation";

test("CP-035 valida líneas con cantidad, precio y moneda sin mezclar divisas", () => {
  const result = validateOpportunityInput({ customerId: "customer-1", title: "Compresor", currency: "PEN", totalAmount: "120.50", items: [{ productId: "product-1", quantity: 2, unitPrice: "60.25", currency: "PEN" }] });
  assert.equal(result.currency, "PEN");
  assert.equal(result.items[0]?.quantity, 2);
  assert.equal(result.items[0]?.unitPrice, "60.25");
  assert.throws(() => validateOpportunityInput({ customerId: "customer-1", items: [{ productId: "product-1", quantity: 1, unitPrice: "10", currency: "PEN" }, { productId: "product-2", quantity: 1, unitPrice: "10", currency: "USD" }] }), /mezclar monedas/);
});

test("CP-035 exige moneda para montos y rechaza líneas duplicadas", () => {
  assert.throws(() => validateOpportunityInput({ customerId: "customer-1", totalAmount: "10" }), /moneda/);
  assert.throws(() => validateOpportunityInput({ customerId: "customer-1", items: [{ productId: "product-1", quantity: 1 }, { productId: "product-1", quantity: 2 }] }), /repitas/);
});
