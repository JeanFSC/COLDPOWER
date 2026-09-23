import type { ReactNode } from "react";
import { AdminShell, type AdminNavItem } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications-service";
import { isHiddenAdminHref } from "@/lib/hidden-admin-modules";
import { can, type AppRole, type Permission } from "@/lib/roles";

type RoleNavItem = AdminNavItem & { permission: Permission };

const ADMIN_NAV_ITEMS: RoleNavItem[] = [
  { section: "General", href: "/admin/inicio", label: "Inicio", icon: "home", permission: "dashboard.view" },
  { section: "General", href: "/admin/dashboard", label: "Dashboard", icon: "dashboard", permission: "dashboard.view" },
  { section: "Comercial", href: "/admin/clientes", label: "Clientes", icon: "customers", permission: "customers.view" },
  { section: "Comercial", href: "/admin/crm", label: "Pipeline", icon: "pipeline", permission: "crm.view" },
  { section: "Comercial", href: "/admin/cotizaciones", label: "Cotizaciones", icon: "quotes", permission: "quotes.view" },
  { section: "Comercial", href: "/admin/ventas", label: "Ventas", icon: "sales", permission: "sales.view" },
  { section: "Comercial", href: "/admin/pedidos", label: "Pedidos", icon: "orders", permission: "orders.view" },
  { section: "Comercial", href: "/admin/pagos", label: "Pagos", icon: "payments", permission: "payments.view" },
  { section: "Operación", href: "/admin/operaciones", label: "Operaciones", icon: "operations", permission: "operations.view" },
  { section: "Operación", href: "/admin/inventario", label: "Inventario", icon: "inventory", permission: "inventory.view" },
  { section: "Operación", href: "/admin/compras", label: "Compras", icon: "operations", permission: "purchases.view" },
  { section: "Catálogo", href: "/admin/catalogo", label: "Productos", icon: "products", permission: "catalog.product.view" },
  { section: "Catálogo", href: "/admin/taxonomia", label: "Taxonomía", icon: "products", permission: "catalog.category.manage" },
  { section: "Catálogo", href: "/admin/precios", label: "Precios", icon: "pricing", permission: "pricing.view" },
  { section: "Catálogo", href: "/admin/promociones", label: "Promociones", icon: "pricing", permission: "promotions.manage" },
  { section: "Gestión", href: "/admin/reportes", label: "Reportes", icon: "reports", permission: "reports.view" },
  { section: "Gestión", href: "/admin/notificaciones", label: "Notificaciones", icon: "notifications", permission: "notifications.view" },
  { section: "Gestión", href: "/admin/auditoria", label: "Auditoría", icon: "audit", permission: "audit.view" },
  { section: "Gestión", href: "/admin/usuarios", label: "Usuarios", icon: "users", permission: "users.view" },
  { section: "Gestión", href: "/admin/configuracion", label: "Configuración", icon: "settings", permission: "company.settings.manage" },
  { section: "Gestión", href: "/admin/cms", label: "CMS", icon: "content", permission: "cms.view" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const actor = await requireAdmin();
  const role = actor.role as AppRole;
  const showNotifications = can(role, "notifications.view");
  const unreadNotificationsCount =
    showNotifications && actor.userId ? await getUnreadNotificationCount(actor.userId) : 0;
  const links = ADMIN_NAV_ITEMS
    .filter(({ href }) => !isHiddenAdminHref(href))
    .filter(({ permission }) => can(role, permission))
    .map(({ href, label, icon, section }) => ({ href, label, icon, section }));

  return (
    <AdminShell
      role={role}
      links={links}
      showNotifications={showNotifications}
      unreadNotificationsCount={unreadNotificationsCount}
    >
      {children}
    </AdminShell>
  );
}
