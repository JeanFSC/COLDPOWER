import assert from "node:assert/strict";
import test from "node:test";
import { planStockImport, type StockCatalogRow } from "../src/lib/stock-import";

const catalog: StockCatalogRow[] = [
  { sku: "CP-001", productId: "p1" },
  { sku: "CP-002", productId: "p2" },
];

test("un archivo sin cantidad o ubicación nunca puede aplicar", () => {
  const report = planStockImport([{ sku: "CP-001", nombre: "Producto" }], catalog);
  assert.equal(report.canApply, false);
  assert.match(report.errors.join(" | "), /cantidad|ubicaci[oó]n/i);
});

test("la importación usa SKU exacto y reporta coincidencias y faltantes", () => {
  const report = planStockImport([
    { sku: "CP-001", locationCode: "ALM-1", quantity: 4 },
    { sku: "NO-EXISTE", locationCode: "ALM-1", quantity: 2 },
    { sku: "CP-002", locationCode: "", quantity: 1 },
  ], catalog);
  assert.equal(report.matched, 1);
  assert.equal(report.unmatched, 1);
  assert.equal(report.errors.length > 0, true);
  assert.equal(report.rows[0]?.sku, "CP-001");
});

test("no se aceptan cantidades negativas, cero ni SKU parcial", () => {
  const report = planStockImport([
    { sku: "CP-00", locationCode: "ALM-1", quantity: 2 },
    { sku: "CP-001", locationCode: "ALM-1", quantity: 0 },
    { sku: "CP-002", locationCode: "ALM-1", quantity: -1 },
  ], catalog);
  assert.equal(report.canApply, false);
  assert.equal(report.matched, 0);
  assert.match(report.errors.join(" | "), /exact|positiva|mayor/i);
});
