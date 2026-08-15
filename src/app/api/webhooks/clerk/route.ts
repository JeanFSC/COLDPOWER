import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { and, eq, lt, sql } from "drizzle-orm";
import { authConfig } from "@/lib/env";
import { isAppRole, isStaffRole, setUserRole, type AppRole } from "@/lib/auth";
import { getDb } from "@/db";
import { auditLogs, clerkWebhookEvents, users } from "@/db/schema";
import { syncClerkRoleFromMetadata } from "@/lib/user-administration";

type ClerkEmailAddress = { id: string; email_address: string };
type ClerkPhoneNumber = { phone_number: string };
type ClerkUserPayload = { id: string; user_id?: string; email_addresses: ClerkEmailAddress[]; primary_email_address_id: string | null; first_name: string | null; last_name: string | null; phone_numbers: ClerkPhoneNumber[]; public_metadata?: { role?: unknown; firstName?: unknown; lastName?: unknown }; last_sign_in_at?: number | null; created_at?: number | null };
type ClerkWebhookEventType = "user.created" | "user.updated" | "user.deleted" | "session.created";
type ClerkWebhookEvent = { type: ClerkWebhookEventType; data: ClerkUserPayload };
class ClerkWebhookPayloadError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
function parseClerkWebhookEvent(value: unknown): ClerkWebhookEvent {
  if (!isRecord(value) || typeof value.type !== "string" || !["user.created", "user.updated", "user.deleted", "session.created"].includes(value.type) || !isRecord(value.data)) throw new ClerkWebhookPayloadError("Payload de webhook inválido.");
  const type = value.type as ClerkWebhookEventType;
  const data = value.data;
  if (type === "session.created") {
    if (typeof data.user_id !== "string" || !data.user_id.trim()) throw new ClerkWebhookPayloadError("Payload de webhook inválido.");
    return { type, data: { ...data, id: typeof data.id === "string" ? data.id : data.user_id, email_addresses: Array.isArray(data.email_addresses) ? data.email_addresses as ClerkEmailAddress[] : [], primary_email_address_id: typeof data.primary_email_address_id === "string" ? data.primary_email_address_id : null, first_name: typeof data.first_name === "string" ? data.first_name : null, last_name: typeof data.last_name === "string" ? data.last_name : null, phone_numbers: Array.isArray(data.phone_numbers) ? data.phone_numbers as ClerkPhoneNumber[] : [] } as ClerkUserPayload };
  }
  if (typeof data.id !== "string" || !data.id.trim() || (type === "user.created" && !Array.isArray(data.email_addresses))) throw new ClerkWebhookPayloadError("Payload de webhook inválido.");
  return { type, data: { ...data, email_addresses: Array.isArray(data.email_addresses) ? data.email_addresses as ClerkEmailAddress[] : [], primary_email_address_id: typeof data.primary_email_address_id === "string" ? data.primary_email_address_id : null, first_name: typeof data.first_name === "string" ? data.first_name : null, last_name: typeof data.last_name === "string" ? data.last_name : null, phone_numbers: Array.isArray(data.phone_numbers) ? data.phone_numbers as ClerkPhoneNumber[] : [] } as ClerkUserPayload };
}

export async function POST(request: Request) {
  if (!authConfig.webhookSecret) return NextResponse.json({ error: "Webhook no configurado." }, { status: 500 });
  const payload = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) return NextResponse.json({ error: "Faltan headers de svix." }, { status: 400 });
  let event: ClerkWebhookEvent;
  try { event = parseClerkWebhookEvent(new Webhook(authConfig.webhookSecret).verify(payload, { "svix-id": svixId, "svix-timestamp": svixTimestamp, "svix-signature": svixSignature })); } catch (error) { if (error instanceof ClerkWebhookPayloadError) return NextResponse.json({ error: "Payload de webhook inválido." }, { status: 400 }); return NextResponse.json({ error: "Firma de webhook inválida." }, { status: 400 }); }
  const db = getDb();
  const claim = await claimWebhookEvent(svixId, event.type);
  if (claim === "PROCESSED") return NextResponse.json({ received: true, idempotent: true });
  if (claim === "IN_PROGRESS") return NextResponse.json({ received: true, idempotent: true, processing: true }, { status: 202 });
  try {
    if (event.type === "user.created") await handleUserCreated(event.data);
    if (event.type === "user.updated") await handleUserUpdated(event.data);
    if (event.type === "user.deleted") await handleUserDeleted(event.data);
    if (event.type === "session.created" && event.data.user_id) await handleSessionCreated(event.data.user_id, event.data.created_at);
    await db.update(clerkWebhookEvents).set({ status: "PROCESSED", processedAt: new Date(), error: null }).where(eq(clerkWebhookEvents.id, svixId));
    await db.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: null, actorRole: "SYSTEM", action: "clerk.webhook_processed", entityType: "clerk_webhook", entityId: svixId, before: null, after: { type: event.type, status: "PROCESSED" }, metadata: { source: "clerk" } });
  } catch (error) {
    await db.update(clerkWebhookEvents).set({ status: "FAILED", error: error instanceof Error ? error.message.slice(0, 500) : "Webhook failed" }).where(eq(clerkWebhookEvents.id, svixId));
    console.error("ColdPower: fallo procesando webhook de Clerk", error);
    return NextResponse.json({ error: "Fallo al procesar el evento." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}

type WebhookClaim = "CLAIMED" | "PROCESSED" | "IN_PROGRESS";
const webhookClaimTimeoutMs = 5 * 60 * 1000;

async function claimWebhookEvent(id: string, eventType: ClerkWebhookEventType): Promise<WebhookClaim> {
  return getDb().transaction(async (tx) => {
    const [inserted] = await tx.insert(clerkWebhookEvents).values({ id, eventType, status: "PROCESSING" }).onConflictDoNothing({ target: clerkWebhookEvents.id }).returning({ id: clerkWebhookEvents.id });
    if (inserted) return "CLAIMED";

    const [existing] = await tx.select({ status: clerkWebhookEvents.status, receivedAt: clerkWebhookEvents.receivedAt }).from(clerkWebhookEvents).where(eq(clerkWebhookEvents.id, id)).limit(1);
    if (!existing || existing.status === "PROCESSED") return existing?.status === "PROCESSED" ? "PROCESSED" : "IN_PROGRESS";
    const staleBefore = new Date(Date.now() - webhookClaimTimeoutMs);
    const canRetry = existing.status === "FAILED" || existing.status === "PENDING" || (existing.status === "PROCESSING" && existing.receivedAt < staleBefore);
    if (!canRetry) return "IN_PROGRESS";

    const [reclaimed] = await tx.update(clerkWebhookEvents).set({ eventType, status: "PROCESSING", receivedAt: new Date(), processedAt: null, error: null }).where(and(eq(clerkWebhookEvents.id, id), eq(clerkWebhookEvents.status, existing.status), ...(existing.status === "PROCESSING" ? [lt(clerkWebhookEvents.receivedAt, staleBefore)] : []))).returning({ id: clerkWebhookEvents.id });
    return reclaimed ? "CLAIMED" : "IN_PROGRESS";
  });
}

function primaryEmail(data: ClerkUserPayload) {
  const match = data.email_addresses.find((entry) => entry.id === data.primary_email_address_id);
  return match?.email_address ?? data.email_addresses[0]?.email_address ?? null;
}

function fullName(data: ClerkUserPayload) {
  const metadataName = [data.public_metadata?.firstName, data.public_metadata?.lastName].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  const name = metadataName.length ? metadataName : [data.first_name, data.last_name].filter(Boolean);
  return name.join(" ").trim() || null;
}

function metadataRole(data: ClerkUserPayload): AppRole | null {
  const role = data.public_metadata?.role;
  return isAppRole(role) ? role : null;
}

async function handleUserCreated(data: ClerkUserPayload) {
  const email = primaryEmail(data);
  if (!email) return;
  const role = metadataRole(data);
  const accountRole = role === "admin" || role === "customer" ? role : "customer";
  const roleCode = role && isStaffRole(role) && role !== "admin" ? role : null;
  const [existing] = await getDb().select({ clerkSyncStatus: users.clerkSyncStatus }).from(users).where(eq(users.id, data.id)).limit(1);
  if (existing?.clerkSyncStatus === "DELETED") {
    await getDb().update(users).set({ email, name: fullName(data), phone: data.phone_numbers[0]?.phone_number ?? null, role: accountRole, roleCode, status: "INACTIVE", updatedAt: new Date() }).where(eq(users.id, data.id));
    return;
  }
  await getDb().insert(users).values({ id: data.id, email, name: fullName(data), phone: data.phone_numbers[0]?.phone_number ?? null, role: accountRole, roleCode, status: "ACTIVE", lastSignInAt: data.last_sign_in_at ? new Date(data.last_sign_in_at) : null }).onConflictDoNothing({ target: users.id });
  if (role && isStaffRole(role)) {
    try {
      await setUserRole(data.id, role);
      await getDb().update(users).set({ clerkSyncStatus: "SYNCED", clerkSyncError: null, clerkSyncedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, data.id));
    } catch (error) {
      await getDb().update(users).set({ clerkSyncStatus: "PENDING", clerkSyncError: error instanceof Error ? error.message.slice(0, 500) : "Clerk no confirmó el rol.", updatedAt: new Date() }).where(eq(users.id, data.id));
      throw error;
    }
  }
}

async function handleUserUpdated(data: ClerkUserPayload) {
  const email = primaryEmail(data);
  const role = metadataRole(data);
  await getDb().update(users).set({
    ...(email ? { email } : {}),
    name: fullName(data),
    phone: data.phone_numbers[0]?.phone_number ?? null,
    ...(data.last_sign_in_at ? { lastSignInAt: new Date(data.last_sign_in_at) } : {}),
    updatedAt: new Date(),
  }).where(eq(users.id, data.id));

  // Role changes from Clerk must use the same transaction and last-admin
  // protection as the internal admin API, then leave an audit trail.
  if (role) {
    const result = await syncClerkRoleFromMetadata(data.id, role);
    if (result.blocked) {
      try {
        await setUserRole(data.id, "SUPERADMIN");
      } catch (error) {
        console.error("ColdPower: no se pudo restaurar el rol SUPERADMIN en Clerk", error);
      }
    }
  }
}

async function handleSessionCreated(userId: string, createdAt?: number | null) {
  await getDb().update(users).set({ lastSignInAt: createdAt ? new Date(createdAt) : new Date(), updatedAt: new Date() }).where(eq(users.id, userId));
}

async function handleUserDeleted(data: ClerkUserPayload) {
  const deactivatedAuditId = `audit-${crypto.randomUUID()}`;
  const blockedAuditId = `audit-${crypto.randomUUID()}`;
  const existing = await getDb().select({ id: users.id }).from(users).where(eq(users.id, data.id)).limit(1);
  if (!existing.length) {
    await getDb().insert(users).values({ id: data.id, email: `clerk-deleted-${data.id}@invalid.local`, role: "customer", roleCode: null, status: "INACTIVE", clerkSyncStatus: "DELETED", clerkSyncedAt: new Date() }).onConflictDoNothing({ target: users.id });
    await getDb().insert(auditLogs).values({ id: deactivatedAuditId, actorId: null, actorRole: "SYSTEM", action: "access.user_deletion_tombstone", entityType: "user", entityId: data.id, before: null, after: { status: "INACTIVE", reason: "user.deleted arrived before user.created" }, metadata: { source: "clerk.user.deleted" } });
    return;
  }
  await getDb().execute(sql`
    WITH lock_guard AS (
      SELECT pg_advisory_xact_lock(hashtext('coldpower:superadmin-safety')) AS locked
    ), target AS (
      SELECT u.id, u.role_code, u.status
      FROM users u, lock_guard
      WHERE u.id = ${data.id}
      FOR UPDATE
    ), active_superadmins AS (
      SELECT count(*)::int AS total
      FROM users u, lock_guard
      WHERE u.role_code = 'SUPERADMIN' AND u.status = 'ACTIVE'
    ), deactivated AS (
      UPDATE users u
      SET status = 'INACTIVE', updated_at = NOW()
      FROM target t, active_superadmins s
      WHERE u.id = t.id
        AND t.status = 'ACTIVE'
        AND NOT (t.role_code IS NOT DISTINCT FROM 'SUPERADMIN' AND s.total <= 1)
      RETURNING u.id, t.role_code, t.status AS before_status
    ), blocked AS (
      SELECT t.id, t.role_code, t.status AS before_status
      FROM target t, active_superadmins s
      WHERE t.status = 'ACTIVE' AND t.role_code = 'SUPERADMIN' AND s.total <= 1
    ), audit_rows AS MATERIALIZED (
      SELECT ${deactivatedAuditId} AS id, 'access.user_deactivated' AS action, d.id AS entity_id,
        jsonb_build_object('status', d.before_status, 'roleCode', d.role_code) AS before_value,
        jsonb_build_object('status', 'INACTIVE', 'roleCode', d.role_code) AS after_value,
        jsonb_build_object('source', 'clerk.user.deleted') AS metadata_value
      FROM deactivated d
      UNION ALL
      SELECT ${blockedAuditId} AS id, 'access.user_deletion_blocked' AS action, b.id AS entity_id,
        jsonb_build_object('status', b.before_status, 'roleCode', b.role_code) AS before_value,
        jsonb_build_object('status', b.before_status, 'roleCode', b.role_code) AS after_value,
        jsonb_build_object('reason', 'last_active_superadmin') AS metadata_value
      FROM blocked b
    )
    INSERT INTO audit_logs (id, actor_id, actor_role, action, entity_type, entity_id, before, after, metadata)
    SELECT id, NULL, 'SYSTEM', action, 'user', entity_id, before_value, after_value, metadata_value
    FROM audit_rows
  `);
}
