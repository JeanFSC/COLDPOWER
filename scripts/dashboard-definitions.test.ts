// scripts/dashboard-definitions.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import {
  isOpenQuoteStatus,
  isActiveOrderStatus,
  ACTIVE_ORDER_STATUSES,
  getPipelineMacroStage,
  PIPELINE_MACRO_STAGE_ORDER,
  stockState,
  buildKpiView,
  resolveGranularity,
} from "../src/lib/dashboard-definitions";

test("isOpenQuoteStatus excludes terminal states only", () => {
  assert.equal(isOpenQuoteStatus("DRAFT"), true);
  assert.equal(isOpenQuoteStatus("FOLLOW_UP"), true);
  assert.equal(isOpenQuoteStatus("REJECTED"), false);
  assert.equal(isOpenQuoteStatus("EXPIRED"), false);
  assert.equal(isOpenQuoteStatus("CONVERTED"), false);
  assert.equal(isOpenQuoteStatus("CANCELLED"), false);
  assert.equal(isOpenQuoteStatus(null), true);
});

test("isActiveOrderStatus excludes DELIVERED and CANCELLED, nothing else", () => {
  const allStatuses = ["NEW","RECEIVED","PAYMENT_PENDING","PAID","PREPARING","READY","READY_FOR_PICKUP","IN_TRANSIT","SHIPPED","DELIVERED","CANCELLED"];
  const active = allStatuses.filter(isActiveOrderStatus);
  assert.deepEqual(active, ["NEW","RECEIVED","PAYMENT_PENDING","PAID","PREPARING","READY","READY_FOR_PICKUP","IN_TRANSIT","SHIPPED"]);
  assert.equal((ACTIVE_ORDER_STATUSES as readonly string[]).includes("DELIVERED"), false);
  assert.equal((ACTIVE_ORDER_STATUSES as readonly string[]).includes("CANCELLED"), false);
});

test("getPipelineMacroStage groups per CP-032 spec, lost/cancelled/no_response are PERDIDA", () => {
  assert.equal(getPipelineMacroStage("NEW"), "PROSPECCION");
  assert.equal(getPipelineMacroStage("CONTACTED"), "PROSPECCION");
  assert.equal(getPipelineMacroStage("QUOTING"), "COTIZACION");
  assert.equal(getPipelineMacroStage("QUOTE_SENT"), "COTIZACION");
  assert.equal(getPipelineMacroStage("FOLLOW_UP"), "SEGUIMIENTO");
  assert.equal(getPipelineMacroStage("NEGOTIATION"), "NEGOCIACION");
  assert.equal(getPipelineMacroStage("ACCEPTED"), "NEGOCIACION");
  assert.equal(getPipelineMacroStage("SALE"), "CIERRE");
  assert.equal(getPipelineMacroStage("PAYMENT_PENDING"), "CIERRE");
  assert.equal(getPipelineMacroStage("PAID"), "CIERRE");
  assert.equal(getPipelineMacroStage("PREPARING"), "CIERRE");
  assert.equal(getPipelineMacroStage("DELIVERED"), "CIERRE");
  assert.equal(getPipelineMacroStage("CLOSED"), "CIERRE");
  assert.equal(getPipelineMacroStage("LOST"), "PERDIDA");
  assert.equal(getPipelineMacroStage("CANCELLED"), "PERDIDA");
  assert.equal(getPipelineMacroStage("NO_RESPONSE"), "PERDIDA");
  assert.deepEqual(PIPELINE_MACRO_STAGE_ORDER, ["PROSPECCION","COTIZACION","SEGUIMIENTO","NEGOCIACION","CIERRE"]);
});

test("stockState: critical / no-stock / unknown / ok", () => {
  assert.equal(stockState(null), "UNKNOWN");
  assert.equal(stockState({ onHand: 0, reserved: 0, minimumStock: 5 }), "NO_STOCK");
  assert.equal(stockState({ onHand: 5, reserved: 0, minimumStock: 5 }), "CRITICAL");
  assert.equal(stockState({ onHand: 6, reserved: 0, minimumStock: 5 }), "OK");
  assert.equal(stockState({ onHand: 10, reserved: 0, minimumStock: null }), "OK");
});

test("buildKpiView marks sales as period metric with comparison, quotes/orders/stock as snapshot", () => {
  const view = buildKpiView({
    sales: { current: 206426, previous: 105000 },
    openQuotes: 52,
    activeOrders: 80,
    criticalStock: 4,
  });
  assert.equal(view.sales.isSnapshot, false);
  assert.equal(view.sales.comparison?.comparisonAvailable, true);
  assert.equal(view.openQuotes.isSnapshot, true);
  assert.equal(view.openQuotes.comparison, null);
  assert.equal(view.activeOrders.isSnapshot, true);
  assert.equal(view.criticalStock.isSnapshot, true);
});

test("resolveGranularity keeps daily charts readable and uses hours for one-day windows", () => {
  const start = new Date("2026-08-01T05:00:00.000Z");
  const day = 86_400_000;
  assert.equal(resolveGranularity({ from: start, to: new Date(start.getTime() + day) }), "hour");
  assert.equal(resolveGranularity({ from: start, to: new Date(start.getTime() + 31 * day) }), "day");
  assert.equal(resolveGranularity({ from: start, to: new Date(start.getTime() + 61 * day) }), "week");
  assert.equal(resolveGranularity({ from: start, to: new Date(start.getTime() + 366 * day) }), "month");
  assert.equal(resolveGranularity({ from: start, to: new Date(start.getTime() + 31 * day) }, "week"), "week");
  assert.equal(resolveGranularity({ from: start, to: new Date(start.getTime() + day) }, "month"), "hour");
});
