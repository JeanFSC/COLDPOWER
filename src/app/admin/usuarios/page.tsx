import type { Metadata } from "next";
import { AdminUsersStitch } from "@/components/admin/AdminUsersStitch";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import {
  getManagedUserDetail,
  getPendingInvitationsCount,
  getUserPage,
  listStaffInvitations,
  parseUserFilters,
} from "@/lib/user-administration";

export const metadata: Metadata = {
  title: "Usuarios | Panel admin ColdPower",
  description: "Gestión de usuarios, roles y estados de ColdPower.",
};

type Params = Record<string, string | string[] | undefined>;

function toQuery(params: Params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value) && value[0]) query.set(key, value[0]);
  }
  return query;
}

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams?: Promise<Params>;
}) {
  const actor = await requirePermission("users.view");
  const query = toQuery((await searchParams) ?? {});
  const filters = parseUserFilters(query);
  let pendingInvitations = 0;
  let invitations: Awaited<ReturnType<typeof listStaffInvitations>> = { items: [], totalItems: 0 };
  let loadError = false;
  try {
    [pendingInvitations, invitations] = await Promise.all([
      getPendingInvitationsCount(),
      listStaffInvitations(query.get("query") ?? undefined),
    ]);
  } catch (error) {
    console.error("ColdPower: Clerk no respondió para usuarios e invitaciones", error);
    loadError = true;
  }

  const selectedId = query.get("userId") ?? undefined;
  let detail: Awaited<ReturnType<typeof getManagedUserDetail>> | null = null;
  let detailError: string | null = null;
  if (selectedId) {
    try {
      detail = await getManagedUserDetail(selectedId);
    } catch (error) {
      detailError =
        error instanceof Error ? error.message : "No se pudo cargar el detalle del usuario.";
    }
  }

  const page = await getUserPage(filters, pendingInvitations);
  const users = page.items.map((user) => ({
    ...user,
    createdAt: user.createdAt,
    roleLabel: userRoleLabel(user.role),
  }));
  const exportHref = `/api/admin/usuarios/export${query.toString() ? `?${query.toString()}` : ""}`;
  return (
    <AdminUsersStitch
      users={users}
      metrics={page.metrics}
      filters={filters}
      invitations={invitations.items}
      canInvite={can(actor.role, "users.invite")}
      canManage={can(actor.role, "users.manage")}
      allowSuperadmin={actor.role === "SUPERADMIN"}
      exportHref={exportHref}
      selectedId={selectedId}
      detail={detail}
      detailError={detailError}
      loadError={loadError}
    />
  );
}

function userRoleLabel(role: string) {
  return ROLE_LABELS[role] ?? role;
}

const ROLE_LABELS: Record<string, string> = {
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
