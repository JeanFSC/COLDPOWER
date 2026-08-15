import test from "node:test";
import assert from "node:assert/strict";

import { evaluateCompatibility } from "../src/lib/compatibility";
import type { Product } from "../src/types/product";

const product: Product = {
  id: "product-1",
  slug: "producto-1",
  name: "Producto",
  category: "refrigeracion",
  brand: "",
  price: null,
  stock: null,
  sku: "CP-1",
  status: "on-request",
  type: "Repuesto",
  origin: "IMPORT_PRODUCTOS",
  compatibility: [],
  specs: [
    { label: "Voltaje", value: "220V" },
    { label: "Aplicación", value: "Refrigeradora" },
    { label: "Modelo/Código", value: "M1" },
  ],
  images: [],
  shortDescription: "Producto de prueba.",
  longDescription: "Producto de prueba.",
  description: "Producto de prueba.",
  featured: false,
  onSale: false,
  relatedIds: [],
};

test("technical fields alone never produce a compatibility confirmation", () => {
  const evaluation = evaluateCompatibility(product, "M1");
  assert.equal(evaluation.state, "validation-required");
});
