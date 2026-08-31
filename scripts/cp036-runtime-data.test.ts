import assert from "node:assert/strict";
import test from "node:test";
import { getQuoteDetail, getQuotesPage } from "@/lib/quote-repository";

test("CP-036 runtime devuelve cotizaciones paginadas y métricas coherentes", async () => {
  const page = await getQuotesPage({ page: 1, pageSize: 10 });
  assert.equal(page.page, 1);
  assert.equal(page.pageSize, 10);
  assert.equal(page.totalPages, Math.max(1, Math.ceil(page.totalItems / page.pageSize)));
  assert.equal(page.metrics.total, page.totalItems);
  assert.equal(page.metrics.conversionRate === null || typeof page.metrics.conversionRate === "number", true);
  assert.ok(page.items.length <= page.pageSize);
});

test("CP-036 runtime permite búsqueda por tracking code y detalle histórico", async () => {
  const first = await getQuotesPage({ page: 1, pageSize: 1 });
  if (!first.items[0]) return;
  const filtered = await getQuotesPage({ query: first.items[0].trackingCode, page: 1, pageSize: 10 });
  assert.ok(filtered.totalItems >= 1);
  assert.ok(filtered.items.every((item) => item.trackingCode === first.items[0].trackingCode));
  const detail = await getQuoteDetail(first.items[0].id);
  assert.ok(detail);
  assert.equal(detail.quote.id, first.items[0].id);
  assert.ok(Array.isArray(detail.items));
  assert.ok(Array.isArray(detail.history));
});
