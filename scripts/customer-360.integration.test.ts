import assert from "node:assert/strict";
import test from "node:test";
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { customers } from "../src/db/crm-schema";
import { users } from "../src/db/schema";
import { reportSchedules } from "../src/db/reporting-schema";
import { updateCustomer } from "../src/lib/crm-service";
import { validateCustomerInput } from "../src/lib/crm-validation";
import { getCustomer360 } from "../src/lib/customer-repository";

test("QA: edición parcial y relaciones 360 del cliente existente", { skip: process.env.QA_CUSTOMER_360 !== "1", timeout: 60_000 }, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const db = getDb();
  const customerId = "customer-fa428e1e-cb3a-40ac-86ea-ac3fceb38acd";
  let restore: (() => Promise<unknown>) | undefined;
  try {
    const [before] = await db.select().from(customers).where(eq(customers.id, customerId));
    assert.match(before?.name ?? "", /^QA AUDITORÍA/);
    const [reference] = await db.select().from(reportSchedules).where(eq(reportSchedules.id, "report-schedule-e0115752-abcf-47af-a8e9-81716c52ce49"));
    assert.match(reference?.name ?? "", /^QA AUDITORÍA/);
    const [owner] = await db.select().from(users).where(eq(users.id, reference.createdBy));
    assert.equal(owner.status, "ACTIVE");
    const actor = { userId: owner.id, role: owner.roleCode ?? owner.role };
    await assert.rejects(updateCustomer(customerId, { notes: "QA AUDITORÍA" }, actor), /motivo|razón/i);
    restore = () => updateCustomer(customerId, { name: before.name, notes: before.notes }, actor, "QA AUDITORÍA — restaurar datos originales");
    const notes = `QA AUDITORÍA — edición parcial ${crypto.randomUUID()}`;
    const updated = await updateCustomer(customerId, validateCustomerInput({ notes }, true), actor, "QA AUDITORÍA — validar edición parcial");
    assert.equal(updated.name, before.name);
    const detail = await getCustomer360(customerId, { pageSize: 100 }, { includeFinancial: true });
    assert.ok(detail);
    assert.equal(detail.customer.notes, notes);
    assert.equal(detail.customer.name, before.name);
    for (const relation of [detail.quotes, detail.opportunities, detail.sales, detail.orders, detail.payments]) {
      assert.ok(relation);
      assert.ok(relation.totalItems >= 2, "los dos flujos QA deben aparecer en la vista 360");
      assert.ok(relation.items.length >= 2);
    }
    const restricted = await getCustomer360(customerId, { pageSize: 1 }, { includeSales: false, includePayments: false, includeOrders: false });
    assert.ok(restricted);
    assert.equal(restricted.sales, null);
    assert.equal(restricted.payments, null);
    assert.equal(restricted.orders, null);
    assert.equal(restricted.quotes.items.length, 1);
    assert.ok(restricted.quotes.totalPages >= 2);
    const page2 = await getCustomer360(customerId, { pageSize: 1, quotesPage: 2 });
    assert.ok(page2);
    assert.equal(page2.quotes.items.length, 1);
    assert.notDeepEqual(page2.quotes.items, restricted.quotes.items);
    console.log(JSON.stringify({ customerId, namePreserved: true, relations: { quotes: detail.quotes.totalItems, opportunities: detail.opportunities.totalItems, sales: detail.sales?.totalItems, orders: detail.orders?.totalItems, payments: detail.payments?.totalItems }, paginationVerified: true, projectionFlagsVerified: true }));
  } finally {
    try { if (restore) await restore(); }
    finally { await closeDb(); }
  }
});
