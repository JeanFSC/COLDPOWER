import { test } from "node:test";
import assert from "node:assert/strict";
import { canTransitionOrder, orderStatuses, type OrderStatus } from "@/lib/sales-validation";

test("pedido CP-030 usa estados operativos y no salta a entregado", () => {
  for (const status of ["RECEIVED", "PREPARING", "READY", "IN_TRANSIT", "DELIVERED", "CANCELLED"] as const) assert.ok(orderStatuses.includes(status));
  assert.equal(canTransitionOrder("RECEIVED", "PREPARING"), true);
  assert.equal(canTransitionOrder("RECEIVED", "DELIVERED"), false);
  assert.equal(canTransitionOrder("IN_TRANSIT", "DELIVERED"), true);
  assert.equal(canTransitionOrder("DELIVERED", "CANCELLED"), false);
  const status: OrderStatus = "READY";
  assert.equal(status, "READY");
});
