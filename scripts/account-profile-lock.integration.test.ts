import assert from "node:assert/strict";
import test from "node:test";
import { eq, isNotNull } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { customers } from "../src/db/crm-schema";
import { users } from "../src/db/schema";
import { reportSchedules } from "../src/db/reporting-schema";
import { loadProfileForUpdate } from "../src/lib/account-profile-lock";

test("QA: consulta de guardado de perfil usa bloqueos válidos en PostgreSQL", { skip: process.env.QA_ACCOUNT_PROFILE_LOCK !== "1", timeout: 30_000 }, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const db = getDb();
  try {
    const [reference] = await db.select().from(reportSchedules).where(eq(reportSchedules.id, "report-schedule-e0115752-abcf-47af-a8e9-81716c52ce49"));
    assert.match(reference?.name ?? "", /^QA AUDITORÍA/);
    const [owner] = await db.select().from(users).where(eq(users.id, reference.createdBy));
    assert.equal(owner.status, "ACTIVE");
    try {
      const current = await db.transaction(tx => loadProfileForUpdate(tx, owner.id));
      assert.ok(current);
      assert.equal(current.userName, owner.name);
      const missing = await db.transaction(tx => loadProfileForUpdate(tx, `qa-missing-${crypto.randomUUID()}`));
      assert.equal(missing, null);
      const [linked] = await db.select({ id: customers.id, userId: customers.userId }).from(customers).where(isNotNull(customers.userId)).limit(1);
      assert.ok(linked?.userId, "se necesita un vínculo existente para comprobar el caso con cliente");
      const linkedProfile = await db.transaction(tx => loadProfileForUpdate(tx, linked.userId!));
      assert.equal(linkedProfile?.customerId, linked.id);
      console.log(JSON.stringify({ profileLockQueryValid: true, customerLinked: Boolean(current.customerId), writes: 0 }));
    } catch (error) {
      const cause = (error as { cause?: { code?: string; message?: string } }).cause;
      console.log(JSON.stringify({ postgresCode: cause?.code, postgresMessage: cause?.message }));
      throw new Error("La consulta de bloqueo del perfil falló; revisar el diagnóstico PostgreSQL anterior.");
    }
  } finally { await closeDb(); }
});
