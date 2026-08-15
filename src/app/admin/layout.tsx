import type { ReactNode } from "react";
import { AdminShell, type AdminNavItem } from "@/components/admin/AdminShell";
import { can, type AppRole, type Permission } from "@/lib/roles";
import { requireAdmin } from "@/lib/auth";

type RoleNavItem = AdminNavItem & { permission: Permission };

const managementLinks: RoleNavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "dashboard", permission: "dashboard.view" },
  {
    href: "/admin/catalogo",
    label: "Productos",
    icon: "products",
    permission: "catalog.product.view",
  },
  {
    href: "/admin/inventario",
    label: "Inventario",
    icon: "inventory",
    permission: "inventory.view",
  },
  { href: "/admin/precios", label: "Precios", icon: "pricing", permission: "pricing.view" },
  {
    href: "/admin/crm?view=clientes",
    label: "Clientes",
    icon: "customers",
    permission: "customers.view",
  },
  { href: "/admin/crm", label: "Pipeline", icon: "pipeline", permission: "crm.view" },
  { href: "/admin/cotizaciones", label: "Cotizaciones", icon: "quotes", permission: "quotes.view" },
  { href: "/admin/ventas", label: "Ventas", icon: "sales", permission: "sales.view" },
  { href: "/admin/pedidos", label: "Pedidos", icon: "orders", permission: "orders.view" },
  { href: "/admin/compras", label: "Compras", icon: "operations", permission: "purchases.manage" },
  { href: "/admin/pagos", label: "Pagos", icon: "payments", permission: "payments.view" },
  { href: "/admin/cms", label: "CMS", icon: "content", permission: "cms.view" },
  { href: "/admin/reportes", label: "Reportes", icon: "reports", permission: "reports.view" },
  { href: "/admin/auditoria", label: "Auditoría", icon: "audit", permission: "audit.view" },
  { href: "/admin/usuarios", label: "Usuarios", icon: "users", permission: "users.view" },
  {
    href: "/admin/configuracion",
    label: "Configuración",
    icon: "settings",
    permission: "company.settings.manage",
  },
];

const operationsLinks: RoleNavItem[] = [
  {
    href: "/admin/operaciones",
    label: "Operaciones",
    icon: "operations",
    permission: "operations.view",
  },
  {
    href: "/admin/catalogo",
    label: "Productos",
    icon: "products",
    permission: "catalog.product.view",
  },
  {
    href: "/admin/inventario",
    label: "Inventario",
    icon: "inventory",
    permission: "inventory.view",
  },
  { href: "/admin/precios", label: "Precios", icon: "pricing", permission: "pricing.view" },
  {
    href: "/admin/crm?view=clientes",
    label: "Clientes",
    icon: "customers",
    permission: "customers.view",
  },
  { href: "/admin/crm", label: "Pipeline", icon: "pipeline", permission: "crm.view" },
  { href: "/admin/cotizaciones", label: "Cotizaciones", icon: "quotes", permission: "quotes.view" },
  { href: "/admin/ventas", label: "Ventas", icon: "sales", permission: "sales.view" },
  { href: "/admin/pedidos", label: "Pedidos", icon: "orders", permission: "orders.view" },
  { href: "/admin/compras", label: "Compras", icon: "operations", permission: "purchases.manage" },
  { href: "/admin/cms", label: "CMS", icon: "content", permission: "cms.view" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const actor = await requireAdmin();
  const role = actor.role as AppRole;
  const source =
    role === "SUPERADMIN" || role === "GERENCIA" || role === "JEFATURA"
      ? managementLinks
      : operationsLinks;
  const links = source
    .filter(
      ({ permission, icon }) =>
        can(role, permission) && !(role === "GERENCIA" && (icon === "users" || icon === "audit")),
    )
    .map(({ href, label, icon }) => ({
      href,
      label:
        role === "GERENCIA" && href === "/admin/configuracion"
          ? "Configuracion empresarial"
          : label,
      icon,
    }));

  return (
    <AdminShell role={role} links={links}>
      {children}
    </AdminShell>
  );
}
