import assert from "node:assert/strict";
import test from "node:test";
import { validateCheckoutInput, validateManualPaymentInput } from "../src/lib/sales-validation";

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
