import assert from "node:assert/strict";
import test from "node:test";
import { applyInventoryOperation, availableQuantity, assertValidBalance, reservationShouldExpire, validateInventoryMovementMetadata, type InventoryBalance } from "../src/lib/inventory-domain";

const balance: InventoryBalance = { onHand: 10, reserved: 2 };

test("el disponible se deriva y el saldo válido respeta invariantes", () => {
  assert.equal(availableQuantity(balance), 8);
  assert.doesNotThrow(() => assertValidBalance(balance));
  assert.throws(() => assertValidBalance({ onHand: -1, reserved: 0 }), /negativo/i);
  assert.throws(() => assertValidBalance({ onHand: 1, reserved: 2 }), /reservado/i);
});

test("entradas y salidas actualizan on_hand sin fabricar stock", () => {
  assert.deepEqual(applyInventoryOperation(balance, { type: "PURCHASE_RECEIPT", quantity: 3 }), { onHand: 13, reserved: 2 });
  assert.deepEqual(applyInventoryOperation(balance, { type: "ADJUSTMENT_OUT", quantity: 8 }), { onHand: 2, reserved: 2 });
  assert.throws(() => applyInventoryOperation(balance, { type: "ADJUSTMENT_OUT", quantity: 9 }), /disponible|negativo/i);
});

test("reservar, liberar y consumir son operaciones distintas y transaccionales", () => {
  assert.deepEqual(applyInventoryOperation(balance, { type: "RESERVATION", quantity: 5 }), { onHand: 10, reserved: 7 });
  assert.deepEqual(applyInventoryOperation(balance, { type: "RESERVATION_RELEASE", quantity: 1 }), { onHand: 10, reserved: 1 });
  assert.deepEqual(applyInventoryOperation(balance, { type: "SALE", quantity: 2, consumeReserved: true }), { onHand: 8, reserved: 0 });
  assert.throws(() => applyInventoryOperation(balance, { type: "RESERVATION", quantity: 9 }), /disponible/i);
});

test("CP-030 exige trazabilidad completa para ajustes manuales", () => {
  assert.deepEqual(validateInventoryMovementMetadata({ type: "ADJUSTMENT_OUT", reason: "Conteo físico", notes: "Diferencia verificada", performedBy: "user-1" }), { reason: "Conteo físico", notes: "Diferencia verificada", performedBy: "user-1" });
  assert.throws(() => validateInventoryMovementMetadata({ type: "ADJUSTMENT_OUT", reason: "", notes: "Diferencia", performedBy: "user-1" }), /motivo/i);
  assert.throws(() => validateInventoryMovementMetadata({ type: "ADJUSTMENT_IN", reason: "Recepción", notes: "", performedBy: "user-1" }), /notas/i);
  assert.throws(() => validateInventoryMovementMetadata({ type: "ADJUSTMENT_IN", reason: "Recepción", notes: "A", performedBy: undefined }), /actor/i);
});

test("CP-030 distingue una reserva activa vencida de una reserva sin expiración", () => {
  const now = new Date("2026-08-14T15:00:00.000Z");
  assert.equal(reservationShouldExpire("ACTIVE", new Date("2026-08-14T14:59:59.000Z"), now), true);
  assert.equal(reservationShouldExpire("ACTIVE", null, now), false);
  assert.equal(reservationShouldExpire("RELEASED", new Date("2026-08-14T14:59:59.000Z"), now), false);
});
