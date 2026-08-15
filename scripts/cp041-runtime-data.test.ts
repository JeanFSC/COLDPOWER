import assert from "node:assert/strict";
import test from "node:test";
import { getCmsPage, getCmsRevisions } from "../src/lib/cms-repository";
import { getMediaPage } from "../src/lib/media-repository";

test("cms: consultas reales mantienen contratos de página y revisiones", async () => {
  const page = await getCmsPage("home");
  assert.ok(page === null || (page.page.slug === "home" && Array.isArray(page.blocks) && Array.isArray(page.history)));
  const revisions = await getCmsRevisions("home", 1, 10);
  assert.ok(Array.isArray(revisions.items));
  assert.equal(typeof revisions.totalItems, "number");
});

test("media: consulta paginada real mantiene métricas y filtros", async () => {
  const result = await getMediaPage({ query: "__cp041_nonexistent__", page: 1, pageSize: 10 });
  assert.equal(result.items.length, 0);
  assert.equal(result.totalItems, 0);
  assert.equal(typeof result.metrics.totalBytes, "number");
  assert.ok(Array.isArray(result.facets.mimeTypes));
});
