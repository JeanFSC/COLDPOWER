import assert from "node:assert/strict";
import test from "node:test";
import { getPaymentsPage } from "../src/lib/payments-repository";

test("pagos: consulta real devuelve contrato paginado y métricas globales", async () => {
  const result = await getPaymentsPage({ page: 1, pageSize: 5 });
  assert.ok(Array.isArray(result.items));
  assert.equal(typeof result.totalItems, "number");
  assert.equal(typeof result.totalPages, "number");
  assert.equal(typeof result.metrics.total, "number");
  assert.equal(typeof result.metrics.totalAmount, "number");
  assert.ok(Array.isArray(result.facets.statuses));
});

test("pagos: búsqueda server-side no rompe el contrato", async () => {
  const result = await getPaymentsPage({ query: "__cp040_nonexistent__", pageSize: 10 });
  assert.equal(result.items.length, 0);
  assert.equal(result.totalItems, 0);
  assert.equal(result.metrics.total, 0);
});
