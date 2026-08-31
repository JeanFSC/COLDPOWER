import test from "node:test";
import assert from "node:assert/strict";
import { parseDashboardFilters, dashboardFiltersToQuery } from "../src/lib/dashboard-contract";

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
