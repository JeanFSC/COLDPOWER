import assert from "node:assert/strict";
import test from "node:test";
import { getUserPage } from "../src/lib/user-administration";

test("usuarios: consulta real filtrada mantiene métricas y paginación", async () => {
  const result = await getUserPage({ query: "__cp044_user_that_should_not_exist__", page: 1, pageSize: 10 }, 0);
  assert.equal(result.page, 1);
  assert.equal(result.pageSize, 10);
  assert.equal(result.totalItems, 0);
  assert.equal(result.metrics.total, 0);
  assert.equal(result.metrics.pendingInvitations, 0);
  assert.ok(Array.isArray(result.items));
});
