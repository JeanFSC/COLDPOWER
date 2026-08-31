import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { parseDashboardFilters, DashboardInvalidFilterError } from "../src/lib/dashboard-contract";
import { fillSalesSeries, financialMetrics } from "../src/lib/operations-dashboard";

const root = process.cwd(); const read = (file: string) => readFileSync(`${root}/${file}`, "utf8");

test("reportes: rangos y fechas válidas", () => {
  for (const range of ["today", "yesterday", "week", "month", "custom"]) assert.equal(parseDashboardFilters(new URLSearchParams(`range=${range}`)).range, range);
  assert.throws(() => parseDashboardFilters(new URLSearchParams("range=custom&from=2026-02-30")), DashboardInvalidFilterError);
  assert.throws(() => parseDashboardFilters(new URLSearchParams("range=custom&from=2026-02-02&to=2026-02-01")), DashboardInvalidFilterError);
});

test("reportes: series completan días sin ventas y métricas sin denominador", () => {
  const from = new Date("2026-01-01T05:00:00Z"); const to = new Date("2026-01-04T05:00:00Z");
  const result = fillSalesSeries({ from, to }, [{ date: "2026-01-02", total: 10, count: 1 }]);
  assert.deepEqual(result.map((row) => row.total), [0, 10, 0]);
  assert.equal(financialMetrics({ revenue: 0, costOfSales: 0, operatingExpenses: null }).grossMargin, null);
});

test("reportes: contrato, exportación, RBAC y protección financiera existen", () => {
  for (const file of ["src/app/api/admin/reportes/route.ts", "src/app/api/admin/reportes/export/route.ts", "src/lib/reports-contract.ts"]) assert.equal(existsSync(`${root}/${file}`), true, file);
  assert.match(read("src/app/api/admin/reportes/route.ts"), /reports\.view/);
  assert.match(read("src/app/api/admin/reportes/export/route.ts"), /reports\.export/);
  assert.match(read("src/app/api/admin/reportes/export/route.ts"), /reports\.exported/);
  assert.match(read("src/lib/operations-dashboard.ts"), /pricing\.cost\.view/);
  assert.match(read("src/lib/operations-dashboard.ts"), /pricing\.margin\.view/);
  assert.match(read("src/app/admin/reportes/page.tsx"), /reportes\/export/);
});
