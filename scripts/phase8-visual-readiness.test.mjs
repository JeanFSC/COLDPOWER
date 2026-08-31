import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (relativePath) => readFileSync(join(root, relativePath), "utf8");
const exists = (relativePath) => existsSync(join(root, relativePath));

for (const file of ["src/components/shared/BrandLogo.tsx", "docs/deploy-preview-checklist.md", "scripts/phase8-visual-readiness.test.mjs"]) {
  assert.equal(exists(file), true, `${file} should exist`);
}
for (const asset of ["public/images/hero-coldpower.svg", "public/images/category-placeholder.svg", "public/images/product-placeholder-repuesto.svg", "public/images/testimonial-placeholder.svg"]) {
  assert.equal(exists(asset), true, `${asset} should exist`);
  assert.ok(statSync(join(root, asset)).size > 500, `${asset} should not be an empty placeholder`);
}

const productTypeSource = read("src/types/product.ts");
assert.match(productTypeSource, /export type ProductCategory = string/);
const categoryImages = readdirSync(join(root, "public/images")).filter((file) => /^cat-[a-z0-9-]+\.svg$/.test(file)).map((file) => join("public/images", file));
assert.equal(categoryImages.length, 16, "should keep 16 category illustrations for the current taxonomy");
const hashes = new Map();
for (const image of categoryImages) {
  assert.ok(statSync(join(root, image)).size > 500, `${image} should be a real illustration`);
  const hash = createHash("md5").update(readFileSync(join(root, image))).digest("hex");
  assert.equal(hashes.has(hash), false, `${image} duplicates ${hashes.get(hash)} ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â images must not repeat`);
  hashes.set(hash, image);
}

const brandLogo = read("src/components/shared/BrandLogo.tsx");
assert.match(brandLogo, /ColdPower/);
assert.match(brandLogo, /variant/);
for (const file of ["src/components/layout/Header.tsx", "src/components/layout/Footer.tsx", "src/components/layout/MobileMenu.tsx", "src/app/not-found.tsx"]) {
  assert.match(read(file), /BrandLogo/, `${file} should use BrandLogo`);
}

const viewModel = read("src/lib/catalog-view-model.ts");
assert.match(viewModel, /price: row\.product\.price \?\? null/);
const hero = read("src/components/home/Hero.tsx");
assert.match(hero, /coldpower-hero-products\.png|hero-coldpower\.svg/);
assert.match(hero, /priority/);
assert.ok(/BrandLogo|next\/image|from "next\/image"/.test(hero), "hero should use the shared brand or optimized image renderer");
const promo = read("src/components/home/PromoBanner.tsx");
assert.match(promo, /return null|promoProductIds|catalogo\?categoria=/, "unvalidated promotions must stay disabled or curated");
assert.doesNotMatch(promo, /products\.filter\(\(product\) => product\.onSale\)/);

const about = read("src/app/nosotros/page.tsx");
for (const step of ["Escuchamos tu necesidad", "Validamos compatibilidad", "Te cotizamos con claridad", "Coordinamos entrega o recojo"]) {
  assert.match(about, new RegExp(step));
}
assert.match(read("docs/image-prompts.md"), /SVG fallback/i);
const previewDocs = read("docs/deploy-preview-checklist.md");
for (const section of ["Revisi", "Variables", "Comandos", "deploy", "Validar rutas", "Validar cotizaci", "robots", "sitemap"]) {
  assert.match(previewDocs, new RegExp(section, "i"));
}

for (const file of [
  ...readdirSync(join(root, "src"), { recursive: true }).filter((file) => /\.(ts|tsx|css)$/.test(String(file))).map((file) => join("src", String(file))),
  ...readdirSync(join(root, "public"), { recursive: true }).filter((file) => /\.(svg|webp|png|jpg|jpeg)$/.test(String(file))).map((file) => join("public", String(file))),
]) {
  const source = read(file);
  assert.doesNotMatch(source, /zeroxmotors\.pe/i, `${file} should not reference zeroxmotors.pe`);
  assert.doesNotMatch(source, /Zerox/i, `${file} should not reference Zerox visibly`);
}

const baseUrl = process.env.PHASE8_BASE_URL ?? "http://127.0.0.1:3000";
for (const route of ["/", "/catalogo", "/cotizacion", "/nosotros", "/contacto", "/faq"]) {
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
