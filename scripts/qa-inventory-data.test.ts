import assert from "node:assert/strict";
import test from "node:test";

import { evaluateInventoryDataIntegrity } from "./qa-inventory-data";

const sourceRow = {
  sku: "CP-001",
  nombre_original: "Capacitor 40UF",
  nombre_normalizado: "Capacitor 40UF",
  categoria: "Refrigeración",
  familia: "Capacitores",
  producto: "Capacitor",
  marca: "GENÉRICO",
  compatibilidad_marcas: "LG; Samsung",
  modelo_codigo: "40UF-450V",
  aplicacion: "Compresor",
  voltaje: "450V",
  potencia: null,
  frecuencia: null,
  rpm: null,
  amperaje: null,
  capacitancia: "40UF",
  refrigerante: "R134",
  potencia_hp: null,
  temperatura: null,
  medidas: null,
  longitud: null,
  conexion_medida: null,
  unidad_medida: "UNIDAD",
  estado: "Activo",
  impuesto: "Gravado",
  codigo_referencia_original: "REF-1",
  codigo_barra_original: null,
  peso_original: null,
  requiere_revision: false,
  motivo_revision: null,
  posible_duplicado: false,
  grupo_duplicado: null,
  confianza_normalizacion: "alta",
  metodo_clasificacion: "manual",
  pagina_fuente: "2",
  fila_pagina: "15",
};

const storedRow = {
  id: "product-cp-001",
  sku: "CP-001",
  slug: "capacitor-40uf",
  originalName: "Capacitor 40UF",
  normalizedName: "Capacitor 40UF",
  productType: "Capacitor",
  categoryId: "category-refrigeracion",
  categoryName: "Refrigeración",
  categorySlug: "refrigeracion",
  familyId: "family-refrigeracion-capacitores",
  familyCategoryId: "category-refrigeracion",
  familyName: "Capacitores",
  familySlug: "refrigeracion-capacitores",
  brandId: "brand-generico",
  brandName: "GENÉRICO",
  brandSlug: "generico",
  compatibilityBrands: ["LG", "Samsung"],
  modelCode: "40UF-450V",
  application: "Compresor",
  voltage: "450V",
  power: null,
  frequency: null,
  rpm: null,
  amperage: null,
  capacitance: "40UF",
  refrigerant: "R134",
  horsepower: null,
  temperature: null,
  dimensions: null,
  length: null,
  connectionSize: null,
  unitOfMeasure: "UNIDAD",
  status: "Activo",
  taxType: "Gravado",
  originalReferenceCode: "REF-1",
  barcode: null,
  originalWeight: null,
  requiresReview: false,
  reviewReason: null,
  possibleDuplicate: false,
  duplicateGroup: null,
  normalizationConfidence: "alta",
  normalizationMethod: "manual",
  sourcePage: 2,
  sourceRow: 15,
};

test("accepts an exact field-by-field copy of the imported Excel row", () => {
  const report = evaluateInventoryDataIntegrity([sourceRow], [storedRow], 1);

  assert.equal(report.passed, true);
  assert.equal(report.mismatchCount, 0);
  assert.deepEqual(report.missingSkus, []);
  assert.deepEqual(report.unexpectedSkus, []);
});

test("reports a persisted source-field difference and a broken category-family hierarchy", () => {
  const report = evaluateInventoryDataIntegrity(
    [sourceRow],
    [{ ...storedRow, modelCode: "OTRO-MODELO", familyCategoryId: "category-incorrecta" }],
    1,
  );

  assert.equal(report.passed, false);
  assert.equal(report.mismatchCount, 2);
  assert.deepEqual(
    report.mismatchSamples.map((mismatch) => mismatch.field).sort(),
    ["familyCategoryId", "modelCode"],
  );
});

test("reports missing and unexpected SKU without concealing them behind row totals", () => {
  const report = evaluateInventoryDataIntegrity(
    [sourceRow],
    [{ ...storedRow, sku: "CP-EXTRA", id: "product-cp-extra" }],
    1,
  );

  assert.equal(report.passed, false);
  assert.deepEqual(report.missingSkus, ["CP-001"]);
  assert.deepEqual(report.unexpectedSkus, ["CP-EXTRA"]);
});
