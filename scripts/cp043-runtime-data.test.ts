import assert from "node:assert/strict";
import test from "node:test";
import { getAuditPage } from "../src/lib/audit-repository";

test("auditoria: consulta real devuelve página, métricas y filtros aislados", async () => {
  const result = await getAuditPage({ query: "__cp043_event_that_should_not_exist__", page: 1, pageSize: 10 });
  assert.ok(Array.isArray(result.items));
  assert.equal(result.page, 1);
  assert.equal(result.pageSize, 10);
  assert.equal(result.totalItems, 0);
  assert.equal(result.metrics.events.current, 0);
  assert.equal(result.metrics.failed.current, 0);
  assert.ok(Array.isArray(result.facets.modules));
  assert.ok(Array.isArray(result.trend));
});
