import { test } from "node:test";
import assert from "node:assert/strict";
import {
  availabilityFromBalance,
  calculatePagination,
  calculatePipelineMetrics,
  sanitizeAuditValue,
} from "@/lib/operational-semantics";
import { fillSalesSeries } from "@/lib/operations-dashboard";

test("inventario sin saldo cuantitativo conserva UNKNOWN", () => {
  assert.deepEqual(availabilityFromBalance(null), { status: "UNKNOWN", available: null });
  assert.deepEqual(availabilityFromBalance({ onHand: 0, reserved: 0, minimumStock: null }), { status: "OUT_OF_STOCK", available: 0 });
});

test("pipeline vacío devuelve ceros y conversión nula", () => {
  assert.deepEqual(calculatePipelineMetrics([]), {
    count: 0,
    total: 0,
    weightedValue: 0,
    won: 0,
    lost: 0,
    conversion: null,
    overdueFollowups: 0,
  });
});

test("paginación no inventa una segunda página", () => {
  assert.deepEqual(calculatePagination(1, 25, 1), { page: 1, pageSize: 25, totalItems: 1, totalPages: 1 });
  assert.deepEqual(calculatePagination(2, 25, 26), { page: 2, pageSize: 25, totalItems: 26, totalPages: 2 });
});

test("auditoría elimina secretos en estructuras anidadas", () => {
  assert.deepEqual(sanitizeAuditValue({ password: "x", token: "y", nested: { secret: "z", ok: 1 } }), { nested: { ok: 1 } });
});

test("serie de ventas conserva todos los días del período aunque no haya ventas", () => {
  const from = new Date("2026-08-10T05:00:00.000Z");
  const to = new Date("2026-08-13T05:00:00.000Z");
  assert.deepEqual(fillSalesSeries({ from, to }, [{ date: "2026-08-11", total: 250, count: 1 }]), [
    { date: "2026-08-10", total: 0, count: 0 },
    { date: "2026-08-11", total: 250, count: 1 },
    { date: "2026-08-12", total: 0, count: 0 },
  ]);
});
