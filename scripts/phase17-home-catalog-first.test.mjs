import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");
const page = read("src/app/page.tsx");
for (const component of ["Hero", "CategoriesGrid", "ProductSection", "BrandsSection", "BenefitsBar", "AssistanceSection"]) assert.match(page, new RegExp("<" + component + "\\b"));
for (const component of ["TechnicalSearchGuide", "ApplicationSolutions", "PromoBanner", "HomeFaq"]) assert.match(page, new RegExp(component));
assert.match(page, /getCatalogProducts/);
assert.match(page, /pageSize:\s*24/);
const categories = read("src/components/home/CategoriesGrid.tsx");
assert.match(categories, /productCount\s*>\s*0/);
assert.match(read("src/components/home/Hero.tsx"), /home-v2-hero-hvac\.webp/);
console.log("Phase 17 catalog-first homepage: PASS");
