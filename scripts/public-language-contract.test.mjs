import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const publicFiles = [
  "src/app/catalogo/page.tsx",
  "src/app/buscar/page.tsx",
  "src/app/categoria/[slug]/page.tsx",
  "src/app/producto/[slug]/page.tsx",
  "src/app/comparar/page.tsx",
  "src/app/cotizacion/page.tsx",
  "src/components/catalog/CatalogUnavailable.tsx",
  "src/components/cart/CartQuotePanel.tsx",
  "src/app/cuenta/carrito/page.tsx",
  "src/components/quote/QuoteForm.tsx",
  "src/components/home/BrandsSection.tsx",
  "src/app/nosotros/page.tsx",
];

test("la interfaz publica no expone lenguaje de infraestructura", async () => {
  for (const file of publicFiles) {
    const source = await readFile(path.join(root, file), "utf8");
    const visibleSource = source.split(/\r?\n/).filter((line) => !line.includes("console.")).join("\n");
    assert.doesNotMatch(visibleSource, /catálogo persistente|catalogo persistente|referencias importadas|registro persistente|snapshot.*persist/i, file);
    assert.doesNotMatch(visibleSource, /V1 digital|catálogo referencial/i, file);
  }
});
