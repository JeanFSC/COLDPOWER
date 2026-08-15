import { NextResponse } from "next/server";
import { and, count, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { ApiAuthorizationError, requireApiPermission, setUserRole } from "@/lib/auth";
import { isAppRole, type AppRole } from "@/lib/roles";
import { assertUserChangeAllowed, auditUserSnapshot, getManagedUser, getManagedUserDetail, UserAdministrationError, type UserStatus } from "@/lib/user-administration";

const statuses = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiPermission("users.view");
    const { id } = await params;
    return NextResponse.json(await getManagedUserDetail(id));
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return NextResponse.json({ error: "No tienes permiso para ver usuarios." }, { status: 403 });
    if (error instanceof UserAdministrationError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "No se pudo cargar el usuario." }, { status: 503 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let actor: Awaited<ReturnType<typeof requireApiPermission>>;
  try { actor = await requireApiPermission("roles.manage"); } catch (error) { if (error instanceof ApiAuthorizationError) return NextResponse.json({ error: "Solo un SUPERADMIN puede modificar roles o estados." }, { status: 403 }); throw error; }
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
  const input = body && typeof body === "object" ? body as { role?: unknown; status?: unknown } : {};
  const nextRole = input.role === undefined ? undefined : (isAppRole(input.role) ? input.role : null);
  const nextStatus = input.status === undefined ? undefined : (typeof input.status === "string" && (statuses as readonly string[]).includes(input.status) ? input.status as UserStatus : null);
  if (nextRole === null || nextStatus === null || (nextRole === undefined && nextStatus === undefined)) return NextResponse.json({ error: "Rol o estado inválido." }, { status: 400 });

  let clerkRoleApplied = false;
  try {
    const target = await getManagedUser(id);
    const activeRow = await getDb().select({ count: count() }).from(users).where(and(eq(users.roleCode, "SUPERADMIN"), eq(users.status, "ACTIVE"))).then(([row]) => row);
    assertUserChangeAllowed({ actorRole: actor.role, actorUserId: actor.userId, targetId: id, nextRole: nextRole as AppRole | undefined, nextStatus: nextStatus as UserStatus | undefined, target, activeSuperadmins: Number(activeRow?.count ?? 0) });

    if (nextRole !== undefined) {
      try { await setUserRole(id, nextRole); clerkRoleApplied = true; }
      catch (error) {
        await getDb().update(users).set({ clerkSyncStatus: "PENDING", clerkSyncError: error instanceof Error ? error.message.slice(0, 500) : "Clerk no confirmó el cambio.", updatedAt: new Date() }).where(eq(users.id, id));
        await getDb().insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "access.user_role_sync_failed", entityType: "user", entityId: id, before: auditUserSnapshot(target), after: { requestedRole: nextRole, clerkSyncStatus: "PENDING" }, metadata: { source: "admin", retryable: true } });
        return NextResponse.json({ error: "Clerk no confirmó el rol. No se guardó el cambio local; la sincronización quedó pendiente para reintento." }, { status: 502 });
      }
    }

    const result = await getDb().transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('coldpower:superadmin-safety'))`);
      const [current] = await tx.select().from(users).where(eq(users.id, id)).limit(1);
      if (!current) throw new UserAdministrationError(404, "Usuario no encontrado.");
      const [active] = await tx.select({ count: count() }).from(users).where(and(eq(users.roleCode, "SUPERADMIN"), eq(users.status, "ACTIVE")));
      assertUserChangeAllowed({ actorRole: actor.role, actorUserId: actor.userId, targetId: id, nextRole: nextRole as AppRole | undefined, nextStatus: nextStatus as UserStatus | undefined, target: current, activeSuperadmins: Number(active?.count ?? 0) });
      const updatedValues = { ...(nextRole === undefined ? {} : { role: nextRole === "admin" || nextRole === "customer" ? nextRole : "customer" as const, roleCode: nextRole === "admin" || nextRole === "customer" ? null : nextRole, lastRoleChangedAt: new Date(), clerkSyncStatus: "SYNCED", clerkSyncError: null, clerkSyncedAt: new Date() }), ...(nextStatus === undefined ? {} : { status: nextStatus }), updatedAt: new Date() };
      const [updated] = await tx.update(users).set(updatedValues).where(eq(users.id, id)).returning();
      if (!updated) throw new UserAdministrationError(404, "Usuario no encontrado.");
      await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: nextRole === undefined ? "access.user_status_changed" : "access.user_role_changed", entityType: "user", entityId: id, before: auditUserSnapshot(current), after: auditUserSnapshot(updated), metadata: { statusChange: nextStatus !== undefined, roleChange: nextRole !== undefined, clerkConfirmed: nextRole !== undefined } });
      return updated;
    });
    return NextResponse.json({ success: true, user: { id: result.id, role: result.role, roleCode: result.roleCode, status: result.status, clerkSyncStatus: result.clerkSyncStatus } });
  } catch (error) {
    if (error instanceof UserAdministrationError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (clerkRoleApplied) await getDb().update(users).set({ clerkSyncStatus: "PENDING", clerkSyncError: "Clerk confirmó el cambio, pero la base de datos no pudo persistirlo.", updatedAt: new Date() }).where(eq(users.id, id));
    console.error("ColdPower: fallo al actualizar usuario", error);
    return NextResponse.json({ error: "No se pudo actualizar el usuario; revisa la sincronización Clerk." }, { status: 502 });
  }
}
