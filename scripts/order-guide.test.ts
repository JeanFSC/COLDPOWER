import assert from "node:assert/strict";
import test from "node:test";
import { buildOrderGuide, buildOrderTimeline, type OrderGuideInput } from "../src/lib/order-display";

const base: OrderGuideInput = {
  status: "PAID",
  deliveryMethod: "PICKUP",
  paymentExpired: false,
  paymentDueAt: null,
  destination: "Almacén Lima · Av. Industrial 100, Lima",
  location: { name: "Almacén Lima", address: "Av. Industrial 100" },
  shipment: null,
  nextStepLabel: null,
  deliveredAt: null,
};

const current = (steps: ReturnType<typeof buildOrderTimeline>) => steps.find((step) => step.state === "current")?.status ?? null;
const next = (steps: ReturnType<typeof buildOrderTimeline>) => steps.find((step) => step.state === "upcoming")?.label ?? null;

test("NEW y RECEIVED se ubican en el primer paso y su siguiente es Pagado", () => {
  for (const status of ["NEW", "RECEIVED"]) {
    const steps = buildOrderTimeline("PICKUP", status, []);
    assert.equal(current(steps), "PAYMENT_PENDING");
    assert.equal(next(steps), "Pagado");
  }
});

test("NEW y RECEIVED no se presentan como pago pendiente", () => {
  for (const status of ["NEW", "RECEIVED"]) {
    const guide = buildOrderGuide({ ...base, status, nextStepLabel: "Pagado" });
    assert.equal(guide.title, "Pedido recibido");
    assert.notEqual(guide.tone, "warning");
    assert.match(guide.body, /Siguiente: pagado/);
  }
});

test("matriz de estados: cada estado activo tiene un paso actual y una guía propia", () => {
  const matrix: Array<[string, string, string]> = [
    ["PICKUP", "PAYMENT_PENDING", "Falta confirmar tu pago"],
    ["PICKUP", "PAID", "Pago confirmado"],
    ["PICKUP", "PREPARING", "Estamos preparando tu pedido"],
    ["PICKUP", "READY_FOR_PICKUP", "Tu pedido te espera"],
    ["DELIVERY", "READY", "Listo para despacho"],
    ["DELIVERY", "IN_TRANSIT", "Tu pedido va en camino"],
    ["SHIPPING", "SHIPPED", "Tu pedido va en camino"],
  ];
  for (const [method, status, title] of matrix) {
    const steps = buildOrderTimeline(method, status, []);
    assert.equal(current(steps), status, `${method}/${status} debe ser el paso actual`);
    assert.equal(buildOrderGuide({ ...base, deliveryMethod: method, status }).title, title);
  }
});

test("pago vencido, entregado y cancelado", () => {
  assert.equal(buildOrderGuide({ ...base, status: "PAYMENT_PENDING", paymentExpired: true }).tone, "danger");
  const deliveredAt = new Date("2026-09-25T15:00:00Z");
  const delivered = buildOrderGuide({ ...base, status: "DELIVERED", deliveredAt });
  assert.equal(delivered.title, "Pedido entregado");
  assert.equal(delivered.facts[0]?.[0], "Entregado");
  const steps = buildOrderTimeline("PICKUP", "DELIVERED", []);
  assert.ok(steps.every((step) => step.state === "done"));
  assert.equal(buildOrderGuide({ ...base, status: "CANCELLED" }).tone, "danger");
});

test("los datos del envío solo aparecen si existen", () => {
  const guide = buildOrderGuide({ ...base, deliveryMethod: "SHIPPING", status: "SHIPPED", shipment: { carrier: "Shalom", trackingNumber: "G-123", estimatedDeliveryAt: null } });
  assert.deepEqual(guide.facts.map(([label]) => label), ["Transportista", "Guía"]);
});
