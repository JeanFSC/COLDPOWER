import assert from "node:assert/strict";
import test from "node:test";
import { Webhook } from "svix";
import { and, count, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, clerkWebhookEvents, users } from "@/db/schema";

const secret = process.env.CLERK_WEBHOOK_SECRET;

function signedHeaders(messageId: string, payload: string, timestamp = new Date()) {
  if (!secret) throw new Error("CLERK_WEBHOOK_SECRET no configurado para la prueba runtime.");
  return {
    "content-type": "application/json",
    "svix-id": messageId,
    "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
    "svix-signature": new Webhook(secret).sign(messageId, timestamp, payload),
  };
}

async function post(base: string, payload: string, headers: Record<string, string>) {
  return fetch(`${base}/api/webhooks/clerk`, { method: "POST", headers, body: payload });
}

test("CP-050 webhook Clerk es firmado, idempotente y sincroniza el usuario", async (t) => {
  if (!secret) {
    t.skip("CLERK_WEBHOOK_SECRET no configurado en el entorno runtime");
    return;
  }

  const db = getDb();
  const suffix = crypto.randomUUID();
  const userId = `user_cp050_${suffix.replaceAll("-", "")}`;
  const outOfOrderUserId = `user_cp050_ooo_${suffix.replaceAll("-", "")}`;
  const email = `cp050-${suffix}@example.invalid`;
  const payload = JSON.stringify({ type: "user.created", data: { id: userId, email_addresses: [{ id: "email_1", email_address: email }], primary_email_address_id: "email_1", first_name: "CP-050", last_name: "QA", phone_numbers: [] } });
  const eventId = `msg_cp050_${suffix.replaceAll("-", "")}`;

  try {
    const created = await post("http://localhost:3000", payload, signedHeaders(eventId, payload));
    assert.equal(created.status, 200);
    const retry = await post("https://dev.coldpower.pe", payload, signedHeaders(eventId, payload));
    assert.equal(retry.status, 200);
    const [stored] = await db.select({ id: users.id, status: users.status }).from(users).where(eq(users.id, userId)).limit(1);
    assert.deepEqual(stored, { id: userId, status: "ACTIVE" });
    const [duplicates] = await db.select({ total: count() }).from(users).where(eq(users.email, email));
    assert.equal(Number(duplicates?.total ?? 0), 1);

    const concurrentEventId = `msg_cp050_concurrent_${suffix.replaceAll("-", "")}`;
    const concurrent = await Promise.all([
      post("http://localhost:3000", payload, signedHeaders(concurrentEventId, payload)),
      post("https://dev.coldpower.pe", payload, signedHeaders(concurrentEventId, payload)),
    ]);
    assert.ok(concurrent.every((response) => response.status === 200 || response.status === 202));
    const [processedCopies] = await db.select({ total: count() }).from(auditLogs).where(and(eq(auditLogs.action, "clerk.webhook_processed"), eq(auditLogs.entityType, "clerk_webhook"), eq(auditLogs.entityId, concurrentEventId)));
    assert.equal(Number(processedCopies?.total ?? 0), 1);

    const outOfOrderCreatedPayload = JSON.stringify({ type: "user.created", data: { id: outOfOrderUserId, email_addresses: [{ id: "email_ooo", email_address: `ooo-${suffix}@example.invalid` }], primary_email_address_id: "email_ooo", first_name: "CP-050", last_name: "Fuera de orden", phone_numbers: [] } });
    const outOfOrderDeletedPayload = JSON.stringify({ type: "user.deleted", data: { id: outOfOrderUserId, email_addresses: [], primary_email_address_id: null, first_name: null, last_name: null, phone_numbers: [] } });
    const outOfOrderDeletedId = `msg_cp050_ooo_delete_${suffix.replaceAll("-", "")}`;
    const outOfOrderCreatedId = `msg_cp050_ooo_create_${suffix.replaceAll("-", "")}`;
    assert.equal((await post("http://localhost:3000", outOfOrderDeletedPayload, signedHeaders(outOfOrderDeletedId, outOfOrderDeletedPayload))).status, 200);
    assert.equal((await post("http://localhost:3000", outOfOrderCreatedPayload, signedHeaders(outOfOrderCreatedId, outOfOrderCreatedPayload))).status, 200);
    const [outOfOrderUser] = await db.select({ email: users.email, status: users.status, clerkSyncStatus: users.clerkSyncStatus }).from(users).where(eq(users.id, outOfOrderUserId)).limit(1);
    assert.deepEqual(outOfOrderUser, { email: `ooo-${suffix}@example.invalid`, status: "INACTIVE", clerkSyncStatus: "DELETED" });

    const updatePayload = JSON.stringify({ type: "user.updated", data: { id: userId, email_addresses: [{ id: "email_1", email_address: email }], primary_email_address_id: "email_1", first_name: "CP-050 actualizado", last_name: "QA", phone_numbers: [] } });
    const updated = await post("https://dev.coldpower.pe", updatePayload, signedHeaders(`msg_cp050_update_${suffix.replaceAll("-", "")}`, updatePayload));
    assert.equal(updated.status, 200);

    const deletedPayload = JSON.stringify({ type: "user.deleted", data: { id: userId, email_addresses: [], primary_email_address_id: null, first_name: null, last_name: null, phone_numbers: [] } });
    const deleted = await post("http://localhost:3000", deletedPayload, signedHeaders(`msg_cp050_delete_${suffix.replaceAll("-", "")}`, deletedPayload));
    assert.equal(deleted.status, 200);
    const [inactive] = await db.select({ status: users.status }).from(users).where(eq(users.id, userId)).limit(1);
    assert.equal(inactive?.status, "INACTIVE");

    const invalidSignature = await post("https://dev.coldpower.pe", payload, { ...signedHeaders(`msg_cp050_bad_${suffix.replaceAll("-", "")}`, payload), "svix-signature": "v1-invalid" });
    assert.equal(invalidSignature.status, 400);
    const invalidPayload = JSON.stringify({ type: "user.created", data: {} });
    const invalidStructure = await post("http://localhost:3000", invalidPayload, signedHeaders(`msg_cp050_invalid_${suffix.replaceAll("-", "")}`, invalidPayload));
    assert.equal(invalidStructure.status, 400);
  } finally {
    await db.delete(clerkWebhookEvents).where(eq(clerkWebhookEvents.id, eventId));
    await db.delete(clerkWebhookEvents).where(eq(clerkWebhookEvents.id, `msg_cp050_concurrent_${suffix.replaceAll("-", "")}`));
    await db.delete(clerkWebhookEvents).where(eq(clerkWebhookEvents.id, `msg_cp050_ooo_delete_${suffix.replaceAll("-", "")}`));
    await db.delete(clerkWebhookEvents).where(eq(clerkWebhookEvents.id, `msg_cp050_ooo_create_${suffix.replaceAll("-", "")}`));
    await db.delete(clerkWebhookEvents).where(and(eq(clerkWebhookEvents.eventType, "user.updated"), eq(clerkWebhookEvents.id, `msg_cp050_update_${suffix.replaceAll("-", "")}`)));
    await db.delete(clerkWebhookEvents).where(and(eq(clerkWebhookEvents.eventType, "user.deleted"), eq(clerkWebhookEvents.id, `msg_cp050_delete_${suffix.replaceAll("-", "")}`)));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(users).where(eq(users.id, outOfOrderUserId));
  }
});
