import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { customers } from "../src/db/crm-schema";
import { orders, payments, sales } from "../src/db/sales-schema";

async function main() {
  assert.equal(process.env.QA_REFUND_UI, "1", "Requiere QA_REFUND_UI=1 en la base QA autorizada.");
  assert.notEqual(process.env.NODE_ENV, "production", "No ejecutar en producción.");
  const db = getDb();
  const customerId = "customer-fa428e1e-cb3a-40ac-86ea-ac3fceb38acd";
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
  assert.match(customer?.name ?? "", /^QA AUDITORÍA/);
  const tag = "qa-refund-ui-20261010";
  const saleId = `${tag}-sale`, orderId = `${tag}-order`, paymentId = `${tag}-payment`;
  const [existing] = await db.select().from(payments).where(eq(payments.id, paymentId));
  if (existing) {
    assert.equal(existing.orderId, orderId);
    assert.equal(existing.metadata?.qa, true);
    assert.equal(existing.amount, "11.00");
    console.log(JSON.stringify({ fixture: tag, paymentId, status: existing.status, reused: true }));
    return;
  }
  await db.transaction(async tx => {
    await tx.insert(sales).values({ id: saleId, code: "QA-REFUND-UI-20261010", customerId, status: "CONFIRMED", channel: "QA AUDITORÍA", subtotal: "11.00", total: "11.00", currency: "PEN", notes: "QA AUDITORÍA — fixture desechable de reembolso UI; sin dinero real, sin productos ni entrega." });
    await tx.insert(orders).values({ id: orderId, code: "QA-PED-REFUND-UI-20261010", saleId, customerId, status: "PAID", deliveryMethod: "PICKUP", customerNameSnapshot: customer.name, customerPhoneSnapshot: "900000006", locationId: "cp-dashboard-v5-location-branch-2", subtotal: "11.00", total: "11.00", currency: "PEN", idempotencyKey: orderId });
    await tx.insert(payments).values({ id: paymentId, orderId, methodType: "MANUAL", method: "CASH", status: "CONFIRMED", amount: "11.00", currency: "PEN", metadata: { qa: true, disposable: true, fixture: tag } });
  });
  console.log(JSON.stringify({ fixture: tag, paymentId, status: "CONFIRMED", created: true }));
}

main().catch(error => { console.error(error instanceof Error ? error.message : "No se pudo preparar fixture QA."); process.exitCode = 1; }).finally(closeDb);
