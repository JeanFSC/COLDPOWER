import assert from "node:assert/strict";
import test from "node:test";
import { eq, inArray } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { customers } from "../src/db/crm-schema";
import { notifications } from "../src/db/operations-schema";
import { orders, paymentAttempts, payments, sales } from "../src/db/sales-schema";
import { registerManualPayment } from "../src/lib/sales-service";
import { createProviderPayment } from "../src/lib/payment-service";
import { configurePaymentProvider, UnconfiguredPaymentProvider } from "../src/lib/payments";

test("QA: cobros manuales y pasarela respetan saldo, concurrencia e idempotencia", {
  skip: process.env.QA_PAYMENT_GUARD !== "1",
}, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const db = getDb();
  const customerId = "customer-fa428e1e-cb3a-40ac-86ea-ac3fceb38acd";
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
  assert.match(customer?.name ?? "", /^QA AUDITORÍA/);
  const tag = `qa-payment-guard-${crypto.randomUUID()}`;
  const saleId = `${tag}-sale`;
  const orderId = `${tag}-order`;
  const paymentId = `${tag}-provider`;
  try {
    await db.insert(sales).values({ id: saleId, code: saleId, customerId, status: "CONFIRMED", channel: "QA AUDITORÍA", subtotal: "11.00", total: "11.00", currency: "PEN", notes: "QA AUDITORÍA — fixture temporal, sin cobro real" });
    await db.insert(orders).values({ id: orderId, code: orderId, saleId, customerId, status: "PAYMENT_PENDING", deliveryMethod: "PICKUP", locationId: "cp-dashboard-v5-location-branch-2", customerNameSnapshot: customer.name, customerPhoneSnapshot: "900000006", subtotal: "11.00", total: "11.00", currency: "PEN", idempotencyKey: orderId });
    await db.insert(payments).values({ id: paymentId, orderId, methodType: "PROVIDER", method: "CARD", provider: "QA-NO-EXTERNAL-CALL", providerReference: tag, status: "PENDING", amount: "11.00", currency: "PEN", metadata: { qa: true, note: "No se invoca ninguna pasarela" } });
    const input = { orderId, method: "CASH" as const, amount: "5.00", currency: "PEN", reference: tag, reason: "QA AUDITORÍA — Debe rechazarse sin registrar cobro" };
    for (const status of ["PENDING", "UNDER_REVIEW"] as const) {
      await db.update(payments).set({ status }).where(eq(payments.id, paymentId));
      await Promise.all([1, 2].map(attempt => assert.rejects(
        registerManualPayment({ ...input, idempotencyKey: `${tag}-${status}-${attempt}` }, { userId: null }),
        /PAYMENT_PROVIDER_PENDING/,
      )));
    }
    // A partial provider configuration must remain blocked as in the UI.
    await db.update(payments).set({ method: "UNCONFIGURED", status: "PENDING", provider: null }).where(eq(payments.id, paymentId));
    await assert.rejects(registerManualPayment({ ...input, idempotencyKey: `${tag}-partial` }, { userId: null }), /PAYMENT_PROVIDER_PENDING/);
    await db.update(payments).set({ status: "UNDER_REVIEW", providerReference: null }).where(eq(payments.id, paymentId));
    await assert.rejects(registerManualPayment({ ...input, idempotencyKey: `${tag}-review-empty` }, { userId: null }), /PAYMENT_PROVIDER_PENDING/);
    await db.update(payments).set({ status: "PENDING" }).where(eq(payments.id, paymentId));
    await db.insert(paymentAttempts).values({ id: `${tag}-attempt`, paymentId, status: "PENDING", amount: "11.00", currency: "PEN", idempotencyKey: `${tag}-attempt` });
    await assert.rejects(registerManualPayment({ ...input, idempotencyKey: `${tag}-attempted-empty` }, { userId: null }), /PAYMENT_PROVIDER_PENDING/);
    const persisted = await db.select().from(payments).where(eq(payments.orderId, orderId));
    assert.equal(persisted.length, 1);
    assert.equal(persisted[0].id, paymentId);
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    assert.equal(order.status, "PAYMENT_PENDING");
    // Hold a synthetic gateway response while a manual request starts on the same order.
    await db.delete(paymentAttempts).where(eq(paymentAttempts.id, `${tag}-attempt`));
    let providerEntered!: () => void;
    let releaseProvider!: () => void;
    const entered = new Promise<void>(resolve => { providerEntered = resolve; });
    const released = new Promise<void>(resolve => { releaseProvider = resolve; });
    const fakeProvider = new UnconfiguredPaymentProvider();
    fakeProvider.createPayment = async () => {
      providerEntered();
      await released;
      return { provider: "QA-NO-EXTERNAL-CALL", providerReference: `${tag}-race`, checkoutUrl: `/pago/prueba/${tag}` };
    };
    configurePaymentProvider(fakeProvider);
    const providerRequest = createProviderPayment({ orderId, idempotencyKey: `${tag}-provider-race` });
    await entered;
    const manualDuringProvider = assert.rejects(registerManualPayment({ ...input, idempotencyKey: `${tag}-manual-race-provider` }, { userId: null }), /PAYMENT_PROVIDER_PENDING/);
    releaseProvider();
    await providerRequest;
    await manualDuringProvider;
    assert.equal((await db.select().from(payments).where(eq(payments.orderId, orderId))).length, 1);
    await db.update(payments).set({ status: "CANCELLED" }).where(eq(payments.id, paymentId));
    // Two distinct manual requests compete for a balance that cannot cover both.
    const manualInput = { ...input, amount: "6.00", reason: "QA AUDITORÍA — Cobro concurrente simulado, sin dinero real" };
    const race = await Promise.allSettled([1, 2].map(attempt => registerManualPayment({ ...manualInput, idempotencyKey: `${tag}-manual-race-${attempt}` }, { userId: null })));
    assert.equal(race.filter(result => result.status === "fulfilled").length, 1);
    const rejected = race.find(result => result.status === "rejected");
    assert.ok(rejected?.status === "rejected");
    assert.match(String(rejected.reason), /PAYMENT_AMOUNT_EXCEEDS_BALANCE/);
    const finalInput = { ...input, reason: "QA AUDITORÍA — Saldo simulado, sin dinero real", idempotencyKey: `${tag}-manual-final` };
    const finalPayment = await registerManualPayment(finalInput, { userId: null });
    assert.equal(finalPayment.order.status, "PAID");
    const replay = await registerManualPayment(finalInput, { userId: null });
    assert.equal(replay.idempotent, true);
    assert.equal(replay.payment.id, finalPayment.payment.id);
    const manualRows = (await db.select().from(payments).where(eq(payments.orderId, orderId))).filter(payment => payment.methodType === "MANUAL");
    assert.equal(manualRows.length, 2);
    assert.equal(manualRows.reduce((total, payment) => total + Number(payment.amount), 0), 11);
    await assert.rejects(registerManualPayment({ ...input, idempotencyKey: `${tag}-manual-after-covered` }, { userId: null }), /PAYMENT_AMOUNT_EXCEEDS_BALANCE/);
    await assert.rejects(createProviderPayment({ orderId, idempotencyKey: `${tag}-external-after-manual` }), error => error instanceof Error && "code" in error && error.code === "PAYMENT_ALREADY_CONFIRMED");
  } finally {
    configurePaymentProvider(new UnconfiguredPaymentProvider());
    // Only this invocation's disposable fixture IDs; never a prefix-wide cleanup.
    const fixturePayments = await db.select({ id: payments.id }).from(payments).where(eq(payments.orderId, orderId));
    const fixturePaymentIds = fixturePayments.map(payment => payment.id);
    if (fixturePaymentIds.length) await db.delete(notifications).where(inArray(notifications.dedupeKey, fixturePaymentIds.map(paymentId => `payment:${paymentId}:approved`)));
    // Audit records are append-only and intentionally retained as QA evidence.
    await db.delete(payments).where(eq(payments.orderId, orderId));
    await db.delete(orders).where(eq(orders.id, orderId));
    await db.delete(sales).where(eq(sales.id, saleId));
    await closeDb();
  }
});
