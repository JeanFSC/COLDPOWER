import assert from "node:assert/strict";
import test from "node:test";
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { customers, opportunities } from "../src/db/crm-schema";
import { recordCrmContact } from "../src/lib/crm-contact";

test("QA: contacto conserva fecha máxima y revierte todas las escrituras", { skip: process.env.QA_CRM_CONTACT !== "1" }, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const customerId = "customer-fa428e1e-cb3a-40ac-86ea-ac3fceb38acd";
  const opportunityId = "opportunity-24c1067f-7837-42ae-bd29-06e0518335b5";
  const rollback = new Error("QA_CONTACT_ROLLBACK");
  try {
    await assert.rejects(getDb().transaction(async tx => {
      const [customer] = await tx.select().from(customers).where(eq(customers.id, customerId));
      const [opportunity] = await tx.select().from(opportunities).where(eq(opportunities.id, opportunityId));
      assert.match(customer.name, /^QA AUDITORÍA/);
      assert.equal(opportunity.customerId, customerId);
      await tx.update(customers).set({ lastActivityAt: null }).where(eq(customers.id, customerId));
      await tx.update(opportunities).set({ lastContactAt: null }).where(eq(opportunities.id, opportunityId));
      const recent = new Date("2026-10-13T12:34:56.789Z");
      await recordCrmContact(tx, customerId, opportunityId, recent);
      await recordCrmContact(tx, customerId, opportunityId, new Date("2026-10-12T00:00:00Z"));
      const [afterCustomer] = await tx.select().from(customers).where(eq(customers.id, customerId));
      const [afterOpportunity] = await tx.select().from(opportunities).where(eq(opportunities.id, opportunityId));
      assert.equal(afterCustomer.lastActivityAt?.toISOString(), recent.toISOString());
      assert.equal(afterOpportunity.lastContactAt?.toISOString(), recent.toISOString());
      await recordCrmContact(tx, null, null, recent);
      throw rollback;
    }), error => error === rollback);
  } finally { await closeDb(); }
});
