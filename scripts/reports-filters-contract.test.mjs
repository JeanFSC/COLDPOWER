import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dashboard = fs.readFileSync(path.join(root, "src/lib/operations-dashboard.ts"), "utf8");
const page = fs.readFileSync(path.join(root, "src/app/admin/reportes/page.tsx"), "utf8");

assert.match(dashboard, /DashboardFilters/);
for (const field of ["from", "to", "locationId", "sellerId", "customerId", "productId", "categoryId", "familyId", "brandId", "channel", "orderStatus"]) {
  assert.match(dashboard, new RegExp(field), `dashboard must support ${field}`);
  assert.match(page, new RegExp(`name=["']${field}["']`), `report form must expose ${field}`);
}
assert.match(dashboard, /salesRange/);
assert.match(page, /Rango personalizado/);

console.log("Reports filters contract: PASS");
