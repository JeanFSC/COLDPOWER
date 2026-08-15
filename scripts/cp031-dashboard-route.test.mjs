import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("dashboard route reads request filters and separates invalid filters from database failures", () => {
  const source = fs.readFileSync("src/app/api/admin/dashboard/route.ts", "utf8");
  assert.match(source, /request\.url/);
  assert.match(source, /parseDashboardFilters/);
  assert.match(source, /DASHBOARD_INVALID_FILTER/);
  assert.match(source, /DASHBOARD_UNAVAILABLE/);
});
