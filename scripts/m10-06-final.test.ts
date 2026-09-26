import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  groupPaymentMethodBreakdown,
  groupPaymentMethodCounts,
  paymentCode,
  paymentMethodLabel,
} from "../src/lib/payment-display";
import { actionLabel, entityLabel } from "../src/lib/audit-contract";
import { notificationBodyLabel } from "../src/lib/notification-display";

const root = process.cwd();
const read = (file: string) => readFileSync(join(root, file), "utf8");

test("M10-06 centraliza y agrupa métodos de pago", () => {
  assert.equal(paymentMethodLabel("TRANSFER"), "Transferencia");
  assert.equal(paymentMethodLabel("TRANSFERENCIA"), "Transferencia");
  assert.equal(paymentMethodLabel("CARD"), "Tarjeta");
  assert.equal(paymentMethodLabel("DEBIT_CARD"), "Tarjeta de débito");
  assert.equal(paymentMethodLabel("CREDIT_CARD"), "Tarjeta de crédito");
  assert.equal(paymentMethodLabel("UNCONFIGURED"), "Por configurar");
  assert.equal(paymentMethodLabel("OTHER"), "Otro");
  assert.equal(paymentMethodLabel("development_fixture"), "Pasarela de prueba");

  assert.deepEqual(
    groupPaymentMethodCounts([
      { method: "TRANSFER", count: 29 },
      { method: "TRANSFERENCIA", count: 17 },
      { method: "CARD", count: 2 },
    ]),
    [
      { method: "TRANSFER", count: 46 },
      { method: "CARD", count: 2 },
    ],
  );

  const breakdown = groupPaymentMethodBreakdown([
    { method: "TRANSFER", count: 1, confirmedAmountsByCurrency: [{ currency: "PEN", gross: 10, refunded: 0, net: 10 }] },
    { method: "TRANSFERENCIA", count: 2, confirmedAmountsByCurrency: [{ currency: "PEN", gross: 20, refunded: 5, net: 15 }] },
  ]);
  assert.deepEqual(breakdown[0], {
    method: "TRANSFER",
    count: 3,
    confirmedAmountsByCurrency: [{ currency: "PEN", gross: 30, refunded: 5, net: 25 }],
  });
});

test("M10-06 genera códigos de pago estables sin exponer estados como código", () => {
  const code = paymentCode("payment-2026-03-pending");
  assert.match(code, /^PAGO-[0-9A-F]{8}$/);
  assert.notEqual(code, "PAGO-PENDING");
  assert.equal(paymentCode("payment-1", "PAG-2026-0001"), "PAG-2026-0001");
});

test("M10-06 conserva fallback de media referencial cuando falta el archivo", () => {
  const route = read("src/app/api/media/[id]/route.ts");
  assert.match(route, /readReferenceImage/);
  assert.match(route, /resolveProductImage/);
  assert.match(route, /console\.warn/);
  assert.match(route, /status: 200/);
  assert.match(route, /Archivo multimedia no disponible/);
});

test("M10-06 traduce auditoría y limpia referencias de prueba de notificaciones", () => {
  assert.equal(actionLabel("APPROVED"), "Aprobó la operación");
  assert.equal(entityLabel("inventory_reservation"), "Reserva de inventario");
  assert.equal(entityLabel("inventory_movement"), "Movimiento de almacén");
  assert.doesNotMatch(notificationBodyLabel("Ejecución BRIEF17R3-e-a75802 completada"), /BRIEF17R3-e-a75802/);
  assert.match(notificationBodyLabel("Ejecución BRIEF17R3-e-a75802 completada"), /notificación de prueba automatizada/);
  assert.match(read("src/app/admin/notificaciones/page.tsx"), /find\(\(item\) => item\.state === "UNREAD"\)/);
});
