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
assert.match(productDetail, /TransactionBox/, "ProductDetail should delegate quote actions to TransactionBox");
const transactionBox = readFileSync(join(root, "src/components/product/TransactionBox.tsx"), "utf8");
assert.match(transactionBox, /Solicitar cotizaci/, "TransactionBox should expose the quote CTA");
assert.match(transactionBox, /WhatsAppLeadButton/, "TransactionBox should use the persisted WhatsApp lead flow");
assert.match(readFileSync(join(root, "src/components/shared/WhatsAppLeadButton.tsx"), "utf8"), /api\/whatsapp\/lead/, "WhatsApp flow should persist the lead through its API");

const quoteSuccess = readFileSync(join(root, "src/components/quote/QuoteSuccess.tsx"), "utf8");
assert.match(quoteSuccess, /Solicitud registrada/, "QuoteSuccess should show registered request state");

const productType = readFileSync(join(root, "src/types/product.ts"), "utf8");
for (const field of ["shortDescription", "longDescription", "stock", "status"]) {
  assert.match(productType, new RegExp(`${field}:`), `the persistent product view model should include ${field}`);
}
