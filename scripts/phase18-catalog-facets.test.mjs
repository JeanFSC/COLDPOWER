import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");
const catalog = read("src/lib/catalog.ts");
for (const exportName of ["normalizeTechnicalValue", "parseFacetValues", "filterProducts", "searchProducts", "searchProductsForQuote"]) {
  assert.match(catalog, new RegExp(`export (?:async )?function ${exportName}`), `${exportName} should be exported`);
}
for (const sort of ["relevance", "availability", "consulted", "price-asc", "price-desc", "updated"]) assert.match(catalog, new RegExp(`[\\'"]${sort}[\\'"]`));
const catalogPage = read("src/app/catalogo/page.tsx");
assert.match(catalogPage, /getCatalogProducts/);
assert.match(catalogPage, /AppliedFilters/);
const categoryPage = read("src/app/categoria/[slug]/page.tsx");
assert.match(categoryPage, /getCatalogProducts/);
assert.equal(existsSync(join(root, "src/components/catalog/AppliedFilters.tsx")), true);
assert.equal(existsSync(join(root, "src/components/catalog/CompareBar.tsx")), true);
const card = read("src/components/catalog/ProductCard.tsx");
assert.match(card, /SKU|MPN/);
assert.ok(/Agregar a cotizaci|AddToCartButton|label="Cotizar"/.test(card), "product card should expose a quote/cart action");
assert.doesNotMatch(card, /S\/\s*0\.00/);
assert.match(read("src/components/catalog/CompareBar.tsx"), /4/);
console.log("Phase 18 catalog facets and technical search: PASS");
