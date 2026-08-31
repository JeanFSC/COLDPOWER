import assert from "node:assert/strict";
import test from "node:test";
import { getPipelineDetail, getPipelinePage } from "@/lib/pipeline-repository";

test("CP-035 runtime devuelve pipeline paginado con métricas coherentes", async () => {
  const page = await getPipelinePage({ page: 1, pageSize: 10 });
  assert.equal(page.page, 1);
  assert.equal(page.pageSize, 10);
  assert.equal(page.totalPages, Math.max(1, Math.ceil(page.totalItems / page.pageSize)));
  assert.equal(page.metrics.total, page.totalItems);
  assert.equal(page.metrics.byStage.length > 0, true);
  assert.equal(page.metrics.conversionRate === null || typeof page.metrics.conversionRate === "number", true);
  assert.ok(page.items.length <= page.pageSize);
});

test("CP-035 runtime aplica búsqueda y detalle de oportunidad sin mutar datos", async () => {
  const first = await getPipelinePage({ page: 1, pageSize: 1 });
  if (!first.items[0]) return;
  const filtered = await getPipelinePage({ query: first.items[0].code, page: 1, pageSize: 10 });
  assert.ok(filtered.totalItems >= 1);
  assert.ok(filtered.items.every((item) => item.code === first.items[0].code));
  const detail = await getPipelineDetail(first.items[0].id);
  assert.ok(detail);
  assert.equal(detail.opportunity.id, first.items[0].id);
  assert.ok(Array.isArray(detail.stageHistory));
  assert.ok(Array.isArray(detail.tasks));
  assert.ok(Array.isArray(detail.followUps));
});
