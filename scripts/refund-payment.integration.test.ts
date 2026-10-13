import assert from "node:assert/strict";
import test from "node:test";
import { eq, inArray } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { customers } from "../src/db/crm-schema";
import { orders, paymentRefunds, payments, paymentStatusHistory, sales } from "../src/db/sales-schema";
import { auditLogs } from "../src/db/schema";
import { refundPayment } from "../src/lib/payment-service";
import { summarizePaymentLedger } from "../src/lib/payments-contract";

test("QA: reembolso valida centavos y vincula idempotencia al pago", { skip: process.env.QA_REFUNDS !== "1" }, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const db = getDb();
  const customerId = "customer-fa428e1e-cb3a-40ac-86ea-ac3fceb38acd";
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
  assert.match(customer?.name ?? "", /^QA AUDITORÍA/);
  const tag = `qa-refund-${crypto.randomUUID()}`;
  const saleId = `${tag}-sale`, orderId = `${tag}-order`;
  const paymentIds = [`${tag}-a`, `${tag}-b`];
  const reason = "QA AUDITORÍA — devolución simulada, sin dinero real";
  try {
    await db.insert(sales).values({ id: saleId, code: saleId, customerId, status: "CONFIRMED", channel: "QA AUDITORÍA", subtotal: "22.00", total: "22.00", currency: "PEN", notes: reason });
    await db.insert(orders).values({ id: orderId, code: orderId, saleId, customerId, status: "PAID", deliveryMethod: "PICKUP", customerNameSnapshot: customer.name, customerPhoneSnapshot: "900000006", locationId: "cp-dashboard-v5-location-branch-2", subtotal: "22.00", total: "22.00", currency: "PEN", idempotencyKey: orderId });
    await db.insert(payments).values(paymentIds.map(id => ({ id, orderId, methodType: "MANUAL" as const, method: "CASH", status: "CONFIRMED" as const, amount: "11.00", currency: "PEN", metadata: { qa: true } })));
    let precisionRejected = false;
    try { await refundPayment(paymentIds[0], { amount: "1.001", reason, idempotencyKey: `${tag}-precision` }, { userId: null }); }
    catch (error) { precisionRejected = error instanceof Error && "code" in error && error.code === "PAYMENT_REFUND_AMOUNT_INVALID"; }
    const first = await refundPayment(paymentIds[0], { amount: "2.00", reason, idempotencyKey: `${tag}-replay` }, { userId: null });
    const replay = await refundPayment(paymentIds[0], { amount: "2.00", reason, idempotencyKey: `${tag}-replay` }, { userId: null });
    assert.equal(replay.refund.id, first.refund.id);
    assert.equal(replay.idempotent, true);
    let foreignPaymentRejected = false;
    try { await refundPayment(paymentIds[1], { amount: "2.00", reason, idempotencyKey: `${tag}-replay` }, { userId: null }); }
    catch (error) { foreignPaymentRejected = error instanceof Error && "code" in error && error.code === "PAYMENT_REFUND_IDEMPOTENCY_CONFLICT"; }
    console.log(JSON.stringify({ tag, precisionRejected, foreignPaymentRejected, firstRefund: first.refund.id }));
    assert.equal(precisionRejected, true);
    assert.equal(foreignPaymentRejected, true);
    for (const invalid of ["", "0", "-1", "NaN", "Infinity", "1e1", "1.999", "12"]) {
      await assert.rejects(refundPayment(paymentIds[0], { amount: invalid, reason, idempotencyKey: `${tag}-invalid-${invalid}` }, { userId: null }), error => error instanceof Error && "code" in error && error.code === "PAYMENT_REFUND_AMOUNT_INVALID");
    }
    await assert.rejects(refundPayment(paymentIds[0], { amount: "3.00", reason, idempotencyKey: `${tag}-replay` }, { userId: null }), error => error instanceof Error && "code" in error && error.code === "PAYMENT_REFUND_IDEMPOTENCY_CONFLICT");
    const competing = await Promise.allSettled([1, 2].map(attempt => refundPayment(paymentIds[0], { amount: "6.00", reason, idempotencyKey: `${tag}-competing-${attempt}` }, { userId: null })));
    assert.equal(competing.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(competing.filter(result => result.status === "rejected").length, 1);
    await refundPayment(paymentIds[0], { amount: "3.00", reason, idempotencyKey: `${tag}-remainder-a` }, { userId: null });
    const duplicate = await Promise.all([1, 2].map(() => refundPayment(paymentIds[1], { amount: "4.00", reason, idempotencyKey: `${tag}-duplicate` }, { userId: null })));
    assert.equal(duplicate[0].refund.id, duplicate[1].refund.id);
    assert.equal(duplicate.filter(result => result.idempotent).length, 1);
    await refundPayment(paymentIds[1], { reason, idempotencyKey: `${tag}-remainder-b` }, { userId: null });
    const finalPayments = await db.select().from(payments).where(inArray(payments.id, paymentIds));
    const refunds = await db.select().from(paymentRefunds).where(inArray(paymentRefunds.paymentId, paymentIds));
    assert.equal(refunds.length, 5);
    assert.ok(finalPayments.every(payment => payment.status === "REFUNDED"));
    const history = await db.select().from(paymentStatusHistory).where(inArray(paymentStatusHistory.paymentId, paymentIds));
    assert.equal(history.filter(row => row.toStatus === "REFUNDED").length, 2);
    const audit = await db.select().from(auditLogs).where(inArray(auditLogs.entityId, paymentIds));
    assert.equal(audit.filter(row => row.action === "payments.refund_requested").length, 5);
    assert.equal(audit.filter(row => row.action === "payments.refund_confirmed").length, 5);
    const ledger = summarizePaymentLedger(22, finalPayments, refunds);
    assert.equal(ledger.refunded, 22);
    assert.equal(ledger.net, 0);
    console.log(JSON.stringify({ tag, concurrentLimit: "respected", duplicateRefunds: 0, ledger }));
  } finally {
    // Exact disposable IDs only. Append-only audit evidence remains.
    await db.delete(paymentRefunds).where(inArray(paymentRefunds.paymentId, paymentIds));
    await db.delete(payments).where(inArray(payments.id, paymentIds));
    await db.delete(orders).where(eq(orders.id, orderId));
    await db.delete(sales).where(eq(sales.id, saleId));
    await closeDb();
  }
});
