import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

test("cotización no oculta fallos de búsqueda ni del carrito persistente", async () => {
  const form = await read("src/components/quote/QuoteForm.tsx");
  const provider = await read("src/components/cart/CartProvider.tsx");
  const panel = await read("src/components/cart/CartQuotePanel.tsx");

  assert.match(form, /searchError/);
  assert.match(form, /Reintentar/);
  assert.match(form, /role="alert"/);
  assert.match(provider, /syncStatus/);
  assert.match(provider, /retrySync/);
  assert.match(provider, /El carrito no pudo sincronizarse/);
  assert.match(panel, /syncStatus/);
  assert.match(panel, /retrySync/);
});
