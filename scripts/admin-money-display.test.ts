import assert from "node:assert/strict";
import test from "node:test";
import { formatAdminMoney } from "../src/lib/admin-money-display";

test("importes administrativos conservan centavos en soles y dólares", () => {
  assert.match(formatAdminMoney(8.2, "PEN"), /8\.20$/);
  assert.match(formatAdminMoney(0.29, "PEN"), /0\.29$/);
  assert.match(formatAdminMoney("10.21", "USD"), /10\.21$/);
  assert.notEqual(formatAdminMoney(10, "PEN"), formatAdminMoney(10, "USD"));
});
test("importes o monedas ausentes se muestran como N/D", () => {
  for (const value of [null, undefined, NaN, Infinity, "", " ", "invalid"]) assert.equal(formatAdminMoney(value, "PEN"), "N/D");
  assert.equal(formatAdminMoney(8.2, null), "N/D");
});
