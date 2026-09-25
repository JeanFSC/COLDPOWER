import test from "node:test";
import assert from "node:assert/strict";

import { mapCatalogProductRow, type CatalogProductSourceRow } from "../src/lib/catalog-view-model";

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
      unitOfMeasure: "UNIDAD (BIENES)",
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
  assert.equal(product.shortDescription, "Repuesto para Refrigeradora. Verifica el código M123 antes de comprar.");
  assert.equal(product.longDescription, "");
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
      unitOfMeasure: "NIU",
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

test("uses persisted availability for a priced commercial product", () => {
  const product = mapCatalogProductRow({
    product: {
      id: "product-cp-priced-001",
      sku: "CP-PRICED-001",
      slug: "priced-product-cp-001",
      originalName: "Priced product",
      normalizedName: "Priced product",
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
      unitOfMeasure: "NIU",
      status: "Activo",
      availabilityStatus: "in_stock",
      price: 90,
      priceCurrency: "PEN",
    },
    category: { name: "Refrigeración", slug: "refrigeracion" },
    family: { name: "Repuestos", slug: "repuestos" },
    brand: null,
  });

  assert.equal(product.price, 90);
  assert.equal(product.status, "in-stock");
});

test("does not expose the exact generated family sentence stored in the catalog", () => {
  const product = mapCatalogProductRow({
    product: {
      id: "product-cp-003",
      sku: "CP-003",
      slug: "capacitor-cp-003",
      originalName: "REFRIGERACIÓN - CAPACITOR 25UF 450V COLDPOWER",
      normalizedName: "CAPACITOR 25 µF 450 V COLDPOWER",
      productType: "Capacitor",
      compatibilityBrands: null,
      modelCode: null,
      application: "Refrigeradoras / sistemas de refrigeración",
      voltage: null,
      power: null,
      frequency: null,
      rpm: null,
      amperage: null,
      capacitance: "25 µF",
      refrigerant: null,
      horsepower: null,
      temperature: null,
      dimensions: null,
      length: null,
      connectionSize: null,
      unitOfMeasure: "NIU",
      status: "Activo",
      editorialDescription: "CAPACITOR 25 µF 450 V COLDPOWER. Referencia de catálogo de la familia Capacitores para Refrigeración.",
    },
    category: { name: "Refrigeración", slug: "refrigeracion" },
    family: { name: "Capacitores", slug: "refrigeracion-capacitores" },
    brand: null,
  });

  assert.equal(product.shortDescription, "Repuesto para Refrigeradoras / sistemas de refrigeración.");
  assert.equal(product.longDescription, "");
});

test("suppresses generated family copy even when the product name is repeated", () => {
  const product = mapCatalogProductRow({
    product: {
      id: "product-cp-004",
      sku: "CP-004",
      slug: "capacitor-cp-004",
      originalName: "Capacitor",
      normalizedName: "CAPACITOR 25 µF 450 V COLDPOWER",
      productType: "Capacitor",
      compatibilityBrands: null,
      modelCode: null,
      application: "Refrigeradoras",
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
      unitOfMeasure: "NIU",
      status: "Activo",
      editorialDescription: "CAPACITOR 25 µF 450 V COLDPOWER CAPACITOR 25 µF 450 V COLDPOWER. Referencia de catálogo de la familia Capacitores para Refrigeración.",
    },
    category: { name: "Refrigeración", slug: "refrigeracion" },
    family: { name: "Capacitores", slug: "refrigeracion-capacitores" },
    brand: null,
  });

  assert.equal(product.shortDescription, "Repuesto para Refrigeradoras.");
  assert.equal(product.longDescription, "");
});

test("preserves promotion pricing markers supplied by the persistent catalog repository", () => {
  const row = {
    product: {
      id: "product-cp-sale-001",
      sku: "CP-SALE-001",
      slug: "control-sale-001",
      originalName: "Control en oferta",
      normalizedName: "Control en oferta",
      productType: "Control",
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
      status: "Activo",
      price: 90,
      priceCurrency: "PEN",
      oldPrice: 100,
      discount: 10,
      onSale: true,
    },
    category: { name: "Refrigeración", slug: "refrigeracion" },
    family: { name: "Controles", slug: "refrigeracion-controles" },
    brand: null,
  } satisfies CatalogProductSourceRow;

  const product = mapCatalogProductRow(row);
  assert.equal(product.price, 90);
  assert.equal(product.oldPrice, 100);
  assert.equal(product.discount, 10);
  assert.equal(product.onSale, true);
});
