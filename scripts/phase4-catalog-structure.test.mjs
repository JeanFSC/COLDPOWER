import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");
for (const file of [
  "src/app/catalogo/page.tsx",
  "src/app/categoria/[slug]/page.tsx",
  "src/app/producto/[slug]/page.tsx",
  "src/app/buscar/page.tsx",
  "src/components/catalog/CatalogHero.tsx",
  "src/components/catalog/CatalogFilters.tsx",
  "src/components/catalog/ProductGrid.tsx",
  "src/components/catalog/EmptyState.tsx",
  "src/lib/catalog.ts",
]) assert.equal(existsSync(join(root, file)), true, file);
const catalog = read("src/app/catalogo/page.tsx");
assert.match(catalog, /CatalogHero/);
assert.match(catalog, /ProductGrid/);
assert.match(catalog, /sort:\s*filters\.sort/);
assert.match(read("src/app/categoria/[slug]/page.tsx"), /getCatalogBrandsForCategory/);
assert.match(read("src/components/catalog/ProductGrid.tsx"), /grid-cols-2/);
assert.match(read("src/components/catalog/ProductCard.tsx"), /SKU:/);
assert.doesNotMatch(read("src/components/catalog/ProductCard.tsx"), /Ver ficha/);
console.log("Phase 4 catalog, category and search contract: PASS");

