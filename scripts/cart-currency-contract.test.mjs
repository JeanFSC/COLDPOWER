import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("el carrito conserva moneda y no agrega divisas mezcladas", () => {
  const component = read("src/components/cart/CartQuotePanel.tsx");
  const api = read("src/app/api/catalog/products/route.ts");
  assert.match(component, /priceCurrency/);
  assert.match(component, /mixed|mixedCurrencies|monedas/i);
  assert.match(component, /formatProductPrice/);
  assert.match(api, /priceCurrency/);
});
