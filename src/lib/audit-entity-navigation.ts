import { can, type AppRole, type Permission } from "./roles";

const destinations: Record<string, { permission: Permission; href: (id: string) => string }> = {
  product: { permission: "catalog.product.edit", href: id => `/admin/catalogo/${id}` },
  products: { permission: "catalog.product.edit", href: id => `/admin/catalogo/${id}` },
  customer: { permission: "customers.view", href: id => `/admin/clientes?customerId=${id}` },
  user: { permission: "users.view", href: id => `/admin/usuarios?userId=${id}` },
  order: { permission: "orders.view", href: id => `/admin/pedidos?orderId=${id}` },
  quote: { permission: "quotes.view", href: id => `/admin/cotizaciones?quoteId=${id}` },
  sale: { permission: "sales.view", href: id => `/admin/ventas?saleId=${id}` },
  payment: { permission: "payments.view", href: id => `/admin/pagos?paymentId=${id}` },
  report_schedule: { permission: "reports.view", href: id => `/admin/reportes?scheduleId=${id}` },
  company_settings: { permission: "settings.business.edit", href: () => "/admin/configuracion" },
  integration: { permission: "settings.business.edit", href: () => "/admin/configuracion#company-integrations" },
  notification: { permission: "notifications.view", href: id => `/admin/notificaciones?notificationId=${id}` },
};

export function auditEntityHref(entityType: string, entityId: string, role: AppRole): string | null {
  const key = entityType.toLowerCase();
  const destination = Object.hasOwn(destinations, key) ? destinations[key] : undefined;
  if (!destination || !entityId.trim() || !can(role, destination.permission)) return null;
  return destination.href(encodeURIComponent(entityId));
}
