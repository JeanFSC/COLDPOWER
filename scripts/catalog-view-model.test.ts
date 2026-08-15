import test from "node:test";
import assert from "node:assert/strict";

import { mapCatalogProductRow } from "../src/lib/catalog-view-model";

test("maps a persistent inventory row without inventing commercial data", () => {
  const product = mapCatalogProductRow({
    product: {
      id: "product-cp-001",
      sku: "CP-001",
      slug: "motor-mabe-cp-001",
      originalName: "Motor Mabe",
      normalizedName: "Motor Mabe",
      productType: "Motor",
      compatibilityBrands: ["Mabe", "Samsung"],
      modelCode: "M123",
      application: "Refrigeradora",
      voltage: "220V",
      power: null,
      frequency: null,
      rpm: null,
      amperage: null,
      capacitance: null,
      refrigerant: "R134a",
      horsepower: null,
      temperature: null,
      dimensions: null,
      length: null,
      connectionSize: null,
      unitOfMeasure: "Unidad",
      status: "Activo",
    },
    category: { name: "Refrigeración", slug: "refrigeracion" },
    family: { name: "Motores", slug: "refrigeracion-motores" },
    brand: null,
  });

  assert.equal(product.category, "Refrigeración");
  assert.equal(product.family, "Motores");
  assert.equal(product.brand, "");
  assert.equal(product.price, null);
  assert.equal(product.stock, null);
  assert.equal(product.status, "on-request");
  assert.deepEqual(product.compatibility, []);
  assert.deepEqual(product.compatibilityBrands, ["Mabe", "Samsung"]);
  assert.deepEqual(product.specs, [
    { label: "Modelo/Código", value: "M123" },
    { label: "Aplicación", value: "Refrigeradora" },
    { label: "Voltaje", value: "220V" },
    { label: "Refrigerante", value: "R134a" },
    { label: "Unidad de medida", value: "Unidad" },
  ]);
});

test("maps inactive source status to a visible non-available state", () => {
  const product = mapCatalogProductRow({
    product: {
      id: "product-cp-002",
      sku: "CP-002",
      slug: "filtro-cp-002",
      originalName: "Filtro",
      normalizedName: "Filtro",
      productType: "Repuesto",
      compatibilityBrands: null,
      modelCode: null,
      application: null,
      voltage: null,
      power: null,
      frequency: null,
      rpm: null,
      amperage: null,
      capacitance: null,
      refrigerant: null,
      horsepower: null,
      temperature: null,
      dimensions: null,
      length: null,
      connectionSize: null,
      unitOfMeasure: "Unidad",
      status: "Inactivo",
    },
    category: { name: "Refrigeración", slug: "refrigeracion" },
    family: { name: "Filtros", slug: "refrigeracion-filtros" },
    brand: { name: "" },
  });

  assert.equal(product.status, "out-of-stock");
  assert.equal(product.stock, null);
  assert.equal(product.price, null);
});
