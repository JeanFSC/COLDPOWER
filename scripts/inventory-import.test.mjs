import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  normalizeSourceRow,
  planProductSlugs,
  readImportRows,
  validateImportRows,
} from "./inventory-import.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const workbookPath = path.resolve(here, "../../INVENTARIO CATALOGO/ColdPower_Inventario_Final_Validado.xlsx");

test("reads exactly 1,348 rows from IMPORT_PRODUCTOS and ignores audit sheets", () => {
  const result = readImportRows(workbookPath);

  assert.equal(result.sheetName, "IMPORT_PRODUCTOS");
  assert.equal(result.rows.length, 1348);
  assert.ok(result.headers.includes("sku"));
  assert.ok(result.headers.includes("familia"));
  assert.ok(!result.headers.includes("N° revisión"));
});

test("rejects blank and duplicate SKUs before import", () => {
  const result = validateImportRows([
    { sku: "CP-001", nombre_normalizado: "Capacitor" },
    { sku: "CP-001", nombre_normalizado: "Otro capacitor" },
    { sku: "", nombre_normalizado: "Sin SKU" },
  ], 3);

  assert.equal(result.valid, false);
  assert.deepEqual(result.duplicateSkus, ["CP-001"]);
  assert.match(result.errors.join("\n"), /SKU vac[ií]o/i);
});

test("preserves empty source cells as null without inventing technical values", () => {
  const row = normalizeSourceRow({
    sku: "CP-002",
    nombre_original: "Capacitor",
    voltaje: "",
    potencia: undefined,
    requiere_revision: "NO",
  });

  assert.equal(row.sku, "CP-002");
  assert.equal(row.voltaje, null);
  assert.equal(row.potencia, null);
  assert.equal(row.requiere_revision, false);
});

test("uses the normalized name as the canonical slug and adds SKU only on a collision", () => {
  const slugs = planProductSlugs([
    { sku: "CP-002", nombre_normalizado: "Bomba de agua 220 V" },
    { sku: "CP-001", nombre_normalizado: "Bomba de agua 220 V" },
    { sku: "CP-003", nombre_normalizado: "Capacitor 40UF" },
  ]);

  assert.equal(slugs.get("CP-001"), "bomba-de-agua-220-v");
  assert.equal(slugs.get("CP-002"), "bomba-de-agua-220-v-cp-002");
  assert.equal(slugs.get("CP-003"), "capacitor-40uf");
});

test("keeps an already assigned SKU slug stable on later imports", () => {
  const slugs = planProductSlugs(
    [{ sku: "CP-001", nombre_normalizado: "Nombre actualizado" }],
    new Map([["CP-001", "nombre-original-publicado"]]),
  );

  assert.equal(slugs.get("CP-001"), "nombre-original-publicado");
});
