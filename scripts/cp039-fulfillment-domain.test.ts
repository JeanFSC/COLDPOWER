import assert from "node:assert/strict";
import test from "node:test";
import { canTransitionOrder, canTransitionOrderForDelivery, isValidPickedQuantity } from "../src/lib/sales-validation";

test("CP-039 state machine separa pickup, delivery y shipping", () => {
  assert.equal(canTransitionOrderForDelivery("PREPARING", "READY_FOR_PICKUP", "PICKUP"), true);
  assert.equal(canTransitionOrderForDelivery("PREPARING", "READY", "PICKUP"), false);
  assert.equal(canTransitionOrderForDelivery("PREPARING", "READY", "DELIVERY"), true);
  assert.equal(canTransitionOrderForDelivery("READY", "IN_TRANSIT", "DELIVERY"), true);
  assert.equal(canTransitionOrderForDelivery("READY", "SHIPPED", "DELIVERY"), false);
  assert.equal(canTransitionOrderForDelivery("READY", "SHIPPED", "SHIPPING"), true);
  assert.equal(canTransitionOrderForDelivery("READY", "IN_TRANSIT", "SHIPPING"), false);
  assert.equal(canTransitionOrderForDelivery("SHIPPED", "DELIVERED", "SHIPPING"), true);
});

test("CP-039 bloquea transiciones inválidas y entrega/cancelación de estados cerrados", () => {
  assert.equal(canTransitionOrder("PREPARING", "DELIVERED"), false);
  assert.equal(canTransitionOrder("DELIVERED", "CANCELLED"), false);
  assert.equal(canTransitionOrder("CANCELLED", "PREPARING"), false);
  assert.equal(canTransitionOrderForDelivery("READY", "DELIVERED", "DELIVERY"), false);
});

test("CP-039 picking permite parcial válido, completo y nunca excede lo solicitado", () => {
  assert.equal(isValidPickedQuantity(0, 3), true);
  assert.equal(isValidPickedQuantity(2, 3), true);
  assert.equal(isValidPickedQuantity(3, 3), true);
  assert.equal(isValidPickedQuantity(4, 3), false);
  assert.equal(isValidPickedQuantity(-1, 3), false);
  assert.equal(isValidPickedQuantity(1.5, 3), false);
});

