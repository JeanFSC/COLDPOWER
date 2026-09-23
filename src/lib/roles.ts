export const appRoles = ["SUPERADMIN", "JEFATURA", "ADMIN", "VENTAS", "ALMACEN", "COMPRAS", "REPORTES"] as const;
export const businessRoles = ["SUPERADMIN", "GERENCIA", "OPERACIONES_VENTAS"] as const;
export const allOperationalRoles = [...new Set([...appRoles, ...businessRoles])] as readonly string[];
export type OperationalRole = (typeof appRoles)[number] | (typeof businessRoles)[number];
export type BusinessRole = (typeof businessRoles)[number];
export type AppRole = OperationalRole | "admin" | "customer";

export const permissions = [
  "dashboard.view", "catalog.product.view", "catalog.product.create", "catalog.product.edit", "catalog.product.publish", "catalog.product.archive",
  "catalog.category.manage", "catalog.family.manage", "catalog.brand.manage", "catalog.product.review",
  "media.view", "media.upload", "media.edit", "media.delete",
  "cms.view", "cms.edit", "cms.publish",
  "inventory.view", "inventory.adjust", "inventory.transfer", "inventory.reserve", "inventory.kardex.view",
  "pricing.view", "pricing.edit", "pricing.cost.view", "pricing.cost.edit", "pricing.margin.view", "pricing.discount.apply", "pricing.discount.approve", "pricing.discount.manage",
  "customers.view", "customers.create", "customers.edit", "customers.manage", "customers.export",
  "crm.view", "crm.create", "crm.edit", "crm.assign", "crm.close", "crm.export",
  "quotes.view", "quotes.create", "quotes.edit", "quotes.send", "quotes.convert", "quotes.export",
  "sales.view", "sales.create", "sales.edit", "sales.cancel",
  "orders.view", "orders.create", "orders.edit",
  "payments.view", "payments.review", "payments.manual.confirm", "payments.refund", "payments.webhook.manage", "payments.export", "purchases.view", "purchases.receive", "purchases.approve", "purchases.cost.view", "purchases.cost.manage",
  "reports.view", "reports.export", "audit.view", "audit.export", "audit.sensitive.view",
  "users.view", "users.invite", "users.manage", "users.export", "roles.view", "roles.manage",
  "settings.business.edit", "settings.technical.edit", "integrations.manage", "operations.view", "operations.assign", "notifications.manage", "notifications.preferences", "promotions.export",
  "catalog.product.edit", "catalog.product.publish", "catalog.media.upload", "cms.edit", "inventory.adjust", "inventory.transfer", "inventory.reserve", "pricing.edit", "pricing.cost.view", "pricing.discount.approve", "crm.manage", "sales.manage", "orders.manage", "payments.manage", "purchases.manage", "notifications.view", "promotions.manage", "company.settings.manage", "catalog:publish", "catalog:review", "quote:manage", "inventory:read", "inventory:adjust", "inventory:transfer", "inventory:reserve", "reports:read", "roles:manage",
] as const;
export type Permission = (typeof permissions)[number];

const all = permissions;
const businessCore = [
  "catalog.product.view", "catalog.product.create", "catalog.product.edit", "catalog.product.publish", "catalog.product.archive", "catalog.category.manage", "catalog.family.manage", "catalog.brand.manage",
  "media.view", "media.upload", "media.edit", "media.delete", "cms.view", "cms.edit", "cms.publish",
  "inventory.view", "inventory.adjust", "inventory.transfer", "inventory.reserve", "inventory.kardex.view", "inventory.adjust", "inventory.transfer", "inventory.reserve",
  "pricing.view", "pricing.edit", "pricing.discount.apply", "customers.view", "customers.create", "customers.edit", "customers.manage", "customers.export",
  "crm.view", "crm.create", "crm.edit", "crm.assign", "crm.close", "crm.export", "quotes.view", "quotes.create", "quotes.edit", "quotes.send", "quotes.convert", "quotes.export",
  "sales.view", "sales.create", "sales.edit", "sales.cancel", "orders.view", "orders.create", "orders.edit", "payments.view", "payments.export", "purchases.view", "purchases.receive", "purchases.cost.view", "operations.view",
  "catalog.product.edit", "catalog.product.publish", "catalog.media.upload", "cms.edit", "inventory:read", "inventory:adjust", "inventory:transfer", "inventory:reserve", "quote:manage", "crm.manage", "sales.manage", "orders.manage", "pricing.edit", "notifications.view", "promotions.manage",
] as const satisfies readonly Permission[];
const businessManagement = [
  ...businessCore, "dashboard.view", "reports.view", "reports.export", "audit.view", "audit.export", "audit.sensitive.view", "pricing.cost.view", "pricing.cost.edit", "pricing.margin.view", "pricing.discount.approve", "pricing.discount.manage", "payments.manage", "payments.review", "payments.manual.confirm", "payments.refund", "payments.webhook.manage", "purchases.approve", "operations.assign", "company.settings.manage", "settings.business.edit", "users.view", "users.invite", "users.export", "notifications.manage", "notifications.preferences", "promotions.export", "reports:read",
] as const satisfies readonly Permission[];
const businessOperations = businessCore;

const rolePermissions: Record<OperationalRole, readonly Permission[]> = {
  SUPERADMIN: all,
  GERENCIA: businessManagement,
  OPERACIONES_VENTAS: businessOperations,
  JEFATURA: [
    ...businessManagement, "catalog:publish", "catalog:review", "catalog.product.review", "users.manage",
  ],
  ADMIN: businessOperations,
  VENTAS: [
    "catalog.product.view", "catalog.product.edit", "catalog.media.upload", "inventory.view", "customers.view", "customers.create", "customers.edit", "customers.manage", "crm.view", "crm.manage", "crm.export", "sales.view", "sales.manage", "quotes.view", "quotes.create", "quotes.edit", "quotes.send", "quotes.convert", "quotes.export", "quote:manage", "orders.view", "orders.manage", "payments.view", "payments.export", "inventory:read", "operations.view",
  ],
  ALMACEN: ["inventory.view", "inventory.adjust", "inventory.transfer", "inventory.reserve", "inventory.kardex.view", "orders.view", "orders.manage", "inventory:read", "inventory:adjust", "inventory:transfer", "inventory:reserve", "operations.view"],
  COMPRAS: ["inventory.view", "pricing.view", "purchases.view", "purchases.receive", "purchases.cost.view", "purchases.cost.manage", "purchases.manage", "inventory:read", "operations.view"],
  REPORTES: ["inventory.view", "reports.view", "reports.export", "audit.view", "audit.export", "inventory:read", "reports:read"],
};

const roleLabels: Record<AppRole, string> = {
  SUPERADMIN: "Superadmin",
  GERENCIA: "Gerencia",
  OPERACIONES_VENTAS: "Operaciones y ventas",
  JEFATURA: "Jefatura",
  ADMIN: "Administrador",
  VENTAS: "Ventas",
  ALMACEN: "Almacén",
  COMPRAS: "Compras",
  REPORTES: "Reportes",
  admin: "Administrador legacy",
  customer: "Cliente",
};

const businessRoleMap: Record<AppRole, BusinessRole | "CUSTOMER"> = {
  SUPERADMIN: "SUPERADMIN", GERENCIA: "GERENCIA", OPERACIONES_VENTAS: "OPERACIONES_VENTAS", JEFATURA: "GERENCIA", ADMIN: "OPERACIONES_VENTAS", VENTAS: "OPERACIONES_VENTAS", ALMACEN: "OPERACIONES_VENTAS", COMPRAS: "OPERACIONES_VENTAS", REPORTES: "OPERACIONES_VENTAS", admin: "OPERACIONES_VENTAS", customer: "CUSTOMER",
};

export function can(role: AppRole, permission: Permission) {
  if (role === "customer") return false;
  const normalizedRole = role === "admin" ? "ADMIN" : role;
  return rolePermissions[normalizedRole]?.includes(permission) ?? false;
}

export function permissionsForRole(role: AppRole): Permission[] {
  if (role === "customer") return [];
  const normalizedRole = role === "admin" ? "ADMIN" : role;
  return [...(rolePermissions[normalizedRole] ?? [])];
}

export function isAppRole(value: unknown): value is AppRole {
  return value === "admin" || value === "customer" || (typeof value === "string" && allOperationalRoles.includes(value));
}

export function isStaffRole(value: unknown): value is OperationalRole | "admin" {
  return value === "admin" || (typeof value === "string" && allOperationalRoles.includes(value));
}

export function toBusinessRole(role: AppRole): BusinessRole | "CUSTOMER" {
  return businessRoleMap[role];
}

export function roleLabel(role: AppRole) {
  return roleLabels[role];
}

type RoleClaims = { metadata?: { role?: unknown } | null; publicMetadata?: { role?: unknown } | null };
export function roleFromClaims(claims: unknown): AppRole | null {
  if (!claims || typeof claims !== "object") return null;
  const input = claims as RoleClaims;
  const metadataRole = input.metadata?.role;
  if (isAppRole(metadataRole)) return metadataRole;
  const publicMetadataRole = input.publicMetadata?.role;
  return isAppRole(publicMetadataRole) ? publicMetadataRole : null;
}
