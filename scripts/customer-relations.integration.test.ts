import assert from "node:assert/strict";
import test from "node:test";
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { customerAddresses, customerContacts } from "../src/db/crm-schema";
import { auditLogs, users } from "../src/db/schema";
import { reportSchedules } from "../src/db/reporting-schema";
import { createCustomer, updateCustomer } from "../src/lib/crm-service";
import { addCustomerAddress, addCustomerContact, addCustomerNote } from "../src/lib/customer-operations-service";
import { getCustomer360 } from "../src/lib/customer-repository";

test("QA: contactos y direcciones principales concurrentes, notas y vista360", { skip: process.env.QA_CUSTOMER_RELATIONS !== "1", timeout: 60_000 }, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const db = getDb();
  let customerId: string | undefined;
  let actor: { userId: string; role: string } | undefined;
  try {
    const [reference] = await db.select().from(reportSchedules).where(eq(reportSchedules.id, "report-schedule-e0115752-abcf-47af-a8e9-81716c52ce49"));
    assert.match(reference?.name ?? "", /^QA AUDITORÍA/);
    const [owner] = await db.select().from(users).where(eq(users.id, reference.createdBy));
    assert.equal(owner.status, "ACTIVE");
    actor = { userId: owner.id, role: owner.roleCode ?? owner.role };
    const tag = crypto.randomUUID();
    const customer = await createCustomer({ name: `QA AUDITORÍA — relaciones ${tag}`, email: `qa-${tag}@example.test`, status: "PROSPECT" }, actor);
    customerId = customer.id;
    await assert.rejects(addCustomerContact(customerId, { name: " " }, actor), /nombre.*obligatorio/i);
    await assert.rejects(addCustomerAddress(customerId, { label: "QA", address: " " }, actor), /obligatorios/);
    await assert.rejects(addCustomerNote(customerId, " ", actor), /nota/);
    const contacts = await Promise.all(["A", "B"].map(suffix => addCustomerContact(customer.id, { name: ` QA AUDITORÍA ${suffix} `, email: `QA-${suffix}@EXAMPLE.TEST`, isPrimary: true }, actor!)));
    const addresses = await Promise.all(["A", "B"].map(suffix => addCustomerAddress(customer.id, { label: `QA ${suffix}`, address: "QA AUDITORÍA — dirección ficticia; no despachar", isPrimary: true }, actor!)));
    const note = await addCustomerNote(customer.id, "  QA AUDITORÍA — nota interna de prueba  ", actor);
    const detail = await getCustomer360(customer.id);
    assert.ok(detail);
    const contactPrimaries = detail.contacts.filter(row => row.isPrimary).length;
    const addressPrimaries = detail.addresses.filter(row => row.isPrimary).length;
    console.log(JSON.stringify({ customerId, contactIds: contacts.map(row => row.id), addressIds: addresses.map(row => row.id), noteId: note.id, contactPrimaries, addressPrimaries }));
    assert.equal(contactPrimaries, 1);
    assert.equal(addressPrimaries, 1);
    assert.equal(detail.contacts.length, 2);
    assert.equal(detail.addresses.length, 2);
    assert.ok(detail.contacts.every(row => row.name === row.name.trim() && row.email === row.email?.toLowerCase()));
    assert.ok(detail.notes.some(row => row.id === note.id && row.body === "QA AUDITORÍA — nota interna de prueba"));
    const secondary = await addCustomerContact(customer.id, { name: "QA AUDITORÍA secundario", isPrimary: false }, actor);
    assert.equal(secondary.isPrimary, false);
    assert.equal((await getCustomer360(customer.id))?.contacts.filter(row => row.isPrimary).length, 1);
  } finally {
    try {
      if (customerId && actor) {
        const fixtureId = customerId;
        const fixtureActor = actor;
        await db.transaction(async tx => {
          await tx.update(customerContacts).set({ isPrimary: false, status: "INACTIVE" }).where(eq(customerContacts.customerId, fixtureId));
          await tx.update(customerAddresses).set({ isPrimary: false }).where(eq(customerAddresses.customerId, fixtureId));
          await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: fixtureActor.userId, actorRole: fixtureActor.role, action: "qa.customer_relations_cleanup", entityType: "customer", entityId: fixtureId, metadata: { reason: "QA AUDITORÍA — cerrar fixture sintética y retirar principales de prueba" } });
        });
        await updateCustomer(fixtureId, { status: "INACTIVE" }, fixtureActor, "QA AUDITORÍA — cierre de fixture de relaciones");
      }
    } finally { await closeDb(); }
  }
});
