import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");
const detail = read("src/components/product/ProductDetail.tsx");
const productPage = read("src/app/producto/[slug]/page.tsx");
const transactionBox = read("src/components/product/TransactionBox.tsx");

for (const file of [
  "src/components/product/ProductGallery.tsx",
  "src/components/product/TechnicalIdentity.tsx",
  "src/components/product/CompatibilityPanel.tsx",
  "src/components/product/TransactionBox.tsx",
  "src/components/product/ProductAnchors.tsx",
  "src/lib/compatibility.ts",
]) {
  assert.equal(existsSync(join(root, file)), true, `${file} should exist`);
}

for (const component of ["ProductGallery", "TechnicalIdentity", "CompatibilityPanel", "TransactionBox", "ProductAnchors"]) {
  assert.ok(new RegExp(`<${component}\\b`).test(detail) || (component === "CompatibilityPanel" && /compatibilityBrands|Marcas mencionadas|compatibilidad/i.test(detail)), `ProductDetail should render or project ${component}`);
}

assert.ok(/lg:grid-cols-\[400px_minmax\(0,536px\)_336px\]|lg:grid-cols-\[minmax\(0,1\.05fr\)_minmax\(0,0\.95fr\)\]/.test(detail), "PDP should use a responsive product-forward desktop composition");
assert.ok(/position-sticky|sticky|TransactionBox/.test(detail), "PDP should keep transaction actions in the product composition");
assert.ok(/Agregar a cotizaci[oó]n|Solicitar cotizaci[oó]n/.test(detail + transactionBox), "PDP should expose quote CTA");
assert.match(detail, /lg:hidden/, "PDP should expose a mobile-only action bar");
assert.match(detail, /fixed\s+inset-x-0\s+bottom-0|sticky\s+bottom-0/, "PDP mobile action bar should remain reachable while scrolling");
assert.match(detail, /pb-24|pb-\[.*\]/, "PDP should reserve space for the mobile action bar");
assert.doesNotMatch(detail, /S\/\s*0\.00/, "PDP should never show zero price");

const compatibility = read("src/lib/compatibility.ts");
for (const state of ["confirmed", "specification-match", "validation-required", "not-compatible"]) {
  assert.match(compatibility, new RegExp(`['\"]${state}['\"]`), `compatibility state ${state} should exist`);
}

assert.match(productPage, /noindex|index:\s*false/, "incomplete product pages should be noindex");
assert.match(productPage, /evaluateProductPublication/, "product metadata should use publication status");

console.log("Phase 19 technical product detail: PASS");
