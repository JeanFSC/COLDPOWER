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
