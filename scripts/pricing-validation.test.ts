import assert from "node:assert/strict";
import test from "node:test";
import { normalizePriceInput, normalizePriceDetails, validateDiscountInput } from "../src/lib/pricing-validation";

test("los precios requieren importe monetario válido y no inventan moneda", () => {
  assert.deepEqual(normalizePriceInput({ amount: "32.50", currency: "PEN", priceType: "RETAIL" }), { amount: "32.50", currency: "PEN", priceType: "RETAIL" });
  assert.deepEqual(normalizePriceInput({ amount: "32.50", currency: "USD", priceType: "RETAIL" }), { amount: "32.50", currency: "USD", priceType: "RETAIL" });
  assert.throws(() => normalizePriceInput({ amount: "0", currency: "PEN", priceType: "RETAIL" }), /mayor que cero/);
  assert.throws(() => normalizePriceInput({ amount: "32.555", currency: "PEN", priceType: "RETAIL" }), /decimales/);
  assert.throws(() => normalizePriceInput({ amount: "32.50", currency: "S\/", priceType: "RETAIL" }), /moneda/);
});

test("las reglas de descuento son configurables y sus porcentajes quedan acotados", () => {
  assert.deepEqual(validateDiscountInput({ name: "Ventas", maxPercentage: "5", approvalAbovePercentage: "5" }), { name: "Ventas", maxPercentage: "5.00", approvalAbovePercentage: "5.00" });
  assert.throws(() => validateDiscountInput({ name: "", maxPercentage: "5", approvalAbovePercentage: "5" }), /nombre/);
  assert.throws(() => validateDiscountInput({ name: "Ventas", maxPercentage: "110", approvalAbovePercentage: "5" }), /porcentaje/);
  assert.throws(() => validateDiscountInput({ name: "Ventas", maxPercentage: "5", approvalAbovePercentage: "4" }), /aprobación/);
});

test("CP-030 persiste precio especial, mínimos, cantidad mayorista y estado", () => {
  assert.deepEqual(normalizePriceDetails({ amount: "32.50", currency: "PEN", priceType: "SPECIAL", wholesaleMinQty: "5", minimumAllowed: "30.00", status: "ACTIVE" }), {
    amount: "32.50", currency: "PEN", priceType: "SPECIAL", wholesaleMinQty: 5, minimumAllowed: "30.00", status: "ACTIVE",
  });
  assert.throws(() => normalizePriceDetails({ amount: "32.50", currency: "PEN", priceType: "WHOLESALE", wholesaleMinQty: "0" }), /cantidad/);
  assert.throws(() => normalizePriceDetails({ amount: "32.50", currency: "PEN", priceType: "RETAIL", minimumAllowed: "40.00" }), /mínimo/);
});
