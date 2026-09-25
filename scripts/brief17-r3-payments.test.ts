import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { eq, inArray, like } from "drizzle-orm";
import { getDb, closeDb } from "../src/db";
import { customers } from "../src/db/crm-schema";
import { notifications } from "../src/db/operations-schema";
import { locations, users } from "../src/db/schema";
import { orders, paymentAttempts, paymentEvents, paymentStatusHistory, payments, sales } from "../src/db/sales-schema";
import { processPaymentWebhook, refreshPaymentStatus } from "../src/lib/payment-service";
import { signMockPayload } from "../src/lib/payments/mock-provider";

process.env.PAYMENT_PROVIDER = "mock";
process.env.MOCK_PAYMENT_WEBHOOK_SECRET ||= "brief17-r3-local-secret";

const db = getDb();
const tag = `brief17-r3-${crypto.randomUUID().slice(0, 8)}`;
const staffId = `user-${tag}`;
const createdOrderIds: string[] = [];
const createdPaymentIds: string[] = [];

type OrderStatus = "PAYMENT_PENDING" | "PAID" | "CANCELLED";
type PaymentStatus = "PENDING" | "APPROVED" | "CONFIRMED" | "REJECTED";

function id(prefix: string) {
  return `${prefix}-${tag}-${crypto.randomUUID().slice(0, 8)}`;
}

function webhook(reference: string, status: "APPROVED" | "REJECTED", eventId = id("event")) {
  const raw = JSON.stringify({ eventId, reference, status, amount: "0", currency: "PEN" });
  return { raw, signature: signMockPayload(raw, process.env.MOCK_PAYMENT_WEBHOOK_SECRET!) };
}

async function createFixture(input: { name: string; orderStatus: OrderStatus; total?: string; payments: Array<{ name: string; amount: string; status: PaymentStatus }> }) {
  const [customer] = await db.select({ id: customers.id }).from(customers).limit(1);
  const [location] = await db.select({ id: locations.id }).from(locations).where(eq(locations.active, true)).limit(1);
  assert.ok(customer, "La base local necesita al menos un cliente para las pruebas de pagos.");
  assert.ok(location, "La base local necesita al menos una ubicación activa para las pruebas de pagos.");

  const saleId = id(`sale-${input.name}`);
  const orderId = id(`order-${input.name}`);
  const code = `BRIEF17R3-${input.name}-${crypto.randomUUID().slice(0, 6)}`;
  const total = input.total ?? input.payments.reduce((sum, payment) => sum + Number(payment.amount), 0).toFixed(2);
  await db.insert(sales).values({ id: saleId, code: `${code}-SALE`, customerId: customer.id, status: "CONFIRMED", channel: "QA", subtotal: total, discountAmount: "0.00", taxAmount: "0.00", total, currency: "PEN", idempotencyKey: id("sale-key") });
  await db.insert(orders).values({ id: orderId, code, saleId, customerId: customer.id, status: input.orderStatus, deliveryMethod: "PICKUP", locationId: location.id, customerNameSnapshot: "Brief 17 R3 QA", customerPhoneSnapshot: "999000111", customerEmailSnapshot: `${tag}@example.invalid`, subtotal: total, discountAmount: "0.00", taxAmount: "0.00", total, currency: "PEN", idempotencyKey: id("order-key"), version: 1, ...(input.orderStatus === "CANCELLED" ? { cancellationReason: "Cancelación QA antes de la aprobación" } : {}) });
  createdOrderIds.push(orderId);

  const paymentRows = [];
  for (const paymentInput of input.payments) {
    const paymentId = id(`payment-${input.name}-${paymentInput.name}`);
    const providerReference = `brief17r3_${tag}_${input.name}_${paymentInput.name}`;
    paymentRows.push({ id: paymentId, orderId, methodType: "PROVIDER" as const, method: "mock", provider: "mock", providerReference, amount: paymentInput.amount, currency: "PEN", status: paymentInput.status, metadata: { fixture: tag } });
    createdPaymentIds.push(paymentId);
  }
  await db.insert(payments).values(paymentRows);
  return { orderId, code, total, payments: paymentRows };
}

async function readPayment(paymentId: string) {
  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId));
  assert.ok(payment, `No se encontró el pago ${paymentId}.`);
  return payment;
}

async function readOrder(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  assert.ok(order, `No se encontró el pedido ${orderId}.`);
  return order;
}

async function cleanupByTag() {
  const staleSales = await db.select({ id: sales.id }).from(sales).where(like(sales.code, "BRIEF17R3-%"));
  const staleSaleIds = staleSales.map((row) => row.id);
  const staleOrders = staleSaleIds.length ? await db.select({ id: orders.id }).from(orders).where(inArray(orders.saleId, staleSaleIds)) : [];
  const staleOrderIds = staleOrders.map((row) => row.id);
  const stalePayments = staleOrderIds.length ? await db.select({ id: payments.id }).from(payments).where(inArray(payments.orderId, staleOrderIds)) : [];
  const stalePaymentIds = stalePayments.map((row) => row.id);
  if (stalePaymentIds.length) await db.delete(payments).where(inArray(payments.id, stalePaymentIds));
  if (staleOrderIds.length) await db.delete(orders).where(inArray(orders.id, staleOrderIds));
  if (staleSaleIds.length) await db.delete(sales).where(inArray(sales.id, staleSaleIds));
  await db.delete(notifications).where(eq(notifications.recipientId, staffId));
  await db.delete(users).where(eq(users.id, staffId));
}

before(async () => {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  assert.match(databaseUrl, /127\.0\.0\.1|localhost/, "Las pruebas R3 deben apuntar a PostgreSQL local.");
  assert.match(databaseUrl, /:5433\//, "Las pruebas R3 deben usar PostgreSQL 5433.");
  assert.doesNotMatch(databaseUrl, /neon\.tech/i, "Las pruebas R3 no deben usar Neon.");
  await cleanupByTag();
  await db.insert(users).values({ id: staffId, email: `${staffId}@example.invalid`, name: "Brief 17 R3 QA", role: "admin", roleCode: "GERENCIA", status: "ACTIVE" });
});

after(async () => {
  const paymentIds = [...createdPaymentIds];
  if (paymentIds.length) {
    await db.delete(notifications).where(eq(notifications.recipientId, staffId));
    await db.delete(payments).where(inArray(payments.id, paymentIds));
  }
  if (createdOrderIds.length) {
    const orderRows = await db.select({ id: orders.id, saleId: orders.saleId }).from(orders).where(inArray(orders.id, createdOrderIds));
    if (orderRows.length) {
      await db.delete(orders).where(inArray(orders.id, orderRows.map((row) => row.id)));
      await db.delete(sales).where(inArray(sales.id, orderRows.map((row) => row.saleId)));
    }
  }
  await db.delete(users).where(eq(users.id, staffId));
  await closeDb();
});

describe("Brief 17-R3: aprobaciones tardías", () => {
  test("(a) una reconfirmación CONFIRMED con otro eventId es no-op y no notifica", async () => {
    const fixture = await createFixture({ name: "a", orderStatus: "PAID", payments: [{ name: "main", amount: "100.00", status: "CONFIRMED" }] });
    const beforeHistory = await db.select().from(paymentStatusHistory).where(eq(paymentStatusHistory.paymentId, fixture.payments[0].id));
    const beforeAttempts = await db.select().from(paymentAttempts).where(eq(paymentAttempts.paymentId, fixture.payments[0].id));
    const event = webhook(fixture.payments[0].providerReference!, "APPROVED");
    const result = await processPaymentWebhook("mock", event.raw, event.signature);
    const payment = await readPayment(fixture.payments[0].id);
    const afterHistory = await db.select().from(paymentStatusHistory).where(eq(paymentStatusHistory.paymentId, payment.id));
    const afterAttempts = await db.select().from(paymentAttempts).where(eq(paymentAttempts.paymentId, payment.id));
    const lateNotifications = await db.select().from(notifications).where(eq(notifications.recipientId, staffId)).then((rows) => rows.filter((row) => row.dedupeKey?.includes(payment.id)));
    assert.equal(result.ignored, true);
    assert.equal(result.changed, false);
    assert.equal(payment.metadata?.requiresRefund, undefined);
    assert.equal(afterHistory.length, beforeHistory.length);
    assert.equal(afterAttempts.length, beforeAttempts.length);
    assert.equal(lateNotifications.length, 0);
  });

  test("(b) APPROVED a CONFIRMED del mismo pago no crea flag de reembolso", async () => {
    const fixture = await createFixture({ name: "b", orderStatus: "PAID", payments: [{ name: "main", amount: "100.00", status: "APPROVED" }] });
    await db.insert(paymentEvents).values({ id: id("seed-event"), paymentId: fixture.payments[0].id, provider: "mock", providerEventId: id("provider-event"), eventType: "payment.approved", payload: { status: "APPROVED" } });
    const result = await refreshPaymentStatus(fixture.payments[0].id);
    const payment = await readPayment(fixture.payments[0].id);
    assert.equal(result.changed, true);
    assert.equal(payment.status, "CONFIRMED");
    assert.equal(payment.metadata?.requiresRefund, undefined);
    assert.equal(payment.metadata?.lateApproval, undefined);
  });

  test("(c) dos abonos parciales que completan el total pagan el pedido sin flags", async () => {
    const fixture = await createFixture({ name: "c", orderStatus: "PAYMENT_PENDING", payments: [{ name: "a", amount: "60.00", status: "PENDING" }, { name: "b", amount: "40.00", status: "PENDING" }] });
    const first = webhook(fixture.payments[0].providerReference!, "APPROVED");
    await processPaymentWebhook("mock", first.raw, first.signature);
    const second = webhook(fixture.payments[1].providerReference!, "APPROVED");
    await processPaymentWebhook("mock", second.raw, second.signature);
    const order = await readOrder(fixture.orderId);
    const paymentA = await readPayment(fixture.payments[0].id);
    const paymentB = await readPayment(fixture.payments[1].id);
    assert.equal(order.status, "PAID");
    assert.equal(paymentA.metadata?.requiresRefund, undefined);
    assert.equal(paymentB.metadata?.requiresRefund, undefined);
  });

  test("(d) aprobación tardía B después de A pagado marca B y conserva trazabilidad", async () => {
    const fixture = await createFixture({ name: "d", orderStatus: "PAID", total: "100.00", payments: [{ name: "a", amount: "100.00", status: "CONFIRMED" }, { name: "b", amount: "100.00", status: "PENDING" }] });
    const event = webhook(fixture.payments[1].providerReference!, "APPROVED");
    const result = await processPaymentWebhook("mock", event.raw, event.signature);
    const payment = await readPayment(fixture.payments[1].id);
    const attempts = await db.select().from(paymentAttempts).where(eq(paymentAttempts.paymentId, payment.id));
    const history = await db.select().from(paymentStatusHistory).where(eq(paymentStatusHistory.paymentId, payment.id));
    assert.equal(result.refundRequired, true);
    assert.equal(payment.metadata?.requiresRefund, true);
    assert.ok(attempts.length > 0);
    assert.ok(history.some((entry) => entry.reason === "Aprobación posterior: requiere reembolso"));
  });

  test("(e) aprobación sobre pedido CANCELLED marca y notifica al personal", async () => {
    const fixture = await createFixture({ name: "e", orderStatus: "CANCELLED", payments: [{ name: "late", amount: "100.00", status: "PENDING" }] });
    const event = webhook(fixture.payments[0].providerReference!, "APPROVED");
    const result = await processPaymentWebhook("mock", event.raw, event.signature);
    const payment = await readPayment(fixture.payments[0].id);
    const staffNotifications = await db.select().from(notifications).where(eq(notifications.recipientId, staffId));
    assert.equal(result.refundRequired, true);
    assert.equal(payment.metadata?.requiresRefund, true);
    assert.ok(staffNotifications.some((row) => row.dedupeKey === `payment-late-approval:${payment.id}`));
  });

  test("(f) REJECTED a CONFIRMED en pedido pendiente confirma y pasa a PAID", async () => {
    const fixture = await createFixture({ name: "f", orderStatus: "PAYMENT_PENDING", payments: [{ name: "retry", amount: "100.00", status: "REJECTED" }] });
    const event = webhook(fixture.payments[0].providerReference!, "APPROVED");
    const result = await processPaymentWebhook("mock", event.raw, event.signature);
    const payment = await readPayment(fixture.payments[0].id);
    const order = await readOrder(fixture.orderId);
    assert.equal(result.refundRequired, undefined);
    assert.equal(payment.status, "CONFIRMED");
    assert.equal(payment.metadata?.requiresRefund, undefined);
    assert.equal(order.status, "PAID");
  });
});
