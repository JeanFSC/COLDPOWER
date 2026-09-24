import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");
for (const file of [
  "src/components/home/Hero.tsx",
  "src/components/home/CategoriesGrid.tsx",
  "src/components/home/ProductSection.tsx",
  "src/components/home/BrandsSection.tsx",
  "src/components/home/NewArrivalsSection.tsx",
  "src/components/home/HomeProductTabs.tsx",
  "src/components/catalog/ProductCard.tsx",
]) assert.equal(existsSync(join(root, file)), true, file);
const page = read("src/app/page.tsx");
for (const component of ["Hero", "CategoriesGrid", "ProductSection", "BrandsSection", "NewArrivalsSection"]) assert.match(page, new RegExp("<" + component + "\\b"));
assert.match(page, /getCatalogProducts/);
assert.match(page, /pageSize: 48/);
for (const component of ["TechnicalSearchGuide", "ApplicationSolutions", "PromoBanner"]) assert.match(page, new RegExp(component));
assert.match(read("src/components/home/ProductSection.tsx"), /HomeProductTabs/);
assert.match(read("src/components/home/Hero.tsx"), /home-espejo\/hero-desktop\.webp/);
assert.match(read("src/components/home/Hero.tsx"), /href="\/cotizacion"/);
assert.match(read("src/components/home/HomeProductCard.tsx"), /Cód\.|formatProductPrice/);
console.log("Phase 3 current catalog-first homepage contract: PASS");
