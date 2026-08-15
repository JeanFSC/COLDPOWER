import assert from "node:assert/strict";
import test from "node:test";
import { getTaxonomyPage } from "../src/lib/taxonomy-admin";

test("taxonomía: páginas reales devuelven métricas y conteos", async () => {
  for (const entity of ["categories", "families", "brands"] as const) {
    const result = await getTaxonomyPage({ entity, query: "__cp047_taxonomy_that_should_not_exist__", page: 1, pageSize: 10 });
    assert.equal(result.totalItems, 0);
    assert.equal(result.metrics.total, 0);
    assert.equal(result.metrics.used, 0);
    assert.ok(Array.isArray(result.items));
  }
});
