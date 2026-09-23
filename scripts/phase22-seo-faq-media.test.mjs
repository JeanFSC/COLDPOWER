import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");
assert.equal(existsSync(join(root, "src/app/faq/page.tsx")), true);
const faq = read("src/app/faq/page.tsx");
assert.match(faq, /Confianza/);
assert.match(faq, /Preguntas frecuentes/);
assert.match(faq, /garant|envíos|compatibilidad/i);
assert.doesNotMatch(read("src/app/page.tsx"), /<FAQ\b|<Testimonials\b/);
const productPage = read("src/app/producto/[slug]/page.tsx");
assert.match(productPage, /application\/ld\+json/);
assert.match(productPage, /BreadcrumbList/);
assert.match(productPage, /cache\(/);
assert.match(read("src/app/layout.tsx"), /openGraph/);
assert.match(read("src/app/sitemap.ts"), /getAllCatalogProductsForSitemap/);
console.log("Phase 22 SEO, FAQ and media contract: PASS");

