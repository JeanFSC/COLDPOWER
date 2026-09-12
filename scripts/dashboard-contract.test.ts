import test from "node:test";
import assert from "node:assert/strict";
import { parseDashboardFilters, dashboardFiltersToQuery } from "../src/lib/dashboard-contract";
import { parseOrdersFilters } from "../src/lib/orders-contract";
import { parseQuoteFilters } from "../src/lib/quote-contract";

test("parseDashboardFilters reads currency", () => {
  const params = new URLSearchParams("range=month&currency=USD");
  const filters = parseDashboardFilters(params);
  assert.equal(filters.currency, "USD");
});

test("dashboardFiltersToQuery round-trips currency", () => {
  const query = dashboardFiltersToQuery({ range: "month", currency: "PEN" });
  assert.equal(query.get("currency"), "PEN");
});

test("parseDashboardFilters omits currency when absent", () => {
  const filters = parseDashboardFilters(new URLSearchParams("range=month"));
  assert.equal(filters.currency, undefined);
});

test("parseDashboardFilters validates and preserves chart granularity", () => {
  const filters = parseDashboardFilters(new URLSearchParams("range=month&granularity=week"));
  assert.equal(filters.granularity, "week");
  assert.throws(() => parseDashboardFilters(new URLSearchParams("range=month&granularity=quarter")));
});

test("detail links can express open quotes and active orders without invalid status values", () => {
  assert.equal(parseQuoteFilters(new URLSearchParams("status=open")).open, true);
  assert.equal(parseOrdersFilters(new URLSearchParams("status=active")).active, true);
});
