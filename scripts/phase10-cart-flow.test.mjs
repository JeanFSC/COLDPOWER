import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import ts from "typescript";

const root = process.cwd();
const require = createRequire(import.meta.url);

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return existsSync(join(root, relativePath));
}

const cartLibPath = "src/lib/cart.ts";
assert.equal(exists(cartLibPath), true, "cart lib should exist");

const source = read(cartLibPath);
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const testModule = { exports: {} };
const sandbox = {
  exports: testModule.exports,
  module: testModule,
  require,
};
vm.runInNewContext(transpiled, sandbox, { filename: cartLibPath });

const {
  addCartItem,
  updateCartItemQuantity,
  removeCartItem,
  getCartTotalQuantity,
  buildCartQuoteMessage,
} = sandbox.module.exports;

let cart = [];
cart = addCartItem(cart, "prod-split-carrier-12000btu");
cart = addCartItem(cart, "prod-split-carrier-12000btu");
cart = addCartItem(cart, "prod-valvula-sporlan", 3);

assert.equal(
  JSON.stringify(cart),
  JSON.stringify([
    { productId: "prod-split-carrier-12000btu", quantity: 2 },
    { productId: "prod-valvula-sporlan", quantity: 3 },
  ]),
  "adding duplicate products should increment quantity without duplicating rows",
);
assert.equal(getCartTotalQuantity(cart), 5, "cart badge count should sum item quantities");

cart = updateCartItemQuantity(cart, "prod-valvula-sporlan", -2);
assert.equal(
  JSON.stringify(cart),
  JSON.stringify([{ productId: "prod-split-carrier-12000btu", quantity: 2 }]),
  "updating to a non-positive quantity should remove the item",
);

cart = removeCartItem(cart, "prod-split-carrier-12000btu");
assert.equal(JSON.stringify(cart), "[]", "removing the last item should leave an empty cart");

const quoteMessage = buildCartQuoteMessage([
  {
    productId: "prod-termostato-itc1000",
    quantity: 2,
    name: "Termostato digital universal ITC-1000",
    sku: "CP-TER-ITC-1000",
  },
]);
assert.match(
  quoteMessage,
  /2 x Termostato digital universal ITC-1000/,
  "cart WhatsApp message should include quantities",
);
assert.match(quoteMessage, /CP-TER-ITC-1000/, "cart WhatsApp message should include SKU");

for (const file of [
  "src/components/cart/CartProvider.tsx",
  "src/components/cart/CartButton.tsx",
  "src/components/cart/AddToCartButton.tsx",
  "src/components/cart/CartQuotePanel.tsx",
]) {
  assert.equal(exists(file), true, `${file} should exist`);
}

const header = read("src/components/layout/Header.tsx");
assert.match(header, /CartButton/, "Header should render the real cart button");
assert.doesNotMatch(
  header,
  /aria-label="Ver cotizaciÃ³n"[\s\S]*ShoppingBag/,
  "Header should not keep the cart icon as a static quote link",
);

const productCard = read("src/components/catalog/ProductCard.tsx");
const productDetail = read("src/components/product/ProductDetail.tsx");
const quotePage = read("src/app/cotizacion/page.tsx");

assert.match(productCard, /AddToCartButton/, "Product cards should allow adding to cart");
assert.match(productDetail, /AddToCartButton/, "Product detail should allow adding to cart");
assert.match(quotePage, /CartQuotePanel/, "Quote page should render the cart panel");
