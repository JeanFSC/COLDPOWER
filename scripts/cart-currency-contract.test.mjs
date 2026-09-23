import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

// Currency rules now live in the purchase cart (/carrito); the quote list has no prices.
test("el carrito de compra conserva moneda y no agrega divisas mezcladas", () => {
  const service = read("src/lib/shopping-cart-service.ts");
  const component = read("src/components/shopping-cart/CartPageView.tsx");
  const api = read("src/app/api/catalog/products/route.ts");
  assert.match(service, /MIXED_CURRENCY/);
  assert.match(service, /currency/);
  assert.match(component, /MIXED_CURRENCY/);
  assert.match(component, /formatProductPrice/);
  assert.match(api, /priceCurrency/);
});

test("la lista de cotización no muestra totales ni lleva al checkout", () => {
  const quoteList = read("src/components/cart/CartQuotePanel.tsx");
  assert.doesNotMatch(quoteList, /\/checkout/);
  assert.doesNotMatch(quoteList, /Total referencial/);
});
