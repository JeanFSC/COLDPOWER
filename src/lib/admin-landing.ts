import { can, type AppRole } from "@/lib/roles";

const primaryModuleByRole: Partial<Record<AppRole, string>> = {
  OPERACIONES_VENTAS: "/admin/operaciones",
  ADMIN: "/admin/operaciones",
  VENTAS: "/admin/crm",
  ALMACEN: "/admin/inventario",
  COMPRAS: "/admin/compras",
  REPORTES: "/admin/reportes",
  admin: "/admin/operaciones",
};

export function getAdminLandingPath(role: AppRole) {
  if (can(role, "dashboard.view")) return "/admin/inicio";
  return primaryModuleByRole[role] ?? "/admin/sin-acceso";
}
