import assert from "node:assert/strict";
import test from "node:test";
import { getPromotionPage } from "@/lib/promotion-repository";

test("promociones devuelven paginación y cero real para una búsqueda inexistente", async () => {
  const page = await getPromotionPage({ query: "__coldpower_promotion_missing__", page: 1, pageSize: 10 });
  assert.equal(page.totalItems, 0);
  assert.equal(page.items.length, 0);
  assert.equal(page.totalPages, 1);
  assert.equal(page.metrics.total, 0);
});
