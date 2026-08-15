import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { canInviteRole, getPendingInvitationsCount, listStaffInvitations } from "@/lib/user-administration";
import { isAppRole, type AppRole } from "@/lib/roles";
import { validateStaffInvitation } from "@/lib/staff-invitations";

export async function GET(request: Request) {
  try { await requireApiPermission("users.view"); return NextResponse.json(await listStaffInvitations(new URL(request.url).searchParams.get("query") ?? undefined)); }
  catch (error) { if (error instanceof ApiAuthorizationError) return NextResponse.json({ error: "No tienes permiso para ver invitaciones." }, { status: 403 }); return NextResponse.json({ error: "No se pudieron cargar las invitaciones." }, { status: 503 }); }
}

export async function POST(request: Request) {
  let actor: Awaited<ReturnType<typeof requireApiPermission>>;
  try { actor = await requireApiPermission("users.invite"); } catch (error) { if (error instanceof ApiAuthorizationError) return NextResponse.json({ error: "No tienes permiso para invitar usuarios." }, { status: 403 }); throw error; }
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
  const input = body && typeof body === "object" ? body as { email?: unknown; role?: unknown; firstName?: unknown; lastName?: unknown } : {};
  const invitationData = validateStaffInvitation({ email: input.email, role: input.role });
  const firstName = typeof input.firstName === "string" ? input.firstName.trim().slice(0, 80) : "";
  const lastName = typeof input.lastName === "string" ? input.lastName.trim().slice(0, 80) : "";
  if (!invitationData || !firstName || !lastName || !canInviteRole(actor.role, invitationData.role)) return NextResponse.json({ error: "Nombre, apellido, correo o rol no permitido para tu nivel." }, { status: 400 });
  const [existing] = await getDb().select({ id: users.id }).from(users).where(eq(users.email, invitationData.email)).limit(1);
  if (existing) return NextResponse.json({ error: "Ese correo ya pertenece a un usuario. No se creará un duplicado." }, { status: 409 });
  const client = await clerkClient();
  try {
    const pending = await client.invitations.getInvitationList({ query: invitationData.email, status: "pending", limit: 1, offset: 0 });
    if (pending.data.length) return NextResponse.json({ error: "Ya existe una invitación pendiente para ese correo." }, { status: 409 });
    const created = await client.invitations.createInvitation({ emailAddress: invitationData.email, expiresInDays: 30, notify: true, publicMetadata: { role: invitationData.role, firstName, lastName }, redirectUrl: "/sign-up" });
    await getDb().insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "access.staff_invitation_created", entityType: "clerk_invitation", entityId: created.id, before: null, after: { email: invitationData.email, role: invitationData.role, firstName, lastName, status: "pending" }, metadata: { expiresInDays: 30 } });
    return NextResponse.json({ success: true, invitation: { id: created.id, emailAddress: created.emailAddress, role: invitationData.role }, pendingInvitations: await getPendingInvitationsCount() }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo crear la invitación." }, { status: 409 }); }
}
