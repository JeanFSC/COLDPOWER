import assert from "node:assert/strict";
import test from "node:test";
import { can } from "@/lib/roles";

test("CP-031 catalog permissions keep review and financial scopes separate", () => {
  assert.equal(can("SUPERADMIN", "catalog.product.view"), true);
  assert.equal(can("SUPERADMIN", "catalog.product.review"), true);
  assert.equal(can("JEFATURA", "catalog.product.review"), true);
  assert.equal(can("REPORTES", "catalog.product.review"), false);
  assert.equal(can("REPORTES", "pricing.cost.view"), false);
  assert.equal(can("GERENCIA", "pricing.cost.view"), true);
});
