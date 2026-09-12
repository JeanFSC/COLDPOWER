import assert from "node:assert/strict";
import test from "node:test";
import { getCustomer360, getCustomersPage } from "@/lib/customer-repository";

test("CP-034 runtime devuelve clientes paginados y métricas globales", async () => {
  const page = await getCustomersPage({ page: 1, pageSize: 12 });
  assert.equal(page.page, 1);
  assert.equal(page.pageSize, 12);
  assert.equal(page.totalPages, Math.max(1, Math.ceil(page.totalItems / page.pageSize)));
  assert.ok(page.items.length <= page.pageSize);
  assert.equal(page.metrics.total, page.totalItems);
  assert.ok(Array.isArray(page.facets.customerTypes));
  assert.ok(Array.isArray(page.facets.statuses));
  for (const item of page.items) {
    assert.ok(item.id);
    assert.ok(item.name);
    assert.equal(typeof item.quoteCount, "number");
    assert.equal(typeof item.openOpportunityCount, "number");
    assert.equal(typeof item.orderCount, "number");
  }
});

test("CP-034 runtime mantiene relaciones independientes en el 360", async () => {
  const page = await getCustomersPage({ page: 1, pageSize: 1 });
  if (!page.items[0]) return;
  const detail = await getCustomer360(page.items[0].id, { pageSize: 1 }, { includeFinancial: false });
  assert.ok(detail);
  assert.equal(detail.customer.id, page.items[0].id);
  assert.equal(detail.quotes.pageSize, 1);
  assert.equal(detail.opportunities.pageSize, 1);
  assert.ok(detail.orders);
  assert.equal(detail.orders.pageSize, 1);
  assert.equal(detail.activities.pageSize, 1);
  assert.equal(detail.tasks.pageSize, 1);
  assert.equal(detail.sales, null);
  assert.equal(detail.payments, null);
});
