import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Filter,
  Mail,
  MoreVertical,
  Search,
  Settings2,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { StaffInvitationActions } from "@/components/admin/StaffInvitationActions";
import { StaffInvitationForm } from "@/components/admin/StaffInvitationForm";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { UserRoleControl } from "@/components/admin/UserRoleControl";
import { permissionsForRole, type AppRole, type Permission } from "@/lib/roles";
import type {
  ClerkInvitationItem,
  UserFilters,
  UserListItem,
  UserPageResponse,
  UserStatus,
} from "@/lib/user-administration";

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
const ROLE_TONES: Record<string, string> = {
  SUPERADMIN: "border-purple-200 bg-purple-100 text-purple-700",
  GERENCIA: "border-blue-200 bg-blue-100 text-blue-700",
  OPERACIONES_VENTAS: "border-sky-200 bg-sky-100 text-sky-700",
  ALMACEN: "border-emerald-200 bg-emerald-100 text-emerald-700",
  COMPRAS: "border-amber-200 bg-amber-100 text-amber-700",
  VENTAS: "border-cyan-200 bg-cyan-100 text-cyan-700",
};
const MATRIX_ROLES: Array<{ role: AppRole; label: string; tone: string }> = [
  { role: "SUPERADMIN", label: "Superadmin", tone: "text-purple-600" },
  { role: "GERENCIA", label: "Gerencia", tone: "text-blue-600" },
  { role: "OPERACIONES_VENTAS", label: "Operaciones", tone: "text-sky-600" },
  { role: "ALMACEN", label: "Almacén", tone: "text-emerald-600" },
  { role: "VENTAS", label: "Ventas", tone: "text-violet-600" },
];
const MATRIX_PERMISSIONS: Array<{ permission: Permission; label: string }> = [
  { permission: "dashboard.view", label: "Dashboard" },
  { permission: "catalog.product.edit", label: "Productos" },
  { permission: "inventory.adjust", label: "Inventario" },
  { permission: "reports.view", label: "Reportes" },
  { permission: "users.manage", label: "Usuarios" },
];
const dateTime = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" });
const dateOnly = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function initials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return words.length > 1
    ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
    : value.slice(0, 2).toUpperCase();
}
function formatDate(value: Date | null) {
  return value ? dateTime.format(value) : "—";
}
function queryFor(filters: UserFilters, updates: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  const values: Record<string, string | number | undefined> = { ...filters, ...updates };
  for (const [key, value] of Object.entries(values))
    if (value !== undefined && value !== "") params.set(key, String(value));
  return params.toString();
}
function hrefFor(filters: UserFilters, updates: Record<string, string | undefined>) {
  const query = queryFor(filters, updates);
  return `/admin/usuarios${query ? `?${query}` : ""}`;
}
function Metric({
  label,
  value,
  note,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: typeof Users;
  tone: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium text-slate-500">{label}</p>
        <p className="text-xl font-bold leading-tight text-slate-900">{value}</p>
        <p className="mt-0.5 text-[10px] text-slate-400">{note}</p>
      </div>
    </div>
  );
}

type UserDisplayRow = UserListItem & { roleLabel: string };
type Detail = {
  user: UserListItem;
  history: Array<{ id: string; action: string; entityType: string; createdAt: Date }>;
  lastAccess: Date | null;
};

export function AdminUsersStitch({
  users,
  metrics,
  filters,
  invitations,
  canInvite,
  canManage,
  inviteRoles,
  allowSuperadmin,
  exportHref,
  selectedId,
  detail,
  detailError,
  loadError,
}: {
  users: UserDisplayRow[];
  metrics: UserPageResponse["metrics"];
  filters: UserFilters;
  invitations: ClerkInvitationItem[];
  canInvite: boolean;
  canManage: boolean;
  inviteRoles: Array<{ value: Exclude<AppRole, "customer">; label: string }>;
  allowSuperadmin: boolean;
  exportHref: string;
  selectedId?: string;
  detail: Detail | null;
  detailError: string | null;
  loadError: boolean;
}) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const totalPages = Math.max(1, Math.ceil(metrics.total / pageSize));
  const pages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) => Math.max(1, Math.min(page - 2, totalPages - 4)) + index,
  );
  const roles = [...new Set(users.map((user) => user.role))].sort();
  return (
    <div className="space-y-6 pb-2">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 shadow-sm">
            <Users className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Usuarios</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Gestiona los usuarios del sistema, sus roles y permisos de acceso.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {canInvite ? (
            <a
              href="#user-invitation"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <UserPlus className="h-4 w-4 text-slate-500" />
              Invitar usuario
            </a>
          ) : null}
          <a
            href="#permission-matrix"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Settings2 className="h-4 w-4 text-slate-500" />
            Permisos por rol
          </a>
          <a
            href={exportHref}
            download
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            Exportar
          </a>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Metric
          label="Usuarios activos"
          value={metrics.active}
          note="Dato actual"
          icon={Users}
          tone="bg-blue-50 text-blue-600"
        />
        <Metric
          label="Invitaciones pendientes"
          value={metrics.pendingInvitations}
          note="Pendientes en Clerk"
          icon={Mail}
          tone="bg-amber-50 text-amber-600"
        />
        <Metric
          label="Roles configurados"
          value={MATRIX_ROLES.length}
          note="Roles operativos visibles"
          icon={ShieldCheck}
          tone="bg-purple-50 text-purple-600"
        />
        <Metric
          label="Inactivos"
          value={metrics.inactive}
          note="Según filtros actuales"
          icon={UserPlus}
          tone="bg-teal-50 text-teal-600"
        />
        <Metric
          label="Superadmins"
          value={metrics.administrators}
          note="Activos actualmente"
          icon={Settings2}
          tone="bg-rose-50 text-rose-500"
        />
        <Metric
          label="Suspendidos"
          value={metrics.suspended}
          note="Estado persistido"
          icon={Clock3}
          tone="bg-amber-50 text-amber-500"
        />
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <form
          method="get"
          action="/admin/usuarios"
          className="flex flex-col gap-3 border-b border-slate-200 p-4 xl:flex-row xl:items-center xl:justify-between"
        >
          <div className="relative w-full xl:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              name="query"
              defaultValue={filters.query}
              placeholder="Buscar por nombre, correo o rol..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <AdminSelect
              ariaLabel="Filtrar por rol"
              name="role"
              value={filters.role ?? ""}
              className="w-44"
              options={[
                { value: "", label: "Rol: Todos" },
                ...roles.map((role) => ({
                  value: role,
                  label: `Rol: ${ROLE_LABELS[role] ?? role}`,
                })),
              ]}
            />
            <AdminSelect
              ariaLabel="Filtrar por estado"
              name="status"
              value={filters.status ?? ""}
              className="w-40"
              options={[
                { value: "", label: "Estado: Todos" },
                { value: "ACTIVE", label: "Estado: Activo" },
                { value: "INACTIVE", label: "Estado: Inactivo" },
                { value: "SUSPENDED", label: "Estado: Suspendido" },
              ]}
            />
            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                name="lastSignInFrom"
                aria-label="Último acceso desde"
                defaultValue={filters.lastSignInFrom}
                className="w-28 bg-transparent text-[11px] font-medium outline-none"
              />
            </label>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"
            >
              <Filter className="h-3.5 w-3.5" />
              Aplicar
            </button>
          </div>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="w-10 px-4 py-3">
                  <span className="sr-only">Avatar</span>
                </th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Correo</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Último acceso</th>
                <th className="px-4 py-3">Incorporación</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {users.length ? (
                users.map((user) => {
                  const name = user.name || "Sin nombre";
                  const active = user.id === selectedId;
                  const statusTone =
                    user.status === "ACTIVE"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : user.status === "SUSPENDED"
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-slate-200 bg-slate-100 text-slate-600";
                  return (
                    <tr key={user.id} className={active ? "bg-blue-50/60" : "hover:bg-slate-50/80"}>
                      <td className="px-4 py-3.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600">
                          {initials(name)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">{name}</td>
                      <td className="px-4 py-3.5 text-slate-500">{user.email}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${ROLE_TONES[user.role] ?? "border-slate-200 bg-slate-100 text-slate-700"}`}
                        >
                          {user.roleLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusTone}`}
                        >
                          {user.status === "ACTIVE"
                            ? "Activo"
                            : user.status === "SUSPENDED"
                              ? "Suspendido"
                              : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {formatDate(user.lastSignInAt)}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {dateOnly.format(user.createdAt).replace(".", "")}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={hrefFor(filters, { userId: user.id })}
                          aria-label={`Ver detalle de ${name}`}
                          className="inline-flex rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-xs text-slate-400">
                    No se encontraron usuarios para estos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Mostrando{" "}
            <strong className="text-slate-900">
              {users.length ? (page - 1) * pageSize + 1 : 0}
            </strong>{" "}
            a <strong className="text-slate-900">{Math.min(page * pageSize, metrics.total)}</strong>{" "}
            de <strong className="text-slate-900">{metrics.total}</strong> usuarios
          </span>
          <nav className="flex items-center gap-1" aria-label="Paginación de usuarios">
            <Link
              href={hrefFor(filters, { page: String(Math.max(1, page - 1)) })}
              aria-label="Página anterior"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            {pages.map((number) => (
              <Link
                key={number}
                href={hrefFor(filters, { page: String(number) })}
                className={
                  number === page
                    ? "flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-medium text-white"
                    : "flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-50"
                }
              >
                {number}
              </Link>
            ))}
            <Link
              href={hrefFor(filters, { page: String(Math.min(totalPages, page + 1)) })}
              aria-label="Página siguiente"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </nav>
        </footer>
      </section>
      <section className="grid gap-6 xl:grid-cols-3">
        <article
          id="permission-matrix"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-900">Permisos por rol</h2>
            <p className="mt-1 text-[11px] text-slate-500">
              Permisos efectivos actuales. La matriz es de solo lectura.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[510px] text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  <th className="pb-2 text-left">Módulo</th>
                  {MATRIX_ROLES.map((role) => (
                    <th key={role.role} className={`pb-2 text-center ${role.tone}`}>
                      {role.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {MATRIX_PERMISSIONS.map((permission) => (
                  <tr key={permission.permission}>
                    <td className="py-2 text-slate-700">{permission.label}</td>
                    {MATRIX_ROLES.map((role) => (
                      <td key={role.role} className="py-2 text-center">
                        {permissionsForRole(role.role).includes(permission.permission) ? (
                          <Check
                            className="mx-auto h-3.5 w-3.5 text-blue-600"
                            aria-label={`${role.label} tiene ${permission.label}`}
                          />
                        ) : (
                          <X
                            className="mx-auto h-3.5 w-3.5 text-slate-300"
                            aria-label={`${role.label} no tiene ${permission.label}`}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
        <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-900">Invitaciones pendientes</h2>
            <p className="mt-1 text-[11px] text-slate-500">
              Usuarios invitados que aún no activaron su cuenta.
            </p>
          </div>
          <div className="space-y-3">
            {invitations.slice(0, 5).map((invitation) => {
              const name =
                [invitation.firstName, invitation.lastName].filter(Boolean).join(" ") ||
                invitation.emailAddress;
              return (
                <div key={invitation.id} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600">
                      {initials(name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900">{name}</p>
                      <p className="truncate text-[10px] text-slate-400">
                        {invitation.emailAddress}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="inline-flex rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                      Pendiente
                    </span>
                    <p className="mt-0.5 text-[9px] text-slate-400">
                      {dateOnly.format(invitation.createdAt).replace(".", "")}
                    </p>
                  </div>
                </div>
              );
            })}
            {!invitations.length ? (
              <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-[11px] text-slate-400">
                No hay invitaciones pendientes.
              </p>
            ) : null}
          </div>
          <a
            href="#user-invitation"
            className="mt-auto inline-flex items-center justify-center gap-1.5 border-t border-slate-100 pt-4 text-xs font-semibold text-blue-600"
          >
            Gestionar invitaciones ({metrics.pendingInvitations})
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </article>
        <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-900">Actividad reciente</h2>
            <p className="mt-1 text-[11px] text-slate-500">Actividad del usuario seleccionado.</p>
          </div>
          {detail?.history.length ? (
            <div className="space-y-3.5">
              {detail.history.slice(0, 6).map((event) => (
                <div key={event.id} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-800">{event.action}</p>
                    <p className="truncate text-[10px] text-slate-500">
                      Entidad: {event.entityType}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] text-slate-400">
                    {dateOnly.format(event.createdAt).replace(".", "")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 p-6 text-center">
              <Clock3 className="mb-2 h-5 w-5 text-slate-300" />
              <p className="text-[11px] text-slate-400">
                Selecciona un usuario para consultar su actividad real.
              </p>
            </div>
          )}
          <Link
            href={selectedId ? `/admin/auditoria?entityType=user&entityId=${encodeURIComponent(selectedId)}` : "/admin/auditoria"}
            className="mt-auto inline-flex items-center justify-center gap-1.5 border-t border-slate-100 pt-4 text-xs font-semibold text-blue-600"
          >
            Ver toda la auditoría
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </article>
      </section>
      {selectedId ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {detail ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Detalle de {detail.user.name || detail.user.email}
                  </h2>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {detail.user.email} · {ROLE_LABELS[detail.user.role] ?? detail.user.role}
                  </p>
                </div>
                <Link
                  href={hrefFor(filters, { userId: undefined })}
                  className="text-xs font-semibold text-blue-600"
                >
                  Cerrar detalle
                </Link>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
                <dl className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <dt className="text-[10px] uppercase tracking-wide text-slate-400">Estado</dt>
                    <dd className="mt-1 text-xs font-semibold text-slate-800">
                      {detail.user.status}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <dt className="text-[10px] uppercase tracking-wide text-slate-400">
                      Último acceso
                    </dt>
                    <dd className="mt-1 text-xs font-semibold text-slate-800">
                      {formatDate(detail.lastAccess)}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <dt className="text-[10px] uppercase tracking-wide text-slate-400">
                      Sincronización
                    </dt>
                    <dd className="mt-1 text-xs font-semibold text-slate-800">
                      {detail.user.clerkSyncStatus}
                    </dd>
                  </div>
                </dl>
                {canManage ? (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold text-slate-700">
                      Gestionar acceso
                    </p>
                    <UserRoleControl
                      userId={detail.user.id}
                      role={detail.user.role}
                      status={detail.user.status as UserStatus}
                    />
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              {detailError ?? "No se pudo cargar el detalle del usuario."}
            </p>
          )}
        </section>
      ) : null}
      <section id="user-invitation" className="scroll-mt-6">
        {canInvite ? <StaffInvitationForm allowSuperadmin={allowSuperadmin} roles={inviteRoles} /> : null}
        {loadError ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
            Clerk no respondió; las invitaciones se mostrarán cuando la sincronización se recupere.
          </p>
        ) : null}
        {invitations.length ? (
          <details className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <summary className="cursor-pointer text-xs font-semibold text-blue-600">
              Gestionar invitaciones pendientes
            </summary>
            <div className="mt-4 space-y-3">
              {invitations.map((invitation) => (canInvite ? <StaffInvitationActions key={invitation.id} invitation={invitation} /> : null))}
            </div>
          </details>
        ) : null}
      </section>
    </div>
  );
}
