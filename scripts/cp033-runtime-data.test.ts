import assert from "node:assert/strict";
import test from "node:test";
import { getPricingHistoryPage, getPricingPage } from "@/lib/pricing-repository";

test("CP-033 runtime devuelve productos sin precio y contrato de paginación", async () => {
  const page = await getPricingPage({ page: 1, pageSize: 12 }, { includeCost: false });
  assert.equal(page.page, 1);
  assert.equal(page.pageSize, 12);
  assert.ok(page.totalItems >= 1000, `se esperaban al menos 1000 productos, llegaron ${page.totalItems}`);
  assert.equal(page.totalPages, Math.max(1, Math.ceil(page.totalItems / page.pageSize)));
  assert.equal(page.items.length, Math.min(page.pageSize, page.totalItems));
  assert.ok("metrics" in page);
  assert.ok("facets" in page);
  assert.ok(page.metrics.totalWithPrice + page.metrics.totalWithoutPrice >= page.totalItems);
  for (const item of page.items) {
    assert.ok(item.productId);
    assert.ok(item.sku);
    assert.ok(Array.isArray(item.prices));
    assert.ok(item.price === null || item.price.priceType !== "COST");
  }
});

test("CP-033 runtime aplica búsqueda server-side y mantiene historial paginado", async () => {
  const first = await getPricingPage({ page: 1, pageSize: 1 }, { includeCost: false });
  assert.ok(first.items[0]);
  const filtered = await getPricingPage({ sku: first.items[0].sku, page: 1, pageSize: 12 }, { includeCost: false });
  assert.ok(filtered.totalItems >= 1);
  assert.ok(filtered.items.every((item) => item.sku.includes(first.items[0].sku)));
  const history = await getPricingHistoryPage({ page: 1, pageSize: 5 }, { includeCost: false });
  assert.equal(history.page, 1);
  assert.equal(history.pageSize, 5);
  assert.ok(Array.isArray(history.items));
  assert.ok(history.totalPages >= 1);
  for (const entry of history.items) assert.notEqual(entry.priceType, "COST");
});
