import type { Metadata } from "next";
import { can } from "@/lib/roles";
import { requirePermission } from "@/lib/auth";
import { getUserPage, getManagedUserDetail, getPendingInvitationsCount, listStaffInvitations, parseUserFilters } from "@/lib/user-administration";
import { UserRoleControl } from "@/components/admin/UserRoleControl";
import { StaffInvitationForm } from "@/components/admin/StaffInvitationForm";
import { StaffInvitationActions } from "@/components/admin/StaffInvitationActions";
import { Tanda2Users } from "@/components/admin/AdminTanda2Workspaces";

export const metadata: Metadata = { title: "Usuarios | Panel admin ColdPower", description: "Gestión de usuarios, roles y estados de ColdPower." };
type Params = Record<string, string | string[] | undefined>;
function toQuery(params: Params) { const query = new URLSearchParams(); for (const [key, value] of Object.entries(params)) { if (typeof value === "string") query.set(key, value); else if (Array.isArray(value) && value[0]) query.set(key, value[0]); } return query; }

export default async function AdminUsuariosPage({ searchParams }: { searchParams?: Promise<Params> }) {
  const actor = await requirePermission("users.view");
  const query = toQuery((await searchParams) ?? {});
  const filters = parseUserFilters(query);
  let pendingInvitations = 0;
  let invitations: Awaited<ReturnType<typeof listStaffInvitations>> = { items: [], totalItems: 0 };
  let loadError = false;
  try { pendingInvitations = await getPendingInvitationsCount(); invitations = await listStaffInvitations(query.get("query") ?? undefined); } catch (error) { console.error("ColdPower: Clerk no respondió para usuarios e invitaciones", error); loadError = true; }
  const selectedUserId = query.get("userId");
  let userDetail: Awaited<ReturnType<typeof getManagedUserDetail>> | null = null;
  let userDetailError: string | null = null;
  if (selectedUserId) {
    try { userDetail = await getManagedUserDetail(selectedUserId); }
    catch (error) { userDetailError = error instanceof Error ? error.message : "No se pudo cargar el detalle del usuario."; }
  }
  const page = await getUserPage(filters, pendingInvitations);
  const rows = page.items.map((user) => ({ id: user.id, name: user.name || "Sin nombre", email: user.email, role: user.role, roleLabel: userRoleLabel(user.role), status: user.status, lastAccess: user.lastSignInAt?.toLocaleString("es-PE") ?? "Nunca registrado", createdAt: user.createdAt.toLocaleDateString("es-PE"), sync: user.clerkSyncStatus }));
  const controls = (
    <div className="space-y-4">
      {can(actor.role, "users.invite") ? <StaffInvitationForm allowSuperadmin={actor.role === "SUPERADMIN"} /> : null}
      {loadError ? <p className="rounded-lg border border-[#e3ebf2] p-3 text-[11px] text-[#7d91a5]">Clerk no respondió; las invitaciones se mostrarán cuando la sincronización se recupere.</p> : null}
      {invitations.items.map((invitation) => <StaffInvitationActions key={invitation.id} invitation={invitation} />)}
      {can(actor.role, "users.manage") ? page.items.map((user) => <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e3ebf2] p-3"><div><p className="text-[10px] font-extrabold text-[#304b66]">{user.name || "Sin nombre"}</p><p className="mt-1 text-[10px] text-[#8296a9]">{user.email} · Clerk: {user.clerkSyncStatus}</p></div><UserRoleControl userId={user.id} role={user.role} status={user.status} /></div>) : null}
    </div>
  );
  const exportHref = `/api/admin/usuarios/export${query.toString() ? `?${query.toString()}` : ""}`;
  return <Tanda2Users rows={rows} canInvite={can(actor.role, "users.invite")} metrics={page.metrics} pagination={{ page: page.page, totalPages: page.totalPages, totalItems: page.totalItems }} exportHref={exportHref} controls={controls} selectedId={selectedUserId ?? undefined} detail={userDetail ? { user: userDetail.user, history: userDetail.history, lastAccess: userDetail.lastAccess, invitation: userDetail.invitation } : undefined} detailError={userDetailError} />;
}

function userRoleLabel(role: string) {
  const labels: Record<string, string> = {
    SUPERADMIN: "Superadmin",
    GERENCIA: "Gerencia",
    OPERACIONES_VENTAS: "Operaciones y ventas",
    JEFATURA: "Jefatura",
    ADMIN: "Administrador",
    VENTAS: "Ventas",
    ALMACEN: "Almacén",
    COMPRAS: "Compras",
    REPORTES: "Reportes",
    customer: "Cliente",
    admin: "Administrador legacy",
  };
  return labels[role] ?? role;
}
