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
  assert.ok(data.unknownStock < 20, `unknownStock too large: ${data.unknownStock}`);
  assert.ok(data.noMovement < 20, `noMovement too large: ${data.noMovement}`);
});

test("CP-031 runtime dashboard exposes truthful period comparisons", async () => {
  const data = await getOperationsDashboard({ range: "month" }, { role: "SUPERADMIN" });
  assert.deepEqual(Object.keys(data.comparisons).sort(), ["criticalStock", "orders", "quotes", "sales"]);
  for (const key of ["sales", "quotes", "orders", "criticalStock"] as const) {
    assert.equal(typeof data.comparisons[key].current, "number");
    assert.equal(typeof data.comparisons[key].previous, "number");
    assert.ok(data.comparisons[key].percentage === null || typeof data.comparisons[key].percentage === "number");
  }
});

test("CP-031 development fixture populates every dashboard widget with real catalog products", async () => {
  const data = await getOperationsDashboard({ range: "month" }, { role: "SUPERADMIN" });
  assert.ok(data.salesRange.count >= 60, `expected large-company current sales volume, got ${data.salesRange.count}`);
  assert.ok(data.previousSalesSeries.some((point) => point.total > 0));
  assert.ok(data.comparisons.sales.previous > 0, "previous month sales must be populated");
  assert.ok(data.quotes >= 30, `expected current quotes, got ${data.quotes}`);
  assert.ok(data.opportunities >= 30, `expected current opportunities, got ${data.opportunities}`);
  assert.ok(data.orders.total >= 30, `expected current orders, got ${data.orders.total}`);
  assert.ok(data.pendingPayments >= 10, `expected pending payments, got ${data.pendingPayments}`);
  assert.ok(data.pipelineSummary.some((stage) => stage.stage === "NEGOTIATION"));
  assert.ok(data.topProducts.length > 0);
  assert.ok(data.recentActivity.length >= 8, `expected recent activity widget data, got ${data.recentActivity.length}`);
  assert.ok(data.userSummary.reduce((total, row) => total + row.count, 0) >= 12, "expected a larger active team");
  assert.ok(data.topProducts.every((product) => !/QA|universal/i.test(product.name)));
  assert.ok(data.userSummary.every((row) => row.roleLabel !== row.roleCode && row.statusLabel !== row.statusCode));
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
