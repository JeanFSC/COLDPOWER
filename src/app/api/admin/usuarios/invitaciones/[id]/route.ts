import { NextResponse } from "next/server";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { cancelStaffInvitation, resendStaffInvitation, UserAdministrationError } from "@/lib/user-administration";
import { auditLogs } from "@/db/schema";
import { getDb } from "@/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let actor: Awaited<ReturnType<typeof requireApiPermission>>;
  try { actor = await requireApiPermission("users.invite"); } catch (error) { if (error instanceof ApiAuthorizationError) return NextResponse.json({ error: "No tienes permiso para gestionar invitaciones." }, { status: 403 }); throw error; }
  const { id } = await params;
  let body: { action?: unknown } = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
  if (body.action !== "cancel" && body.action !== "resend") return NextResponse.json({ error: "Acción inválida. Usa cancel o resend." }, { status: 400 });
  try {
    const invitation = body.action === "cancel" ? await cancelStaffInvitation(id) : await resendStaffInvitation(id);
    await getDb().insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: body.action === "cancel" ? "access.staff_invitation_cancelled" : "access.staff_invitation_resent", entityType: "clerk_invitation", entityId: id, before: null, after: { email: invitation.emailAddress, status: invitation.status }, metadata: { replacementId: body.action === "resend" ? invitation.id : null } });
    return NextResponse.json({ success: true, invitation });
  } catch (error) { if (error instanceof UserAdministrationError) return NextResponse.json({ error: error.message }, { status: error.status }); return NextResponse.json({ error: "No se pudo gestionar la invitación." }, { status: 409 }); }
}
