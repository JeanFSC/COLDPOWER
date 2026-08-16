import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductWorkspace } from "@/components/admin/AdminCategoryViews";

const rows = Array.from({ length: 48 }, (_, index) => ({
  id: `product-${index}`,
  name: `Producto ${index}`,
  sku: `SKU-${index}`,
  brand: "ColdPower",
  family: "Familia",
  publicationStatus: "review",
  requiresReview: true,
  possibleDuplicate: index < 2,
}));

const metrics = {
  totalProducts: 1348,
  publishedProducts: 4,
  draftProducts: 0,
  reviewProducts: 1344,
  duplicateProducts: 62,
  productsRequiringReview: 57,
  totalBrands: 60,
};

function renderCatalog(queryString = "publicationStatus=review&page=1") {
  return renderToStaticMarkup(
    React.createElement(ProductWorkspace, {
      rows,
      total: 1348,
      metrics,
      pagination: { page: 1, totalPages: 29, totalItems: 1348 },
      queryString,
    }),
  );
}

test("CP-029 renderiza KPI globales aunque la página tenga 48 filas REVIEW", () => {
  const html = renderCatalog();
  for (const value of [1348, 4, 1344, 62, 57]) {
    assert.match(html, new RegExp(`>${value}<`), `missing global metric ${value}`);
  }
});

test("CP-029 conserva filtros al navegar la paginación del catálogo", () => {
  const html = renderCatalog();
  assert.match(html, /publicationStatus=review/);
  assert.match(html, /page=2/);
  assert.match(html, /aria-current="page"/);
});
