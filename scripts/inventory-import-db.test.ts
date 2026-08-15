import test from "node:test";
import assert from "node:assert/strict";

import {
  mapSourceRow,
  splitCompatibilityBrands,
  toProductUpdateValues,
} from "./import-inventory";

test("maps a validated source row to persistent product fields without inventing data", () => {
  const product = mapSourceRow(
    {
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
      amperage: null,
      amperaje: null,
      capacitancia: "40UF",
      refrigerante: null,
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
    },
    {
      categoryId: "cat-refrigeracion",
      familyId: "fam-capacitores",
      brandId: "brand-generico",
      slug: "capacitor-40uf-cp-001",
    },
  );

  assert.equal(product.id, "product-cp-001");
  assert.equal(product.sku, "CP-001");
  assert.equal(product.categoryId, "cat-refrigeracion");
  assert.equal(product.familyId, "fam-capacitores");
  assert.deepEqual(product.compatibilityBrands, ["LG", "Samsung"]);
  assert.equal(product.power, null);
  assert.equal(product.sourcePage, 2);
  assert.equal(product.sourceRow, 15);
});

test("splits compatible brands and removes empty duplicate entries", () => {
  assert.deepEqual(splitCompatibilityBrands("LG, Samsung; lg ;"), ["LG", "Samsung", "lg"]);
  assert.equal(splitCompatibilityBrands(null), null);
});

test("keeps immutable identifiers out of the SKU upsert updates", () => {
  const updates = toProductUpdateValues({
    id: "product-cp-001",
    sku: "CP-001",
    slug: "capacitor-40uf-cp-001",
    originalName: "Capacitor 40UF",
  } as ReturnType<typeof mapSourceRow>);

  assert.deepEqual(updates, { originalName: "Capacitor 40UF" });
});
