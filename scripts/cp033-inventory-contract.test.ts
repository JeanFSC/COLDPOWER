import assert from "node:assert/strict";
import { test } from "node:test";
import { parseInventoryFilters, parseInventoryMovementsFilters, parseKardexFilters } from "../src/lib/inventory-admin-contract";
import { applyInventoryOperation, assertValidBalance, deriveInventoryStatus, validateInventoryMovementMetadata } from "../src/lib/inventory-domain";

test("CP-033 derives inventory states without converting null minimum to zero", () => {
  assert.equal(deriveInventoryStatus({ onHand: 0, reserved: 0, minimumStock: null }), "SIN_MINIMO");
  assert.equal(deriveInventoryStatus({ onHand: 0, reserved: 0, minimumStock: 2 }), "AGOTADO");
  assert.equal(deriveInventoryStatus({ onHand: 8, reserved: 3, minimumStock: 5 }), "CRITICO");
  assert.equal(deriveInventoryStatus({ onHand: 8, reserved: 1, minimumStock: 5 }), "OPTIMO");
  assert.equal(deriveInventoryStatus({ onHand: null, reserved: null, minimumStock: null, hasBalance: false }), "SIN_SALDO");
});

test("CP-033 preserves the balance invariants for output operations", () => {
  assert.throws(() => assertValidBalance({ onHand: 4, reserved: 5 }));
  assert.deepEqual(applyInventoryOperation({ onHand: 8, reserved: 3 }, { type: "ADJUSTMENT_OUT", quantity: 5 }), { onHand: 3, reserved: 3 });
  assert.throws(() => applyInventoryOperation({ onHand: 8, reserved: 3 }, { type: "ADJUSTMENT_OUT", quantity: 6 }));
});

test("CP-033 requires traceability for manual adjustments", () => {
  assert.throws(() => validateInventoryMovementMetadata({ type: "ADJUSTMENT_IN", performedBy: "user-1" }));
  assert.deepEqual(validateInventoryMovementMetadata({ type: "ADJUSTMENT_IN", reason: "Conteo", notes: "Acta 24", performedBy: "user-1" }), { reason: "Conteo", notes: "Acta 24", performedBy: "user-1" });
});

test("CP-033 parses server-side inventory and Kardex filters", () => {
  const filters = parseInventoryFilters(new URLSearchParams("query=compresor&locationId=store-1&status=CRITICO&page=2&pageSize=50"));
  assert.deepEqual(filters, { query: "compresor", locationId: "store-1", categoryId: undefined, familyId: undefined, brandId: undefined, status: "CRITICO", hasReservations: undefined, hasMinimum: undefined, minAvailable: undefined, updatedFrom: undefined, updatedTo: undefined, page: 2, pageSize: 50 });
  assert.throws(() => parseInventoryFilters(new URLSearchParams("pageSize=12")));
  assert.deepEqual(parseInventoryFilters(new URLSearchParams("status=RESERVADO&hasReservations=true&hasMinimum=false&minAvailable=4&updatedFrom=2026-08-01&updatedTo=2026-08-31")), { query: undefined, locationId: undefined, categoryId: undefined, familyId: undefined, brandId: undefined, status: "RESERVADO", hasReservations: true, hasMinimum: false, minAvailable: 4, updatedFrom: "2026-08-01", updatedTo: "2026-08-31", page: undefined, pageSize: undefined });
  assert.throws(() => parseInventoryFilters(new URLSearchParams("updatedFrom=2026-09-01&updatedTo=2026-08-31")));
  assert.deepEqual(parseKardexFilters(new URLSearchParams("productId=p-1&locationId=l-1&type=TRANSFER_IN")), { productId: "p-1", locationId: "l-1", type: "TRANSFER_IN", dateFrom: undefined, dateTo: undefined, page: undefined, pageSize: undefined });
  assert.deepEqual(parseInventoryMovementsFilters(new URLSearchParams("productId=p-1&locationId=l-1&type=ADJUSTMENT_IN&actor=Jean&page=2&pageSize=50&dateFrom=2026-08-01&dateTo=2026-08-31")), { productId: "p-1", locationId: "l-1", type: "ADJUSTMENT_IN", actorQuery: "Jean", dateFrom: "2026-08-01", dateTo: "2026-08-31", page: 2, pageSize: 50 });
  assert.throws(() => parseInventoryMovementsFilters(new URLSearchParams("dateFrom=2026-08-31&dateTo=2026-08-01")));
});
