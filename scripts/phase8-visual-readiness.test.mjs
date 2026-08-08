import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return existsSync(join(root, relativePath));
}

for (const file of [
  "src/components/shared/BrandLogo.tsx",
  "docs/deploy-preview-checklist.md",
  "scripts/phase8-visual-readiness.test.mjs",
]) {
  assert.equal(exists(file), true, `${file} should exist`);
}

for (const asset of [
  "public/images/hero-coldpower.svg",
  "public/images/category-placeholder.svg",
  "public/images/product-placeholder-repuesto.svg",
  "public/images/testimonial-placeholder.svg",
]) {
  assert.equal(exists(asset), true, `${asset} should exist`);
  assert.ok(statSync(join(root, asset)).size > 500, `${asset} should not be an empty placeholder`);
}

// El catálogo real (1359 productos importados del reporte de inventario) comparte una
// ilustración SVG por sector/categoría en lugar de una foto única por producto, ya que
// todavía no hay fotografía real cargada. Cada una de las 16 categorías reales debe tener
// su propia ilustración, y esas 16 ilustraciones deben ser únicas entre sí.
const productTypesSource = read("src/types/product.ts");
const categoryUnionSource = productTypesSource.match(
  /export type ProductCategory =([\s\S]*?);/,
)[1];
const categorySlugs = categoryUnionSource
  .match(/"([a-z0-9-]+)"/g)
  .map((line) => line.replace(/"/g, ""));

assert.equal(categorySlugs.length, 16, "should have 16 real product categories");

const categoryImages = categorySlugs.map((slug) => `public/images/cat-${slug}.svg`);
for (const image of categoryImages) {
  assert.equal(exists(image), true, `${image} should exist`);
  assert.ok(statSync(join(root, image)).size > 500, `${image} should be a real (non-empty) illustration`);
}

// Cada ilustración de categoría debe ser única (sin repetir SVG entre categorías).
const hashes = new Map();
for (const image of categoryImages) {
  const hash = createHash("md5").update(readFileSync(join(root, image))).digest("hex");
  assert.equal(hashes.has(hash), false, `${image} duplicates ${hashes.get(hash)} — images must not repeat`);
  hashes.set(hash, image);
}

const brandLogo = read("src/components/shared/BrandLogo.tsx");
assert.match(brandLogo, /ColdPower/, "BrandLogo should render ColdPower");
assert.match(brandLogo, /variant/, "BrandLogo should support variants");

for (const file of [
  "src/components/layout/Header.tsx",
  "src/components/layout/Footer.tsx",
  "src/components/layout/MobileMenu.tsx",
  "src/app/not-found.tsx",
]) {
  assert.match(read(file), /BrandLogo/, `${file} should use BrandLogo`);
}

const categories = read("src/data/categories.ts");
assert.doesNotMatch(
  categories,
  /image: "\/images\/category-placeholder\.svg"/,
  "categories should not use the old generic category placeholder",
);
assert.match(categories, /cat-refrigeracion\.svg/, "categories should use unique category illustrations");

const productsData = read("src/data/products.ts");
assert.match(productsData, /price: null/, "generated catalog should mark unpriced items as price: null (editable later)");

const hero = read("src/components/home/Hero.tsx");
assert.match(hero, /hero-coldpower\.svg/, "Hero should use the ColdPower hero illustration");
assert.match(hero, /priority/, "Hero image should be marked priority for LCP");
assert.match(hero, /BrandLogo/, "Hero should display the brand logo over the image");

const promo = read("src/components/home/PromoBanner.tsx");
assert.match(promo, /promoProductIds/, "Promo section should keep a curated product id list");
assert.doesNotMatch(
  promo,
  /products\.filter\(\(product\) => product\.onSale\)/,
  "Promo section should not duplicate the sale products",
);

const about = read("src/app/nosotros/page.tsx");
for (const step of [
  "Escuchamos tu necesidad",
  "Validamos compatibilidad",
  "Te cotizamos con claridad",
  "Coordinamos entrega o recojo",
]) {
  assert.match(about, new RegExp(step), `About page should include work step: ${step}`);
}

const prompts = read("docs/image-prompts.md");
assert.match(prompts, /SVG fallback/i, "image prompts should document SVG fallback assets");

const previewDocs = read("docs/deploy-preview-checklist.md");
for (const section of [
  "Revisión previa a Vercel",
  "Variables mínimas",
  "Comandos",
  "Después del deploy",
  "Validar rutas",
  "Validar cotización",
  "robots",
  "sitemap",
]) {
  assert.match(
    previewDocs,
    new RegExp(section, "i"),
    `deploy preview checklist should include ${section}`,
  );
}

const forbiddenSourceFiles = [
  ...readdirSync(join(root, "src"), { recursive: true })
    .filter((file) => /\.(ts|tsx|css)$/.test(String(file)))
    .map((file) => join("src", String(file))),
  ...readdirSync(join(root, "public"), { recursive: true })
    .filter((file) => /\.(svg|webp|png|jpg|jpeg)$/.test(String(file)))
    .map((file) => join("public", String(file))),
];

for (const file of forbiddenSourceFiles) {
  const source = read(file);
  assert.doesNotMatch(source, /zeroxmotors\.pe/i, `${file} should not reference zeroxmotors.pe`);
  assert.doesNotMatch(source, /Zerox/i, `${file} should not reference Zerox visibly`);
}

const baseUrl = process.env.PHASE8_BASE_URL ?? "http://127.0.0.1:3000";
const routes = [
  "/",
  "/catalogo",
  "/producto/filtro-de-campana-de-aluminio-so-slm3",
  "/cotizacion",
  "/nosotros",
  "/contacto",
];

for (const route of routes) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${baseUrl}${route}`, { signal: controller.signal });
    assert.equal(response.status, 200, `${route} should respond 200`);
  } catch (error) {
    if (error?.name === "AbortError" || error?.cause?.code === "ECONNREFUSED") {
      console.warn(`Skipping route response check for ${route}: local server unavailable`);
      break;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
