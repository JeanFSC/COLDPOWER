import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");
const page = read("src/app/page.tsx");
for (const component of ["Hero", "CategoriesGrid", "ProductSection", "BrandsSection", "NewArrivalsSection"]) assert.match(page, new RegExp("<" + component + "\\b"));
for (const component of ["TechnicalSearchGuide", "ApplicationSolutions", "PromoBanner"]) assert.match(page, new RegExp(component));
assert.match(read("src/components/home/ProductSection.tsx"), /HomeProductTabs/);
assert.match(page, /getCatalogProducts/);
assert.match(page, /pageSize:\s*48/);
const categories = read("src/components/home/CategoriesGrid.tsx");
assert.match(categories, /targetCategories/);
assert.match(categories, /Compresores/);
assert.match(categories, /Línea blanca/);
assert.doesNotMatch(categories, /count=\{category\.productCount\}/);
assert.match(read("src/components/home/Hero.tsx"), /home-espejo\/hero-desktop\.webp/);
console.log("Phase 17 catalog-first homepage: PASS");
