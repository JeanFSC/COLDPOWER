import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");
const page = read("src/app/page.tsx");
for (const component of ["Hero", "CategoriesGrid", "ProductSection", "TechnicalSearchGuide", "ApplicationSolutions", "ComplementsSection", "BrandsSection", "BenefitsBar", "AssistanceSection"]) {
  assert.match(page, new RegExp(`<${component}\\b`), `homepage should render ${component}`);
}
assert.doesNotMatch(page, /Testimonials|FAQ/);
assert.match(page, /getCatalogProducts/, "homepage products should use the persistent catalog repository");
assert.match(page, /pageSize:\s*8/, "homepage should cap priority products at eight");
const productSection = read("src/components/home/ProductSection.tsx");
assert.match(productSection, /No hay productos publicados/, "homepage should explain editorially private products");
const categories = read("src/components/home/CategoriesGrid.tsx");
assert.ok(/slice\(0,\s*(6|8)\)/.test(categories), "homepage should cap category cards to a compact visible set");
assert.ok(/Ver todas|Explora por categor/i.test(categories), "homepage should expose the full category catalog");
assert.match(categories, /productCount\s*>\s*0/, "homepage should not promote categories without public references");
assert.match(categories, /priority|refriger|lavador/i, "homepage should prioritize technical category lines when available");
assert.match(categories, /categor[ií]as publicadas/i, "homepage should explain when no public categories are available");
assert.match(categories, /Explorar catálogo/i, "homepage category empty state should recover to the catalog");
for (const file of ["src/components/home/TechnicalSearchGuide.tsx", "src/components/home/ApplicationSolutions.tsx", "src/components/home/ComplementsSection.tsx", "src/components/home/BrandsSection.tsx", "src/components/home/AssistanceSection.tsx"]) assert.match(read(file), /<section/);
assert.match(read("src/components/home/Hero.tsx"), /Explorar cat/);
assert.ok(/Solicitar ayuda|Cotizar por WhatsApp|WhatsAppLeadButton/.test(read("src/components/home/Hero.tsx")), "hero should expose a direct assistance action");
console.log("Phase 17 catalog-first homepage: PASS");
