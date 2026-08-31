import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync("src/lib/operations-dashboard.ts", "utf8");
const catalog = readFileSync("src/lib/catalog-admin-service.ts", "utf8");

test("CP-031 preserves dashboard fields consumed by the existing frontend", () => {
  for (const field of ["salesSeries", "previousSalesSeries", "pipelineSummary", "userSummary", "recentActivity", "unknownStock"]) {
    assert.match(dashboard, new RegExp(field));
  }
});

test("CP-031 catalog uses server pagination and does not replace unknown stock with zero", () => {
  assert.match(catalog, /\.limit\(pageSize\)\.offset/);
  assert.match(catalog, /stockState\(/);
  assert.match(catalog, /onHand: null, reserved: null/);
});
