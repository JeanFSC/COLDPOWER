import { createHmac } from "node:crypto";
import fs from "node:fs";
import {
  BASE_URL,
  capture,
  captureSql,
  closeQaBrowser,
  compactError,
  createQaBrowser,
  resultRecord,
  runSql,
  scenarioDir,
  visit,
  writeJson,
} from "./b-helpers.mjs";

const scenario = "01-pagos-confirmacion-tardia";
const runToken = `r3-${Date.now()}`;

function localEnvValue(name) {
  const line = fs.readFileSync(".env.localdb", "utf8").split(/\r?\n/).find((row) => row.startsWith(`${name}=`));
  if (!line) throw new Error(`Falta ${name} en .env.localdb.`);
  return line.slice(name.length + 1).trim().replace(/^['"]|['"]$/g, "");
}

function fixtureRow() {
  const row = runSql("SELECT o.id,o.code,p.id,p.amount,p.currency FROM orders o JOIN payments p ON p.order_id=o.id WHERE o.code='CP16-PED-001' AND p.id='cp-brief16-orders-payment-payment-pending' LIMIT 1;").split(/\r?\n/)[0];
  if (!row) throw new Error("No se encontró el pedido local CP16-PED-001 para el fixture QA.");
  const [orderId, orderCode, paymentId, amount, currency] = row.split("\t");
  return { orderId, orderCode, paymentId, amount, currency };
}

function prepare(orderId, paymentId, status, orderStatus, providerReference, otherPaymentId = null) {
  const otherCleanup = otherPaymentId
    ? `DELETE FROM payment_events WHERE payment_id='${otherPaymentId}'; DELETE FROM payment_attempts WHERE payment_id='${otherPaymentId}'; DELETE FROM payment_status_history WHERE payment_id='${otherPaymentId}'; DELETE FROM payment_refunds WHERE payment_id='${otherPaymentId}'; DELETE FROM payments WHERE id='${otherPaymentId}';`
    : "";
  runSql(`DELETE FROM payment_events WHERE payment_id='${paymentId}'; DELETE FROM payment_attempts WHERE payment_id='${paymentId}'; DELETE FROM payment_status_history WHERE payment_id='${paymentId}'; DELETE FROM payment_refunds WHERE payment_id='${paymentId}'; ${otherCleanup} UPDATE orders SET status='${orderStatus}', cancellation_reason=NULL, cancelled_by=NULL, cancelled_at=NULL, version=version+1, updated_at=NOW() WHERE id='${orderId}'; UPDATE payments SET provider='mock', method='mock', provider_reference='${providerReference}', status='${status}', metadata=NULL, cancellation_reason=NULL, cancelled_by=NULL, cancelled_at=NULL, updated_at=NOW() WHERE id='${paymentId}';`);
}

function addOtherConfirmedPayment(orderId, paymentId, amount, currency, otherPaymentId, providerReference) {
  runSql(`INSERT INTO payments (id,order_id,method_type,method,provider,provider_reference,amount,currency,status,metadata) VALUES ('${otherPaymentId}','${orderId}','PROVIDER','mock','mock','${providerReference}','${amount}','${currency}','CONFIRMED','{}');`);
  return paymentId;
}

async function sendWebhook(page, reference, status, amount, currency, eventId) {
  const raw = JSON.stringify({ eventId, reference, status, amount, currency });
  const signature = createHmac("sha256", localEnvValue("MOCK_PAYMENT_WEBHOOK_SECRET")).update(raw).digest("hex");
  const response = await page.request.post(`${BASE_URL}/api/pagos/webhook/mock`, { data: raw, headers: { "content-type": "application/json", "x-payment-signature": signature } });
  const body = await response.text();
  return { status: response.status(), body: JSON.parse(body) };
}

async function main() {
  const fixture = fixtureRow();
  const session = await createQaBrowser(scenario);
  const { page } = session;
  const evidence = { scenario, runToken, fixture, cases: [] };
  try {
    const cases = [
      { name: "rejected-to-confirmed", from: "REJECTED", order: "PAYMENT_PENDING" },
      { name: "error-to-confirmed", from: "ERROR", order: "PAYMENT_PENDING" },
      { name: "cancelled-to-confirmed-active", from: "CANCELLED", order: "PAYMENT_PENDING" },
    ];
    for (const item of cases) {
      const reference = `${runToken}-${item.name}`;
      const eventId = `${reference}-event`;
      prepare(fixture.orderId, fixture.paymentId, item.from, item.order, reference);
      const first = await sendWebhook(page, reference, "APPROVED", fixture.amount, fixture.currency, eventId);
      const duplicate = await sendWebhook(page, reference, "APPROVED", fixture.amount, fixture.currency, eventId);
      await visit(page, `/admin/pagos?paymentId=${encodeURIComponent(fixture.paymentId)}`);
      await capture(scenario, `01-${item.name}`, page);
      const sql = `SELECT o.code,o.status,p.status,p.metadata->>'requiresRefund' AS requires_refund,p.metadata->>'lateApproval' AS late_approval FROM orders o JOIN payments p ON p.order_id=o.id WHERE p.id='${fixture.paymentId}'; SELECT from_status,to_status,provider,reason FROM payment_status_history WHERE payment_id='${fixture.paymentId}' ORDER BY created_at DESC LIMIT 2; SELECT provider_event_id,event_type FROM payment_events WHERE payment_id='${fixture.paymentId}' ORDER BY created_at DESC LIMIT 2;`;
      const sqlOutput = captureSql(scenario, item.name, sql);
      evidence.cases.push({ name: item.name, from: item.from, webhook: first, duplicate, sqlOutput });
    }

    const otherPaymentId = `${runToken}-other-payment`;
    const otherReference = `${runToken}-other-reference`;
    const lateReference = `${runToken}-late-double-charge`;
    const lateEventId = `${lateReference}-event`;
    prepare(fixture.orderId, fixture.paymentId, "CANCELLED", "PAID", lateReference, otherPaymentId);
    addOtherConfirmedPayment(fixture.orderId, fixture.paymentId, fixture.amount, fixture.currency, otherPaymentId, otherReference);
    const late = await sendWebhook(page, lateReference, "APPROVED", fixture.amount, fixture.currency, lateEventId);
    await visit(page, `/admin/pagos?paymentId=${encodeURIComponent(fixture.paymentId)}`);
    await capture(scenario, "02-double-charge-refund-queue", page);
    const doubleChargeSql = `SELECT o.code,o.status,p.id,p.status,p.metadata->>'requiresRefund' AS requires_refund,p.metadata->>'lateApproval' AS late_approval FROM orders o JOIN payments p ON p.order_id=o.id WHERE o.id='${fixture.orderId}' ORDER BY p.created_at; SELECT action,entity_type,entity_id,metadata FROM audit_logs WHERE entity_id='${fixture.paymentId}' AND action IN ('payments.confirmed_after_order_paid','payments.confirmed_on_cancelled_order') ORDER BY created_at DESC LIMIT 3; SELECT recipient_id,type,title,metadata FROM notifications WHERE metadata->>'paymentId'='${fixture.paymentId}' ORDER BY created_at DESC LIMIT 3;`;
    const doubleChargeOutput = captureSql(scenario, "double-charge-refund-queue", doubleChargeSql);
    evidence.cases.push({ name: "double-charge-order-already-paid", webhook: late, sqlOutput: doubleChargeOutput });

    resultRecord(scenario, { outcome: "COMPLETED", ...evidence });
    console.log(JSON.stringify({ outcome: "COMPLETED", ...evidence }, null, 2));
  } catch (error) {
    await capture(scenario, "error", page).catch(() => undefined);
    writeJson(`${scenarioDir(scenario)}/error.json`, { error: compactError(error), evidence });
    resultRecord(scenario, { outcome: "BLOCKED", error: compactError(error), ...evidence });
    console.log(JSON.stringify({ outcome: "BLOCKED", error: compactError(error), ...evidence }, null, 2));
    process.exitCode = 1;
  } finally {
    await closeQaBrowser(session);
  }
}

await main();
