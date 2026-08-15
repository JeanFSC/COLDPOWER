import assert from "node:assert/strict";
import test from "node:test";
import { getOperationsDashboard } from "../src/lib/operations-dashboard";

test("reportes: consulta real conserva series completas y métricas nullable", async () => {
  const result = await getOperationsDashboard({ range: "custom", from: "2026-01-01", to: "2026-01-03" }, { role: "SUPERADMIN" });
  assert.equal(result.salesSeries.length, 3);
  assert.equal(result.previousSalesSeries.length, 3);
  assert.equal(typeof result.salesRange.total, "number");
  assert.ok(result.conversion.percentage === null || typeof result.conversion.percentage === "number");
  assert.ok(Array.isArray(result.categorySummary));
});
