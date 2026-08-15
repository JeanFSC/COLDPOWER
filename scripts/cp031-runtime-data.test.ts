import assert from "node:assert/strict";
import test from "node:test";
import { getAdminCatalogPage, getAdminCatalogProductDetail } from "@/lib/catalog-admin-service";
import { getOperationsDashboard } from "@/lib/operations-dashboard";

test("CP-031 runtime dashboard preserves the frontend contract", async () => {
  const data = await getOperationsDashboard({ range: "month" }, { role: "SUPERADMIN" });
  for (const field of ["salesSeries", "previousSalesSeries", "pipelineSummary", "userSummary", "recentActivity", "unknownStock"] as const) {
    assert.ok(field in data, `missing ${field}`);
  }
  assert.ok(Array.isArray(data.salesSeries));
  assert.ok(Array.isArray(data.previousSalesSeries));
  assert.equal(typeof data.unknownStock, "number");
  assert.equal(data.filters.range, "month");
});

test("CP-031 runtime dashboard masks financial data for REPORTES", async () => {
  const data = await getOperationsDashboard({ range: "month" }, { role: "REPORTES" });
  assert.equal(data.costOfSales, null);
  assert.equal(data.grossProfit, null);
  assert.equal(data.margin, null);
});

test("CP-031 runtime catalog is paginated and exposes global queues", async () => {
  const page = await getAdminCatalogPage({ page: 1, pageSize: 12 });
  assert.ok(page.items.length <= page.pageSize);
  assert.equal(page.totalPages, Math.max(1, Math.ceil(page.totalItems / page.pageSize)));
  assert.ok(page.queues.totalProducts >= page.totalItems);
  assert.ok(Array.isArray(page.facets.categories));
  assert.ok(Array.isArray(page.facets.families));
  assert.ok(Array.isArray(page.facets.brands));
  for (const item of page.items) assert.ok(["AVAILABLE", "LOW", "ZERO", "UNKNOWN"].includes(item.stock.state));
  if (page.items[0]) {
    const filtered = await getAdminCatalogPage({ query: page.items[0].sku, page: 1, pageSize: 1 });
    assert.equal(filtered.queues.totalProducts, page.queues.totalProducts);
    const detail = await getAdminCatalogProductDetail(page.items[0].id, false);
    assert.equal(detail.pricing, null);
    assert.equal(detail.sourceIdentity.sku, page.items[0].sku);
  }
});
