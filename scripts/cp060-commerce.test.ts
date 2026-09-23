import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { signMockPayload, verifyMockSignature } from "../src/lib/payments/mock-provider";
import { validateCartCheckoutInput } from "../src/lib/sales-validation";
import { buildOrderTimeline } from "../src/lib/order-display";
import { MockTrackingProvider } from "../src/lib/tracking";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

test("pago de prueba: la firma HMAC se verifica y detecta alteraciones", () => {
  const raw = JSON.stringify({ eventId: "e1", reference: "mock_1", status: "APPROVED" });
  const signature = signMockPayload(raw, "secret");
  assert.equal(verifyMockSignature(raw, signature, "secret"), true);
  assert.equal(verifyMockSignature(raw.replace("APPROVED", "REJECTED"), signature, "secret"), false);
  assert.equal(verifyMockSignature(raw, signature, "other-secret"), false);
  assert.equal(verifyMockSignature(raw, null, "secret"), false);
});

test("checkout desde carrito rechaza productos, precios o claves enviados por el cliente", () => {
  const base = { deliveryMethod: "PICKUP", locationId: "loc-1", name: "Ana", phone: "999888777" };
  for (const key of ["items", "price", "total", "currency", "idempotencyKey"]) {
    assert.throws(() => validateCartCheckoutInput({ ...base, [key]: "x" }), /servidor/);
  }
  assert.deepEqual(validateCartCheckoutInput(base), { ...base, email: null, address: null, deliveryDetails: null, deliveryMethod: "PICKUP" });
});

test("checkout exige los datos de cada método de entrega", () => {
  const base = { locationId: "loc-1", name: "Ana", phone: "999888777" };
  assert.throws(() => validateCartCheckoutInput({ ...base, deliveryMethod: "DELIVERY", address: "Av. 1" }), /distrito/);
  const delivery = validateCartCheckoutInput({ ...base, deliveryMethod: "DELIVERY", address: "Av. 1", deliveryDetails: { district: "Surco" } });
  assert.equal(delivery.deliveryDetails?.department, "Lima");
  assert.throws(() => validateCartCheckoutInput({ ...base, deliveryMethod: "SHIPPING", deliveryDetails: { department: "Cusco", province: "Cusco" } }), /agencia/);
  const shipping = validateCartCheckoutInput({ ...base, deliveryMethod: "SHIPPING", deliveryDetails: { department: "Cusco", province: "Cusco", agencyName: "Shalom", recipientName: "Ana", recipientDocument: "12345678" } });
  assert.equal(shipping.deliveryDetails?.agencyName, "Shalom");
  assert.throws(() => validateCartCheckoutInput({ ...base, deliveryMethod: "PICKUP", phone: "abc" }), /teléfono/);
});

test("la línea de tiempo sigue el método de entrega con fechas reales", () => {
  const at = new Date("2026-09-22T15:00:00Z");
  const timeline = buildOrderTimeline("SHIPPING", "SHIPPED", [{ toStatus: "PAYMENT_PENDING", createdAt: at }, { toStatus: "PAID", createdAt: at }, { toStatus: "SHIPPED", createdAt: at }]);
  assert.deepEqual(timeline.map((step) => step.status), ["PAYMENT_PENDING", "PAID", "PREPARING", "READY", "SHIPPED", "DELIVERED"]);
  assert.equal(timeline.find((step) => step.status === "SHIPPED")?.state, "current");
  assert.equal(timeline.find((step) => step.status === "DELIVERED")?.state, "upcoming");
  const cancelled = buildOrderTimeline("PICKUP", "CANCELLED", [{ toStatus: "PAYMENT_PENDING", createdAt: at }]);
  assert.equal(cancelled.filter((step) => step.state === "done").length, 1);
});

test("el transportista de prueba avanza en orden y deja la entrega para el pedido", async () => {
  const provider = new MockTrackingProvider();
  const created = await provider.createShipment({ orderCode: "ORD-1", method: "DELIVERY", destination: "Surco" });
  assert.match(created.trackingNumber, /^CP-TRK-/);
  const sequence: string[] = [created.initialEvent.status];
  let next = provider.nextEvent({ method: "DELIVERY", current: created.initialEvent.status, trackingNumber: created.trackingNumber, destination: "Surco" });
  while (next) { sequence.push(next.status); next = provider.nextEvent({ method: "DELIVERY", current: next.status, trackingNumber: created.trackingNumber, destination: "Surco" }); }
  assert.deepEqual(sequence, ["LABEL_CREATED", "PICKED_UP", "OUT_FOR_DELIVERY"]);
  assert.equal(provider.deliveredEvent({ method: "DELIVERY", trackingNumber: created.trackingNumber, destination: "Surco" }).status, "DELIVERED");
});

test("cotización y carrito de compra están separados", () => {
  const quoteRoute = read("src/app/api/cotizacion/route.ts");
  assert.doesNotMatch(quoteRoute, /import[^;]*(shopping|shoppingCarts)/i, "la cotización no debe leer el carrito de compra");
  assert.doesNotMatch(quoteRoute, /\bshoppingCarts\b|\bshoppingCartItems\b/);
  assert.match(quoteRoute, /quoteCarts\)\.set\(\{ items: \[\]/, "la lista de cotización se vacía al enviarse");
  const cartButton = read("src/components/cart/CartButton.tsx");
  assert.match(cartButton, /href="\/carrito"/);
  assert.match(cartButton, /useShoppingCart/);
  const addToCart = read("src/components/cart/AddToCartButton.tsx");
  assert.match(addToCart, /useShoppingCart/);
  assert.match(addToCart, /Solo cotizable/);
  const addToQuote = read("src/components/cart/AddToQuoteButton.tsx");
  assert.doesNotMatch(addToQuote, /useShoppingCart/);
});

test("el pago de prueba solo se activa por variable explícita, nunca por NODE_ENV", () => {
  const payments = read("src/lib/payments.ts");
  const env = read("src/lib/env.ts");
  assert.doesNotMatch(payments, /NODE_ENV/);
  assert.match(env, /PAYMENT_PROVIDER/);
  assert.match(payments, /mockPaymentWebhookSecret/);
});
