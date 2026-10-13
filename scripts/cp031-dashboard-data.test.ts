import assert from "node:assert/strict";
import test from "node:test";
import { dashboardComparisons, financialMetrics, fillSalesSeries } from "@/lib/operations-dashboard";
import { readFileSync } from "node:fs";
import { dashboardSalesHref, parseDashboardSalesScope } from "@/lib/dashboard-sales-navigation";
import { parseSalesFilters } from "@/lib/sales-contract";

test("dashboard drilldown preserves every scope filter and clips weekly buckets to the visible range", () => {
  const filters = { range: "month" as const, customerId: "c&1", sellerId: "s=2", locationId: "l", productId: "p", categoryId: "cat", familyId: "f", brandId: "b", channel: "WHATSAPP", orderStatus: "PAID" };
  const query = new URL(dashboardSalesHref(filters, "2026-10-05", "week", { from: new Date("2026-10-07T05:00:00Z"), to: new Date("2026-10-10T05:00:00Z") }, "PEN"), "http://localhost").searchParams;
  const parsed = parseSalesFilters(query);
  assert.equal(parsed.customerId, "c&1");
  assert.equal(parsed.sellerId, "s=2");
  assert.equal(parsed.status, "CONFIRMED");
  assert.equal(parsed.createdFrom, "2026-10-07");
  assert.equal(parsed.createdTo, "2026-10-09");
  for (const [key, value] of Object.entries(filters)) assert.equal(parsed.dashboardScope?.filters[key as keyof typeof filters], value);
  assert.equal(parsed.dashboardScope?.from, "2026-10-07T05:00:00.000Z");
  assert.equal(parsed.dashboardScope?.to, "2026-10-10T05:00:00.000Z");
  assert.equal(parsed.dashboardScope?.currency, "PEN");
});

test("dashboard drilldown spans a full week/month and retains exact Lima hour boundaries", () => {
  const range = { from: new Date("2026-01-01T05:00:00Z"), to: new Date("2027-01-01T05:00:00Z") };
  const scope = (point: string, granularity: "hour" | "week" | "month") => parseSalesFilters(new URL(dashboardSalesHref({}, point, granularity, range), "http://localhost").searchParams).dashboardScope!;
  assert.equal(scope("2026-10-05", "week").to, "2026-10-12T05:00:00.000Z");
  assert.equal(scope("2026-02-01", "month").to, "2026-03-01T05:00:00.000Z");
  assert.equal(scope("2026-10-10T23:00", "hour").from, "2026-10-11T04:00:00.000Z");
  assert.equal(scope("2026-10-10T23:00", "hour").to, "2026-10-11T05:00:00.000Z");
});

test("dashboard drilldown rejects malformed or reversed scope", () => {
  assert.equal(parseDashboardSalesScope(null), undefined);
  for (const raw of ["{}", "null", "{", JSON.stringify({ filters: {}, from: "2026-10-11T05:00:00.000Z", to: "2026-10-10T05:00:00.000Z" }), JSON.stringify({ filters: { customerId: {} }, from: "2026-10-10T05:00:00.000Z", to: "2026-10-11T05:00:00.000Z" })]) assert.throws(() => parseSalesFilters(new URLSearchParams({ dashboardScope: raw })), /SALES_INVALID_FILTER/);
});

test("dashboard retains sales without a seller and supplies a non-null display name", () => {
  const source = readFileSync("src/lib/operations-dashboard.ts", "utf8");
  assert.ok(source.includes("coalesce(nullif(trim(${users.name}), ''), nullif(trim(${users.email}), ''), 'Sin vendedor asignado')"));
  assert.ok(source.includes(".leftJoin(users, eq(sales.sellerId, users.id))"));
});

test("dashboard payment activity opens the payment detail instead of filtering by an unrelated order", () => {
  const source = readFileSync("src/components/admin/AdminTanda2Workspaces.tsx", "utf8");
  assert.match(source, /activity\.entityType === "payment"\) return `\/admin\/pagos\?paymentId=\$\{entityId\}`/);
});

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
      orders: { current: 0, previous: 4, percentage: null },
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
  assert.equal(result.quotes.percentage, 0);
  assert.equal(result.orders.percentage, null);
  assert.equal(result.criticalStock.percentage, null);
});
