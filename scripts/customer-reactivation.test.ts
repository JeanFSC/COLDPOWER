import assert from "node:assert/strict";
import test from "node:test";
import { assertCustomerReactivatable, CustomerOperationsError } from "../src/lib/customer-operations-service";

test("reactivación: admite inactivos y repetición de activos", () => {
  assert.doesNotThrow(() => assertCustomerReactivatable({ status: "INACTIVE", canonicalCustomerId: null }));
  assert.doesNotThrow(() => assertCustomerReactivatable({ status: "ACTIVE" }));
});
test("reactivación: no rompe fusiones ni convierte prospectos", () => {
  for (const status of ["INACTIVE", "ACTIVE"]) {
    assert.throws(() => assertCustomerReactivatable({ status, canonicalCustomerId: "principal" }), (error: unknown) => error instanceof CustomerOperationsError && error.code === "CUSTOMER_MERGED" && error.status === 409);
  }
  assert.throws(() => assertCustomerReactivatable({ status: "PROSPECT" }), (error: unknown) => error instanceof CustomerOperationsError && error.code === "CUSTOMER_STATUS_CONFLICT");
});