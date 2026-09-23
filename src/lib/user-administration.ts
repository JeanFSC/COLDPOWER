import { clerkClient } from "@clerk/nextjs/server";
import { and, count, desc, eq, gte, ilike, lt, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { isAppRole, permissionsForRole, type AppRole } from "@/lib/roles";
import type { UserStatus } from "@/lib/user-administration-contracts";

export { staffRoleCatalog, userRoleCatalog } from "@/lib/user-administration-contracts";
export type { UserStatus } from "@/lib/user-administration-contracts";

export type ManagedUser = typeof users.$inferSelect;
export type UserFilters = { query?: string; role?: string; status?: UserStatus; createdFrom?: string; createdTo?: string; lastSignInFrom?: string; lastSignInTo?: string; page?: number; pageSize?: number };
export type UserListItem = { id: string; name: string | null; email: string; phone: string | null; role: AppRole; permissions: string[]; status: UserStatus; lastSignInAt: Date | null; createdAt: Date; updatedAt: Date; clerkSyncStatus: string; clerkSyncError: string | null; clerkSyncedAt: Date | null };
export type UserPageResponse = { items: UserListItem[]; page: number; pageSize: number; totalItems: number; totalPages: number; metrics: { total: number; active: number; inactive: number; suspended: number; administrators: number; pendingInvitations: number } };

export class UserAdministrationError extends Error {
  constructor(public readonly status: 400 | 403 | 404 | 409 | 502, message: string) { super(message); }
}
export class UserInvalidFilterError extends Error { constructor() { super("USER_INVALID_FILTER"); this.name = "UserInvalidFilterError"; } }

function parseDate(value: string | undefined) { if (!value) return undefined; if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new UserInvalidFilterError(); return value; }
function parsePositive(value: string | undefined) { if (!value) return undefined; const parsed = Number(value); if (!Number.isInteger(parsed) || parsed < 1) throw new UserInvalidFilterError(); return parsed; }
export function parseUserFilters(params: URLSearchParams): UserFilters { const date = (key: string) => parseDate(params.get(key)?.trim() || undefined); const createdFrom = date("createdFrom"); const createdTo = date("createdTo"); const lastSignInFrom = date("lastSignInFrom"); const lastSignInTo = date("lastSignInTo"); if ((createdFrom && createdTo && createdFrom > createdTo) || (lastSignInFrom && lastSignInTo && lastSignInFrom > lastSignInTo)) throw new UserInvalidFilterError(); const status = params.get("status")?.trim() || undefined; if (status && !["ACTIVE", "INACTIVE", "SUSPENDED"].includes(status)) throw new UserInvalidFilterError(); return { query: params.get("query")?.trim() || undefined, role: params.get("role")?.trim() || undefined, status: status as UserStatus | undefined, createdFrom, createdTo, lastSignInFrom, lastSignInTo, page: parsePositive(params.get("page") || undefined), pageSize: parsePositive(params.get("pageSize") || undefined) }; }

function dateStart(value: string) { return new Date(`${value}T00:00:00-05:00`); }
function dateAfter(value: string) { return new Date(dateStart(value).getTime() + 86_400_000); }
function normalizedRole(user: ManagedUser): AppRole { return user.roleCode ?? (user.role === "admin" ? "admin" : "customer"); }
function userWhere(filters: UserFilters) { const conditions: SQL[] = []; if (filters.query) { const pattern = `%${filters.query}%`; conditions.push(or(ilike(users.id, pattern), ilike(users.email, pattern), ilike(users.name, pattern), ilike(users.phone, pattern))!); } if (filters.role) { if (isAppRole(filters.role) && filters.role !== "admin" && filters.role !== "customer") conditions.push(eq(users.roleCode, filters.role)); else if (filters.role === "admin" || filters.role === "customer") conditions.push(eq(users.role, filters.role)); } if (filters.status) conditions.push(eq(users.status, filters.status)); if (filters.createdFrom) conditions.push(gte(users.createdAt, dateStart(filters.createdFrom))); if (filters.createdTo) conditions.push(lt(users.createdAt, dateAfter(filters.createdTo))); if (filters.lastSignInFrom) conditions.push(gte(users.lastSignInAt, dateStart(filters.lastSignInFrom))); if (filters.lastSignInTo) conditions.push(lt(users.lastSignInAt, dateAfter(filters.lastSignInTo))); return conditions.length ? and(...conditions) : undefined; }
function mapUser(user: ManagedUser): UserListItem { const role = normalizedRole(user); return { id: user.id, name: user.name, email: user.email, phone: user.phone, role, permissions: permissionsForRole(role), status: user.status, lastSignInAt: user.lastSignInAt, createdAt: user.createdAt, updatedAt: user.updatedAt, clerkSyncStatus: user.clerkSyncStatus, clerkSyncError: user.clerkSyncError, clerkSyncedAt: user.clerkSyncedAt }; }

export async function getManagedUser(id: string) { const [user] = await getDb().select().from(users).where(eq(users.id, id)).limit(1); if (!user) throw new UserAdministrationError(404, "Usuario no encontrado."); return user; }
export async function countActiveSuperadmins() { const [row] = await getDb().select({ count: count() }).from(users).where(and(eq(users.roleCode, "SUPERADMIN"), eq(users.status, "ACTIVE"))); return Number(row?.count ?? 0); }
export function assertUserChangeAllowed({ actorRole, actorUserId, targetId, nextRole, nextStatus, target, activeSuperadmins }: { actorRole: AppRole; actorUserId: string; targetId: string; nextRole?: AppRole; nextStatus?: UserStatus; target: ManagedUser; activeSuperadmins: number }) { if (actorRole !== "SUPERADMIN") throw new UserAdministrationError(403, "Solo SUPERADMIN puede cambiar roles o estado de usuarios."); const targetIsSuperadmin = target.roleCode === "SUPERADMIN"; const removingSuperadmin = targetIsSuperadmin && ((nextRole !== undefined && nextRole !== "SUPERADMIN") || (nextStatus !== undefined && nextStatus !== "ACTIVE")); if (actorUserId === targetId && removingSuperadmin) throw new UserAdministrationError(409, "No puedes quitarte el control del sistema desde tu propia cuenta."); if (removingSuperadmin && activeSuperadmins <= 1) throw new UserAdministrationError(409, "No se puede dejar el sistema sin un SUPERADMIN activo."); return target; }
export async function checkUserChangeAllowed(input: Omit<Parameters<typeof assertUserChangeAllowed>[0], "target" | "activeSuperadmins">) { const target = await getManagedUser(input.targetId); return assertUserChangeAllowed({ ...input, target, activeSuperadmins: await countActiveSuperadmins() }); }
export function auditUserSnapshot(user: ManagedUser) { return { id: user.id, email: user.email, role: user.role, roleCode: user.roleCode, status: user.status, name: user.name, clerkSyncStatus: user.clerkSyncStatus }; }

export async function getUserPage(filters: UserFilters = {}, pendingInvitations = 0): Promise<UserPageResponse> { const pageSize = Math.min(100, Math.max(1, Math.floor(filters.pageSize ?? 25))); const page = Math.max(1, Math.floor(filters.page ?? 1)); const where = userWhere(filters); const db = getDb(); const [items, total, active, inactive, suspended, administrators] = await Promise.all([db.select().from(users).where(where).orderBy(desc(users.createdAt), desc(users.id)).limit(pageSize).offset((page - 1) * pageSize), db.select({ value: count() }).from(users).where(where), db.select({ value: count() }).from(users).where(and(where, eq(users.status, "ACTIVE"))), db.select({ value: count() }).from(users).where(and(where, eq(users.status, "INACTIVE"))), db.select({ value: count() }).from(users).where(and(where, eq(users.status, "SUSPENDED"))), db.select({ value: count() }).from(users).where(and(where, eq(users.roleCode, "SUPERADMIN"), eq(users.status, "ACTIVE")))]); const totalItems = Number(total[0]?.value ?? 0); return { items: items.map(mapUser), page: Math.min(page, Math.max(1, Math.ceil(totalItems / pageSize))), pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)), metrics: { total: totalItems, active: Number(active[0]?.value ?? 0), inactive: Number(inactive[0]?.value ?? 0), suspended: Number(suspended[0]?.value ?? 0), administrators: Number(administrators[0]?.value ?? 0), pendingInvitations } }; }

export async function getPendingInvitationsCount() { const response = await (await clerkClient()).invitations.getInvitationList({ status: "pending", limit: 1, offset: 0 }); return Number(response.totalCount ?? 0); }
export async function getManagedUserDetail(id: string) { const user = await getManagedUser(id); const events = await getDb().select().from(auditLogs).where(and(eq(auditLogs.entityType, "user"), eq(auditLogs.entityId, id))).orderBy(desc(auditLogs.createdAt)).limit(100); let invitation = null as ReturnType<typeof mapInvitation> | null; try { const response = await (await clerkClient()).invitations.getInvitationList({ query: user.email, limit: 20, offset: 0 }); invitation = response.data.map(mapInvitation).find((candidate) => candidate.emailAddress.toLowerCase() === user.email.toLowerCase()) ?? null; } catch { /* Clerk may be temporarily unavailable; sync status remains visible. */ } return { user: mapUser(user), history: events, lastAccess: user.lastSignInAt, invitation, clerkEvents: events.filter((event) => event.action.startsWith("clerk.") || event.action.startsWith("access.user_")), audit: events }; }

export type ClerkInvitationItem = { id: string; emailAddress: string; status: string; role: AppRole | null; firstName: string | null; lastName: string | null; createdAt: Date; updatedAt: Date; revoked: boolean };
function mapInvitation(invitation: { id: string; emailAddress: string; status: string; publicMetadata: Record<string, unknown> | null; createdAt: number; updatedAt: number; revoked?: boolean }): ClerkInvitationItem { const role = invitation.publicMetadata && isAppRole(invitation.publicMetadata.role) ? invitation.publicMetadata.role : null; return { id: invitation.id, emailAddress: invitation.emailAddress, status: invitation.status, role, firstName: typeof invitation.publicMetadata?.firstName === "string" ? invitation.publicMetadata.firstName : null, lastName: typeof invitation.publicMetadata?.lastName === "string" ? invitation.publicMetadata.lastName : null, createdAt: new Date(invitation.createdAt), updatedAt: new Date(invitation.updatedAt), revoked: Boolean(invitation.revoked) }; }
export async function listStaffInvitations(query?: string) { const response = await (await clerkClient()).invitations.getInvitationList({ status: "pending", query: query?.trim() || undefined, orderBy: "-created_at", limit: 100, offset: 0 }); return { items: response.data.map(mapInvitation), totalItems: Number(response.totalCount ?? response.data.length) }; }
type InvitationListParams = { query?: string; status?: "pending"; limit: number; offset: number };
export async function findStaffInvitationById<T extends { id: string }>(id: string, list: (params: InvitationListParams) => Promise<{ data: T[]; totalCount?: number }>) {
  const limit = 100;
  const targeted = await list({ query: id, status: "pending", limit, offset: 0 });
  const exact = targeted.data.find((item) => item.id === id);
  if (exact) return exact;

  // Clerk's query is a filter, not a single-resource endpoint. Fall back to the
  // pending pages so a valid invitation is not lost when the provider search is
  // eventually consistent or treats the id as a text query.
  for (let offset = 0; ; offset += limit) {
    const page = await list({ status: "pending", limit, offset });
    const match = page.data.find((item) => item.id === id);
    if (match) return match;
    const total = Number(page.totalCount ?? 0);
    if (!page.data.length || page.data.length < limit || (total > 0 && offset + page.data.length >= total)) break;
  }
  return null;
}

export function assertStaffInvitationRoleAllowed(actorRole: AppRole, invitation: { publicMetadata?: unknown }) {
  const metadata = invitation.publicMetadata;
  const targetRole = metadata && typeof metadata === "object" && isAppRole((metadata as { role?: unknown }).role)
    ? (metadata as { role: AppRole }).role
    : null;
  if (!targetRole || !canInviteRole(actorRole, targetRole)) throw new UserAdministrationError(403, "No tienes permiso para gestionar una invitación de este rol.");
  return targetRole;
}

async function getPendingStaffInvitation(id: string) {
  const client = await clerkClient();
  const invitation = await findStaffInvitationById(id, (params) => client.invitations.getInvitationList(params));
  if (!invitation) throw new UserAdministrationError(404, "Invitación no encontrada o ya no está pendiente.");
  return { client, invitation };
}

export async function cancelStaffInvitation(id: string, actorRole: AppRole) {
  const { client, invitation } = await getPendingStaffInvitation(id);
  assertStaffInvitationRoleAllowed(actorRole, invitation);
  return mapInvitation(await client.invitations.revokeInvitation(invitation.id));
}

export async function resendStaffInvitation(id: string, actorRole: AppRole) {
  const { client, invitation } = await getPendingStaffInvitation(id);
  assertStaffInvitationRoleAllowed(actorRole, invitation);
  const created = await client.invitations.createInvitation({ emailAddress: invitation.emailAddress, expiresInDays: 30, notify: true, ignoreExisting: true, publicMetadata: invitation.publicMetadata ?? undefined, redirectUrl: "/sign-up" });
  try { await client.invitations.revokeInvitation(invitation.id); } catch { /* La nueva invitación sigue visible y la discrepancia queda en auditoría. */ }
  return mapInvitation(created);
}
// Nobody can hand out access they do not hold: the invited role's permissions must be a
// subset of the inviter's. Only SUPERADMIN may create another SUPERADMIN.
export function canInviteRole(actorRole: AppRole, targetRole: AppRole) { if (actorRole === "SUPERADMIN") return true; if (targetRole === "SUPERADMIN") return false; const held = new Set(permissionsForRole(actorRole)); const requested = permissionsForRole(targetRole); return requested.length > 0 && requested.every((permission) => held.has(permission)); }

export async function syncClerkRoleFromMetadata(userId: string, nextRole: AppRole) {
  const accountRole = nextRole === "admin" || nextRole === "customer" ? nextRole : "customer";
  const roleCode = nextRole === "admin" || nextRole === "customer" ? null : nextRole;
  const appliedAuditId = `audit-${crypto.randomUUID()}`;
  const blockedAuditId = `audit-${crypto.randomUUID()}`;
  const result = await getDb().execute(sql`
    WITH lock_guard AS (
      SELECT pg_advisory_xact_lock(hashtext('coldpower:superadmin-safety')) AS locked
    ), target AS (
      SELECT u.id, u.email, u.role, u.role_code, u.status, u.name, u.clerk_sync_status
      FROM users u, lock_guard
      WHERE u.id = ${userId}
      FOR UPDATE
    ), active_superadmins AS (
      SELECT count(*)::int AS total
      FROM users u, lock_guard
      WHERE u.role_code = 'SUPERADMIN' AND u.status = 'ACTIVE'
    ), eligible AS (
      SELECT t.*
      FROM target t, active_superadmins s
      WHERE t.role_code IS DISTINCT FROM 'SUPERADMIN' OR t.status <> 'ACTIVE' OR ${nextRole}::text = 'SUPERADMIN' OR s.total > 1
    ), blocked AS (
      SELECT t.*
      FROM target t, active_superadmins s
      WHERE t.role_code = 'SUPERADMIN' AND t.status = 'ACTIVE' AND ${nextRole} <> 'SUPERADMIN' AND s.total <= 1
    ), updated AS (
      UPDATE users u
      SET role = ${accountRole}, role_code = ${roleCode}, last_role_changed_at = NOW(), clerk_sync_status = 'SYNCED', clerk_sync_error = NULL, clerk_synced_at = NOW(), updated_at = NOW()
      FROM eligible e
      WHERE u.id = e.id
      RETURNING u.id, u.email, u.role, u.role_code, u.status, u.name, u.clerk_sync_status
    ), audit_rows AS MATERIALIZED (
      SELECT ${appliedAuditId} AS id, 'access.user_role_synced_from_clerk' AS action, u.id AS entity_id,
        jsonb_build_object('id', e.id, 'email', e.email, 'role', e.role, 'roleCode', e.role_code, 'status', e.status, 'name', e.name, 'clerkSyncStatus', e.clerk_sync_status) AS before_value,
        jsonb_build_object('id', u.id, 'email', u.email, 'role', u.role, 'roleCode', u.role_code, 'status', u.status, 'name', u.name, 'clerkSyncStatus', u.clerk_sync_status) AS after_value,
        jsonb_build_object('source', 'clerk.user.updated') AS metadata_value,
        'APPLIED' AS outcome
      FROM updated u INNER JOIN eligible e ON e.id = u.id
      UNION ALL
      SELECT ${blockedAuditId} AS id, 'access.user_role_sync_blocked' AS action, b.id AS entity_id,
        jsonb_build_object('id', b.id, 'email', b.email, 'role', b.role, 'roleCode', b.role_code, 'status', b.status, 'name', b.name, 'clerkSyncStatus', b.clerk_sync_status) AS before_value,
        jsonb_build_object('id', b.id, 'email', b.email, 'role', b.role, 'roleCode', b.role_code, 'status', b.status, 'name', b.name, 'clerkSyncStatus', b.clerk_sync_status, 'requestedRole', ${nextRole}::text) AS after_value,
        jsonb_build_object('reason', 'last_active_superadmin', 'source', 'clerk.user.updated') AS metadata_value,
        'BLOCKED' AS outcome
      FROM blocked b
    ), inserted_audit AS (
      INSERT INTO audit_logs (id, actor_id, actor_role, action, entity_type, entity_id, before, after, metadata)
      SELECT id, NULL, 'SYSTEM', action, 'user', entity_id, before_value, after_value, metadata_value
      FROM audit_rows
      RETURNING id
    )
    SELECT COALESCE((SELECT outcome FROM audit_rows LIMIT 1), 'MISSING') AS outcome
    FROM lock_guard, (SELECT count(*) FROM inserted_audit) AS audit_status
  `);
  const outcome = String((result.rows[0] as { outcome?: string } | undefined)?.outcome ?? "MISSING");
  return { applied: outcome === "APPLIED", blocked: outcome === "BLOCKED" };
}
