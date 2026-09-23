import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("header exposes one public commerce shell on desktop and mobile", async () => {
  const [header, mobile, cart, quote] = await Promise.all([
    read("src/components/layout/Header.tsx"),
    read("src/components/layout/MobileMenu.tsx"),
    read("src/components/cart/CartButton.tsx"),
    read("src/components/cart/QuoteListButton.tsx"),
  ]);
  for (const token of ["BrandLogo", "SearchBar", "QuoteListButton", "CartButton", "Mi cuenta"]) assert.match(header, new RegExp(token));
  assert.match(header, /isHome/);
  assert.match(mobile, /role="dialog"/);
  assert.match(mobile, /Escape|keydown/);
  assert.match(cart, /bg-brand-secondary-600/);
  assert.match(quote, /bg-brand-secondary-600/);
});

test("footer remains public and points to legal support", async () => {
  const footer = await read("src/components/layout/Footer.tsx");
  assert.match(footer, /Categor/);
  assert.match(footer, /Ayuda|Contacto/);
  assert.match(footer, /libro-de-reclamaciones/);
  assert.match(footer, /BrandLogo/);
});

