import assert from "node:assert/strict";
import test from "node:test";
import { closeDb } from "../src/db";
import { getCatalogProducts, normalizeCatalogSearchTerm } from "../src/lib/catalog-repository";

test("R2 busca contra el catálogo PostgreSQL local y conserva SKU tras normalizar", async (t) => {
  if (process.env.DATABASE_DRIVER !== "pg") {
    t.skip("Este comportamiento debe verificarse contra PostgreSQL local (DATABASE_DRIVER=pg).");
    return;
  }

  try {
    const firstPage = await getCatalogProducts({ page: 1, pageSize: 48 });
    assert.ok(firstPage.total > 0, "El catálogo local debe tener productos publicados para la prueba.");
    const product = firstPage.products[0];
    assert.ok(product?.sku, "El producto real debe conservar SKU.");

    const compactSku = normalizeCatalogSearchTerm(product.sku);
    assert.ok(compactSku.length > 0);
    const skuResults = await getCatalogProducts({ query: compactSku, pageSize: 48 });
    assert.ok(skuResults.products.some((candidate) => candidate.id === product.id), "La búsqueda normalizada debe encontrar el SKU real.");

    const [compactMicro, spacedMicro, greekMicro] = await Promise.all([
      getCatalogProducts({ query: "35uF", pageSize: 48 }),
      getCatalogProducts({ query: "35 uF", pageSize: 48 }),
      getCatalogProducts({ query: "35μF", pageSize: 48 }),
    ]);
    assert.deepEqual(compactMicro.products.map((item) => item.id), spacedMicro.products.map((item) => item.id));
    assert.deepEqual(compactMicro.products.map((item) => item.id), greekMicro.products.map((item) => item.id));
  } finally {
    await closeDb();
  }
});
