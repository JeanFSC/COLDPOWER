import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("public UI contract follows the approved storefront anatomy", async () => {
  const [home, hero, catalog, card, detail, cart] = await Promise.all([
    read("src/app/page.tsx"),
    read("src/components/home/Hero.tsx"),
    read("src/app/catalogo/page.tsx"),
    read("src/components/catalog/ProductCard.tsx"),
    read("src/components/product/TransactionBox.tsx"),
    read("src/components/shopping-cart/CartPageView.tsx"),
  ]);
  assert.match(home, /<Hero\s+settings=\{settings\}\s*\/>/);
  assert.match(hero, /home-espejo\/hero-desktop\.webp/);
  assert.match(hero, /href="\/cotizacion"/);
  assert.match(hero, /href="\/catalogo"/);
  assert.match(catalog, /CatalogHero/);
  assert.match(card, /SKU:|Cód\./);
  assert.doesNotMatch(card, /Ver ficha/);
  assert.match(detail, /Agregar al carrito/);
  assert.match(detail, /Solicitar cotización/);
  assert.match(cart, /Envío: por coordinar/);
});

test("public visual primitives use shared tokens and honest fallbacks", async () => {
  const [globals, button, logo, assistance, complaint] = await Promise.all([
    read("src/app/globals.css"),
    read("src/components/shared/Button.tsx"),
    read("src/components/shared/BrandLogo.tsx"),
    read("src/components/home/AssistanceSection.tsx"),
    read("src/app/libro-de-reclamaciones/page.tsx"),
  ]);
  assert.match(globals, /--cp-container/);
  assert.match(globals, /--warning-dark/);
  assert.match(button, /next\/link/);
  assert.match(button, /startsWith\("\/"\)/);
  assert.match(logo, /logo-coldpower-lockup\.webp/);
  assert.match(assistance, /HomeFaq|home-help-layout|Solicitar ayuda por WhatsApp/i);
  assert.match(complaint, /ComplaintsForm/);
});

test("public copy does not expose infrastructure or invented catalog content", async () => {
  const files = [
    "src/components/home/Hero.tsx",
    "src/components/layout/Footer.tsx",
    "src/components/catalog/ProductCard.tsx",
    "src/components/product/TechnicalIdentity.tsx",
    "src/components/shopping-cart/CartPageView.tsx",
  ];
  const source = (await Promise.all(files.map(read))).join("\n");
  assert.doesNotMatch(source, /precio por confirmar/i);
  assert.doesNotMatch(source, /La potencia que mantiene|Repuestos para un mayor mañana/i);
  assert.doesNotMatch(source, /\bNaN\b|process\.env|DATABASE_URL/);
});
