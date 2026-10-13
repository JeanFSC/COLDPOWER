import assert from "node:assert/strict";
import test from "node:test";
import { validatePurchaseInput, validatePurchaseRequestConversionItems } from "../src/lib/purchases-validation";

const converted = (value: unknown) => validatePurchaseRequestConversionItems([{ productId: "qa-unit", quantityRequested: 1 }], { "qa-unit": value })[0].unitCost;
test("costos de dos decimales se aceptan exactamente sin errores binarios", () => {
  for (const amount of ["4.10", "0.29", "10.20", "0.01", "999999999999.99"]) {
    assert.equal(converted(amount), amount);
    assert.equal(validatePurchaseInput({ supplierId: "qa", locationId: "qa", currency: "PEN", items: [{ productId: "qa-unit", quantity: 1, unitCost: amount }] }).items[0].unitCost, amount);
  }
  assert.equal(converted(4.1), "4.10");
  assert.equal(converted(" 004.1 "), "4.10");
});
test("costos inválidos no se redondean ni se convierten desde booleanos", () => {
  for (const value of ["4.101", "0", -1, true, false, null, {}, [], "1e2", "0x10", "1000000000000.00", Infinity, NaN]) assert.throws(() => converted(value), /costo/);
});
