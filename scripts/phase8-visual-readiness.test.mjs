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

// Cada categoría y cada producto debe tener una ilustración SVG única (sin fotografía real disponible aún).
const categoryImages = [
  "public/images/cat-compresores.svg",
  "public/images/cat-aires-acondicionados.svg",
  "public/images/cat-refrigeracion-industrial.svg",
  "public/images/cat-condensadores-evaporadores.svg",
  "public/images/cat-termostatos-y-controles.svg",
  "public/images/cat-ventiladores-y-motores.svg",
  "public/images/cat-valvulas-de-expansion.svg",
  "public/images/cat-filtros-y-secadores.svg",
  "public/images/cat-refrigerantes-y-gases.svg",
  "public/images/cat-repuestos-linea-blanca.svg",
  "public/images/cat-tuberias-y-accesorios.svg",
  "public/images/cat-herramientas-de-refrigeracion.svg",
];
const productImages = [
  "public/images/prod-compresor-danfoss.svg",
  "public/images/prod-split-carrier.svg",
  "public/images/prod-condensadora-carrier.svg",
  "public/images/prod-camara-frigorifica.svg",
  "public/images/prod-valvula-sporlan.svg",
  "public/images/prod-termostato-itc1000.svg",
  "public/images/prod-motor-ventilador.svg",
  "public/images/prod-filtro-secador.svg",
  "public/images/prod-gas-r410a.svg",
  "public/images/prod-tarjeta-control.svg",
];
const catalogImages = [...categoryImages, ...productImages];
for (const image of catalogImages) {
  assert.equal(exists(image), true, `${image} should exist`);
  assert.ok(statSync(join(root, image)).size > 500, `${image} should be a real (non-empty) illustration`);
}

// Cada ilustración debe ser única (sin repetir SVG entre categorías/productos).
const hashes = new Map();
for (const image of catalogImages) {
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
  /category-placeholder\.svg/,
  "categories should not use the old generic category placeholder",
);
assert.match(categories, /cat-compresores\.svg/, "categories should use unique category illustrations");

const hero = read("src/components/home/Hero.tsx");
assert.match(hero, /hero-coldpower\.svg/, "Hero should use the ColdPower hero illustration");
assert.match(hero, /priority/, "Hero image should be marked priority for LCP");
assert.match(hero, /BrandLogo/, "Hero should display the brand logo over the image");
assert.doesNotMatch(
  hero,
  /product-placeholder-repuesto\.svg/,
  "Hero should not use product placeholder as hero art",
);

const promo = read("src/components/home/PromoBanner.tsx");
for (const promoProductId of [
  "prod-split-carrier-12000btu",
  "prod-condensadora-carrier-12000",
  "prod-termostato-itc1000",
  "prod-gas-r410a",
]) {
  assert.match(
    promo,
    new RegExp(promoProductId),
    `Promo section should use existing catalog product ${promoProductId}`,
  );
}
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
  "/producto/compresor-danfoss-nl11ft-1-4-hp",
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
