import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const requiredFiles = [
  "src/app/catalogo/page.tsx",
  "src/app/categoria/[slug]/page.tsx",
  "src/app/producto/[slug]/page.tsx",
  "src/app/buscar/page.tsx",
  "src/app/cotizacion/page.tsx",
  "src/components/catalog/CatalogFilters.tsx",
  "src/components/catalog/ProductGrid.tsx",
  "src/components/catalog/EmptyState.tsx",
  "src/components/catalog/SearchResults.tsx",
  "src/components/product/ProductDetail.tsx",
  "src/components/quote/QuoteForm.tsx",
  "src/lib/catalog.ts",
];

for (const file of requiredFiles) {
  assert.equal(existsSync(join(root, file)), true, `${file} should exist`);
}

const catalogPage = readFileSync(join(root, "src/app/catalogo/page.tsx"), "utf8");
assert.match(catalogPage, /ProductGrid/, "catalogo page should render ProductGrid");
assert.match(catalogPage, /CatalogFilters/, "catalogo page should render CatalogFilters");

const productGrid = readFileSync(join(root, "src/components/catalog/ProductGrid.tsx"), "utf8");
assert.match(productGrid, /ProductCard/, "ProductGrid should use ProductCard");

const productDetail = readFileSync(join(root, "src/components/product/ProductDetail.tsx"), "utf8");
assert.match(productDetail, /Solicitar cotización/, "ProductDetail should include quote CTA");
assert.match(productDetail, /createWhatsAppLink/, "ProductDetail should use WhatsApp helper");

const quoteSuccess = readFileSync(join(root, "src/components/quote/QuoteSuccess.tsx"), "utf8");
assert.match(
  quoteSuccess,
  /Solicitud registrada/,
  "QuoteSuccess should show registered request state",
);

const products = readFileSync(join(root, "src/data/products.ts"), "utf8");
for (const field of ["shortDescription", "longDescription", "stock", "status"]) {
  assert.match(products, new RegExp(`${field}:`), `products data should include ${field}`);
}
