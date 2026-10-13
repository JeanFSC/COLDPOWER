import assert from "node:assert/strict";
import test from "node:test";
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { users } from "../src/db/schema";
import { suppliers } from "../src/db/purchases-schema";
import { reportSchedules } from "../src/db/reporting-schema";
import { createSupplier, updateSupplier } from "../src/lib/purchases-service";
import { validateSupplierInput } from "../src/lib/purchases-validation";

test("QA: identidad de proveedor no se duplica en creación concurrente o edición", { skip: process.env.QA_SUPPLIER_IDENTITY !== "1", timeout: 60_000 }, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const db = getDb();
  const tag = `qa-supplier-${crypto.randomUUID()}`;
  const fixtureIds: string[] = [];
  let actor: { userId: string; role: string } | undefined;
  try {
    const [reference] = await db.select().from(reportSchedules).where(eq(reportSchedules.id, "report-schedule-e0115752-abcf-47af-a8e9-81716c52ce49"));
    assert.match(reference?.name ?? "", /^QA AUDITORÍA/);
    const [owner] = await db.select().from(users).where(eq(users.id, reference.createdBy));
    assert.equal(owner.status, "ACTIVE");
    actor = { userId: owner.id, role: owner.roleCode ?? owner.role };
    const input = validateSupplierInput({ name: `QA AUDITORÍA — ${tag}`, country: "PE", currency: "PEN", email: `${tag}@example.test`, identification: tag, notes: "QA AUDITORÍA — identidad sintética, sin proveedor real" });
    const creates = await Promise.allSettled([createSupplier(input, actor), createSupplier(input, actor)]);
    for (const result of creates) if (result.status === "fulfilled") fixtureIds.push(result.value.id);
    const first = creates.find(result => result.status === "fulfilled");
    assert.ok(first?.status === "fulfilled");
    const second = await createSupplier({ ...input, name: `${input.name}-B`, email: `${tag}-b@example.test`, identification: `${tag}-b` }, actor);
    fixtureIds.push(second.id);
    let emailRejected = false, identificationRejected = false;
    try { await updateSupplier(second.id, { email: input.email }, actor, "QA AUDITORÍA — debe rechazar duplicado"); }
    catch (error) { emailRejected = error instanceof Error && /misma identificación o correo/.test(error.message); }
    try { await updateSupplier(second.id, { identification: input.identification }, actor, "QA AUDITORÍA — debe rechazar duplicado"); }
    catch (error) { identificationRejected = error instanceof Error && /misma identificación o correo/.test(error.message); }
    console.log(JSON.stringify({ tag, creates: creates.map(result => result.status), emailRejected, identificationRejected, fixtureIds }));
    assert.equal(creates.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(emailRejected, true);
    assert.equal(identificationRejected, true);
    const [unchanged] = await db.select().from(suppliers).where(eq(suppliers.id, second.id));
    assert.equal(unchanged.email, `${tag}-b@example.test`);
    assert.equal(unchanged.identification, `${tag}-b`);
    assert.equal((await updateSupplier(first.value.id, { email: input.email, identification: input.identification, contactName: "QA AUDITORÍA" }, actor, "QA AUDITORÍA — identidad propia permitida")).contactName, "QA AUDITORÍA");
    const sharedEmail = `${tag}-shared@example.test`;
    const edits = await Promise.allSettled([first.value.id, second.id].map(id => updateSupplier(id, { email: sharedEmail }, actor!, "QA AUDITORÍA — edición concurrente")));
    assert.equal(edits.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(edits.filter(result => result.status === "rejected").length, 1);
    const uppercase = await Promise.allSettled([createSupplier({ ...input, identification: `${tag}-uppercase`, email: sharedEmail.toUpperCase() }, actor)]);
    for (const result of uppercase) if (result.status === "fulfilled") fixtureIds.push(result.value.id);
    assert.equal(uppercase[0].status, "rejected");
    console.log(JSON.stringify({ tag, concurrentEdits: edits.map(result => result.status), caseInsensitiveDuplicateRejected: true }));
  } finally {
    try { if (actor) for (const [index, fixtureId] of fixtureIds.entries()) assert.equal((await updateSupplier(fixtureId, { status: "INACTIVE", email: `${tag}-closed-${index}@example.test`, identification: `${tag}-closed-${index}` }, actor, "QA AUDITORÍA — cerrar fixture con identidad única")).status, "INACTIVE"); }
    finally { await closeDb(); }
  }
});
