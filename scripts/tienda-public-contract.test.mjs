import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");
const exists = (file) => existsSync(join(root, file));

test("cabecera única mantiene búsqueda, cuenta, cotización y carrito", () => {
  const header = read("src/components/layout/Header.tsx");
  const cart = read("src/components/cart/CartButton.tsx");
  const quote = read("src/components/cart/QuoteListButton.tsx");
  assert.match(header, /BrandLogo/);
  assert.match(header, /SearchBar/);
  assert.match(header, /QuoteListButton/);
  assert.match(header, /CartButton/);
  assert.match(header, /Mi cuenta/);
  assert.match(header, /isHome/);
  assert.match(cart, /bg-brand-secondary-600/);
  assert.match(quote, /bg-brand-secondary-600/);
  assert.match(cart, /item\.purchasable/);
});

test("home prioriza búsqueda real y no conserva copy decorativo", () => {
  const hero = read("src/components/home/Hero.tsx");
  assert.match(hero, /Encuentra tu repuesto por código/);
  assert.match(hero, /submitLabel="Buscar"/);
  assert.match(hero, /R404A|Embraco|6871JB1103H/);
  assert.doesNotMatch(hero, /La potencia que mantiene|Repuestos para un mayor maÃ±ana|Repuestos para un mayor mañana/);
  assert.ok(exists("public/images/home/hero-tecnico-hvac.webp"));
  assert.ok(exists("public/images/home/hero-tecnico-hvac-mobile.webp"));
});

test("tarjetas muestran identidad comercial y una sola CTA", () => {
  for (const file of ["src/components/catalog/ProductCard.tsx", "src/components/home/HomeProductCard.tsx"]) {
    const source = read(file);
    assert.doesNotMatch(source, /use client/);
    assert.match(source, /SKU:/);
    assert.match(source, /criticalSpec/);
    assert.match(source, /AddToCartButton/);
    assert.match(source, /AddToQuoteButton/);
    assert.doesNotMatch(source, /Ver ficha/);
  }
  assert.match(read("src/components/catalog/ProductGrid.tsx"), /grid-cols-2/);
});

test("catálogo aplica orden en servidor y conserva densidad responsive", () => {
  const catalog = read("src/app/catalogo/page.tsx");
  const category = read("src/app/categoria/[slug]/page.tsx");
  assert.match(catalog, /CatalogHero/);
  assert.match(catalog, /sort:\s*filters\.sort/);
  assert.match(catalog, /aplicacion/);
  assert.match(category, /getCatalogBrandsForCategory/);
  assert.match(category, /sort:\s*filters\.sort/);
  assert.match(read("src/components/catalog/ProductGrid.tsx"), /2xl:grid-cols-4/);
  assert.match(read("src/components/catalog/CatalogHero.tsx"), /min-h-\[206px\]|h-\[206px\]/);
});

test("SKU exacto redirige a ficha y la ficha tiene SEO de producto", () => {
  const search = read("src/app/buscar/page.tsx");
  const productPage = read("src/app/producto/[slug]/page.tsx");
  const identity = read("src/components/product/TechnicalIdentity.tsx");
  const transaction = read("src/components/product/TransactionBox.tsx");
  assert.match(search, /getCatalogProductBySku/);
  assert.match(search, /redirect\(/);
  assert.match(productPage, /cache\(/);
  assert.match(productPage, /application\/ld\+json/);
  assert.match(productPage, /BreadcrumbList/);
  assert.match(productPage, /offers:/);
  assert.match(identity, /filter\(\(spec\) => spec\.label.*spec\.value/);
  assert.match(transaction, /hasPrice/);
  assert.match(transaction, /Agregar al carrito/);
  assert.match(transaction, /Solicitar cotización/);
  assert.match(transaction, /Solo cotizable/);
});

test("carrito separa compra real de referencias cotizables", () => {
  const cart = read("src/components/shopping-cart/CartPageView.tsx");
  assert.match(cart, /purchasableItems/);
  assert.match(cart, /unitPrice !== null/);
  assert.match(cart, /Envío: por coordinar/);
  assert.match(cart, /window\.confirm/);
  assert.match(cart, /Referencias para cotizar/);
  assert.doesNotMatch(cart, /precio por confirmar|precio por confirmar/i);
});

test("páginas informativas y estados públicos son recuperables", () => {
  assert.match(read("src/app/faq/page.tsx"), /Preguntas frecuentes/);
  assert.match(read("src/app/nosotros/page.tsx"), /timeline|Cómo trabajamos/);
  assert.match(read("src/app/libro-de-reclamaciones/page.tsx"), /ComplaintsForm|Canal habilitado/);
  assert.match(read("src/app/not-found.tsx"), /SearchBar|categor/);
  assert.ok(exists("src/app/loading.tsx"));
  assert.ok(exists("src/app/error.tsx"));
  assert.ok(exists("src/app/global-error.tsx"));
  assert.ok(exists("src/app/api/libro-de-reclamaciones/route.ts"));
  assert.ok(exists("src/lib/public-complaint-service.ts"));
});

test("imágenes públicas optimizadas y logo real están disponibles", () => {
  const assets = [
    "public/brand/logo-coldpower-lockup.webp",
    "public/brand/logo-coldpower-lockup-light.webp",
    "public/images/home/hero-tecnico-hvac.webp",
    "public/images/categories/refrigeracion.webp",
    "public/images/products/product-placeholder.webp",
    "public/images/og/og-tienda.webp",
  ];
  for (const asset of assets) {
    assert.ok(exists(asset), `${asset} should exist`);
    assert.ok(statSync(join(root, asset)).size <= 250_000, `${asset} should stay below 250 KB`);
  }
});

test("accesibilidad pública conserva skip link, un main y movimiento reducible", () => {
  assert.match(read("src/components/layout/AppChrome.tsx"), /Saltar al contenido/);
  assert.match(read("src/app/globals.css"), /prefers-reduced-motion/);
  assert.match(read("src/app/globals.css"), /cp-reveal/);
  assert.match(read("src/components/shared/Reveal.tsx"), /IntersectionObserver/);
  for (const file of ["src/components/contact/ContactPage.tsx", "src/app/faq/page.tsx", "src/app/nosotros/page.tsx", "src/components/product/ProductDetail.tsx"]) {
    assert.doesNotMatch(read(file), /<main[\s>]/, `${file} should not nest main`);
  }
});
