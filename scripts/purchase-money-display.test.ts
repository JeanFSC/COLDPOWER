import assert from "node:assert/strict";
import test from "node:test";
import { formatPurchaseMoney } from "../src/lib/purchase-money-display";

test("importes de compras conservan centavos y moneda", () => {
  assert.match(formatPurchaseMoney("8.20", "PEN"), /8\.20$/);
  assert.match(formatPurchaseMoney("0.29", "PEN"), /0\.29$/);
  assert.match(formatPurchaseMoney("10.00", "USD"), /10\.00$/);
  assert.notEqual(formatPurchaseMoney("10.00", "PEN"), formatPurchaseMoney("10.00", "USD"));
});
