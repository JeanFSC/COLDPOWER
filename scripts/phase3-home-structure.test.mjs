import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const requiredFiles = [
  "src/components/home/Hero.tsx",
  "src/components/home/BenefitsBar.tsx",
  "src/components/home/CategoriesGrid.tsx",
  "src/components/home/ProductSection.tsx",
  "src/components/home/PromoBanner.tsx",
  "src/components/home/Testimonials.tsx",
  "src/components/home/FAQ.tsx",
  "src/components/catalog/ProductCard.tsx",
];

for (const file of requiredFiles) {
  assert.equal(existsSync(join(root, file)), true, `${file} should exist`);
}

const page = readFileSync(join(root, "src/app/page.tsx"), "utf8");

for (const component of [
  "Hero",
  "CategoriesGrid",
  "ProductSection",
  "PromoBanner",
  "Testimonials",
  "FAQ",
]) {
  assert.match(page, new RegExp(`<${component}\\b`), `page.tsx should render ${component}`);
}

const faq = readFileSync(join(root, "src/components/home/FAQ.tsx"), "utf8");
assert.match(faq, /aria-expanded/, "FAQ accordion should expose aria-expanded");
assert.match(faq, /aria-controls/, "FAQ accordion should expose aria-controls");

const productCard = readFileSync(join(root, "src/components/catalog/ProductCard.tsx"), "utf8");
assert.match(productCard, /AddToCartButton/, "ProductCard should offer add-to-cart");
assert.match(productCard, /formatProductPrice/, "ProductCard should format PEN prices (or show 'Cotizar' when unset)");

// La conversión por WhatsApp se conserva a nivel de carrito (flujo agregar → cotizar).
const cartQuotePanel = readFileSync(join(root, "src/components/cart/CartQuotePanel.tsx"), "utf8");
assert.match(
  cartQuotePanel,
  /createWhatsAppLink/,
  "Cart quote panel should keep the WhatsApp conversion path",
);
