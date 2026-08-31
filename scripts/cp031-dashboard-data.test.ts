import assert from "node:assert/strict";
import test from "node:test";
import { dashboardComparisons, financialMetrics, fillSalesSeries } from "@/lib/operations-dashboard";

test("CP-031 complete series keeps zero days", () => {
  const from = new Date("2026-08-10T05:00:00.000Z");
  const to = new Date("2026-08-13T05:00:00.000Z");
  assert.deepEqual(fillSalesSeries({ from, to }, [{ date: "2026-08-11", total: 100, count: 2 }]), [
    { date: "2026-08-10", total: 0, count: 0 },
    { date: "2026-08-11", total: 100, count: 2 },
    { date: "2026-08-12", total: 0, count: 0 },
  ]);
});

test("CP-031 no financial source returns null instead of zero", () => {
  assert.equal(financialMetrics({ revenue: null, costOfSales: null, operatingExpenses: null }).grossProfit, null);
});

test("dashboard comparisons calculate signed percentage changes", () => {
  assert.deepEqual(
    dashboardComparisons({
      sales: { current: 120, previous: 100 },
      quotes: { current: 9, previous: 12 },
      orders: { current: 0, previous: 4 },
      criticalStock: { current: 5, previous: 5 },
    }),
    {
      sales: { current: 120, previous: 100, percentage: 20 },
      quotes: { current: 9, previous: 12, percentage: -25 },
      orders: { current: 0, previous: 4, percentage: -100 },
      criticalStock: { current: 5, previous: 5, percentage: 0 },
    },
  );
});

test("dashboard comparisons return null when the previous period is zero", () => {
  const result = dashboardComparisons({
    sales: { current: 120, previous: 0 },
    quotes: { current: 0, previous: 0 },
    orders: { current: 3, previous: 0 },
    criticalStock: { current: 1, previous: 0 },
  });
  assert.equal(result.sales.percentage, null);
  assert.equal(result.quotes.percentage, null);
  assert.equal(result.orders.percentage, null);
  assert.equal(result.criticalStock.percentage, null);
});
