import assert from "node:assert/strict";
import test from "node:test";

import { evaluateInventoryQa } from "./qa-inventory-full";

test("accepts a database inventory that preserves all required catalog invariants", () => {
  const report = evaluateInventoryQa({
    totalProducts: 1348,
    uniqueSkuCount: 1348,
    duplicateSkus: [],
    categories: 27,
    families: 91,
    brands: 42,
    requiredCategoryCounts: {
      lavadoras: 356,
      licuadoras: 120,
      "bombas-de-agua": 53,
      cocinas: 67,
      "campanas-extractoras": 48,
      refrigeracion: 528,
    },
  });

  assert.equal(report.passed, true);
  assert.deepEqual(report.errors, []);
});

test("reports wrong totals, duplicate SKUs and empty required categories", () => {
  const report = evaluateInventoryQa({
    totalProducts: 1347,
    uniqueSkuCount: 1346,
    duplicateSkus: ["CP-001"],
    categories: 26,
    families: 90,
    brands: 41,
    requiredCategoryCounts: {
      lavadoras: 0,
      licuadoras: 120,
      "bombas-de-agua": 53,
      cocinas: 67,
      "campanas-extractoras": 48,
      refrigeracion: 528,
    },
  });

  assert.equal(report.passed, false);
  assert.match(report.errors.join("\n"), /1348/);
  assert.match(report.errors.join("\n"), /CP-001/);
  assert.match(report.errors.join("\n"), /lavadoras/);
});
