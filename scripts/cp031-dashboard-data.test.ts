import assert from "node:assert/strict";
import test from "node:test";
import { financialMetrics, fillSalesSeries } from "@/lib/operations-dashboard";

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
