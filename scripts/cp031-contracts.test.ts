import assert from "node:assert/strict";
import test from "node:test";
import { parseDashboardFilters } from "@/lib/dashboard-contract";
import { canTransitionPublication, stockState, validateDuplicateDecision } from "@/lib/catalog-admin-contract";

test("CP-031 acepta filtros válidos y normaliza el rango", () => {
  const params = new URLSearchParams("range=custom&from=2026-08-01&to=2026-08-14&locationId=l1&sellerId=s1&productId=p1");
  assert.deepEqual(parseDashboardFilters(params), {
    range: "custom", from: "2026-08-01", to: "2026-08-14", locationId: "l1", sellerId: "s1",
    customerId: undefined, productId: "p1", categoryId: undefined, familyId: undefined,
    brandId: undefined, channel: undefined, orderStatus: undefined,
  });
});

test("CP-031 rechaza rango y fecha inválidos", () => {
  assert.throws(() => parseDashboardFilters(new URLSearchParams("range=bad")), /DASHBOARD_INVALID_FILTER/);
  assert.throws(() => parseDashboardFilters(new URLSearchParams("range=custom&from=2026-08-14&to=2026-08-01")), /DASHBOARD_INVALID_FILTER/);
});

test("CP-031 restringe las transiciones editoriales", () => {
  assert.equal(canTransitionPublication("draft", "published"), false);
  assert.equal(canTransitionPublication("review", "published"), true);
  assert.equal(canTransitionPublication("hidden", "published"), true);
});

test("CP-031 no permite que un producto sea su propio canónico", () => {
  assert.throws(
    () => validateDuplicateDecision({ productId: "p1", decision: "confirmed", canonicalProductId: "p1" }),
    /CATALOG_DUPLICATE_INVALID/,
  );
});

test("CP-031 distingue stock desconocido, cero, bajo y disponible", () => {
  assert.equal(stockState({ onHand: null, reserved: null, minimum: null }), "UNKNOWN");
  assert.equal(stockState({ onHand: 0, reserved: 0, minimum: 1 }), "ZERO");
  assert.equal(stockState({ onHand: 5, reserved: 2, minimum: 3 }), "LOW");
  assert.equal(stockState({ onHand: 10, reserved: 2, minimum: 3 }), "AVAILABLE");
});
