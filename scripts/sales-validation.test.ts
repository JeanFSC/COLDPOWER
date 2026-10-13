import assert from "node:assert/strict";
import test from "node:test";
import { isValidManualPaymentAmount, validateCheckoutInput, validateManualPaymentInput } from "../src/lib/sales-validation";

test("pago manual valida centavos sin redondear entradas ni rechazar decimales válidos", () => {
  for (const value of ["1.01", "14.49", "0.01", 14.49, "11.00"]) {
    assert.equal(isValidManualPaymentAmount(value), true, String(value));
    assert.equal(validateManualPaymentInput({ orderId: "qa-order", method: "CASH", amount: value, currency: "PEN", reason: "QA" }).amount, Number(value).toFixed(2));
  }
  for (const value of ["1.001", "1e1", "", "0", "-1", "Infinity", "NaN", true, null, {}, "0.001"]) {
    assert.equal(isValidManualPaymentAmount(value), false, String(value));
    assert.throws(() => validateManualPaymentInput({ orderId: "qa-order", method: "CASH", amount: value, currency: "PEN", reason: "QA" }), /dos decimales/);
  }
  assert.equal(isValidManualPaymentAmount("11.01", 11), false);
  assert.equal(isValidManualPaymentAmount("11.00", 11), true);
});

test("checkout valida cantidades y no acepta precios enviados por el navegador", () => {
  assert.deepEqual(validateCheckoutInput({
    items: [{ productId: "product-1", quantity: 2 }],
    deliveryMethod: "DELIVERY",
    locationId: "location-1",
    name: "Cliente real",
    phone: "+51987654321",
    email: "cliente@example.com",
    address: "Av. Principal 123",
    idempotencyKey: "checkout-unique-1",
  }), {
    items: [{ productId: "product-1", quantity: 2 }],
    deliveryMethod: "DELIVERY",
    locationId: "location-1",
    name: "Cliente real",
    phone: "+51987654321",
    email: "cliente@example.com",
    address: "Av. Principal 123",
    idempotencyKey: "checkout-unique-1",
  });
  assert.throws(() => validateCheckoutInput({ items: [{ productId: "product-1", quantity: 1, unitPrice: 1 }] }), /precio/i);
  assert.throws(() => validateCheckoutInput({ items: [], deliveryMethod: "DELIVERY" }), /producto/i);
  assert.throws(() => validateCheckoutInput({ items: [{ productId: "product-1", quantity: 0 }] }), /cantidad/i);
});

test("pago manual exige método permitido y monto positivo", () => {
  assert.deepEqual(validateManualPaymentInput({ orderId: "order-1", method: "TRANSFER", amount: "120.50", currency: "PEN", reference: "OP-123", reason: "Comprobante verificado" }), {
    orderId: "order-1", method: "TRANSFER", amount: "120.50", currency: "PEN", reference: "OP-123", reason: "Comprobante verificado",
  });
  assert.throws(() => validateManualPaymentInput({ orderId: "order-1", method: "YAPE", amount: "10", currency: "PEN" }), /mÃ©todo|método/i);
  assert.throws(() => validateManualPaymentInput({ orderId: "order-1", method: "CASH", amount: "0", currency: "PEN" }), /mayor que cero/i);
});
