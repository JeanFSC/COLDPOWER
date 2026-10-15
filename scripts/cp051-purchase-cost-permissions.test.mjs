import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("compras oculta importes a roles sin permiso financiero", () => {
  const list = read("src/app/api/admin/compras/route.ts");
  const detail = read("src/app/api/admin/compras/[id]/route.ts");
  const exportRoute = read("src/app/api/admin/compras/export/route.ts");
  const supplierPage = read("src/app/admin/compras/proveedores/[id]/page.tsx");
  const supplierUi = read("src/components/admin/SupplierDetailWorkspace.tsx");

  for (const source of [list, detail, exportRoute, supplierPage]) {
    assert.match(source, /purchases\.cost\.view/);
  }
  assert.match(list, /subtotal: ""/);
  assert.match(list, /totalAmount: 0/);
  assert.match(detail, /unitCost\s*:\s*""/);
  assert.match(exportRoute, /exportHeader = canViewCosts \? header : header\.filter\(\(column\) => column !== "subtotal"\)/);
  assert.match(supplierPage, /openAmounts: \[\]/);
  assert.match(supplierPage, /subtotal: ""/);
  assert.match(supplierUi, /canViewCosts \? money\(purchase\.subtotal/);
  assert.match(supplierUi, /"Restringido"/);
});
