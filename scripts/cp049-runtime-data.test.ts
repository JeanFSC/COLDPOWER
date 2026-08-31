import assert from "node:assert/strict";
import test from "node:test";
import { getOperationsWorkspace } from "@/lib/operations-workspace";

test("operaciones devuelven contrato estable y cero real para una búsqueda inexistente", async () => {
  const result = await getOperationsWorkspace({ range: "all", page: 1, pageSize: 10, queue: "orders", status: "__coldpower_missing__" });
  assert.deepEqual(Object.keys(result.metrics).sort(), ["activeLocations", "activeOrders", "criticalStock", "noStockProducts", "openOpportunities", "openQuotes", "overdueTasks", "pendingPayments", "preparingOrders", "reservedUnits"].sort());
  assert.deepEqual(Object.keys(result.queues).sort(), ["followUps", "inventoryAlerts", "opportunities", "orders", "quotes"].sort());
  assert.equal(result.queues.orders.length, 0);
  assert.equal(result.totalItems, 0);
  assert.equal(result.totalPages, 1);
});

test("operaciones cargan todas las colas con filtros por periodo sin datos financieros", async () => {
  const result = await getOperationsWorkspace({ range: "month", page: 1, pageSize: 5 });
  assert.equal(Array.isArray(result.queues.quotes), true);
  assert.equal(Array.isArray(result.queues.opportunities), true);
  assert.equal(Array.isArray(result.queues.orders), true);
  assert.equal(Array.isArray(result.queues.followUps), true);
  assert.equal(Array.isArray(result.queues.inventoryAlerts), true);
  assert.equal(typeof result.metrics.activeOrders, "number");
  assert.equal(typeof result.metrics.pendingPayments, "number");
});
