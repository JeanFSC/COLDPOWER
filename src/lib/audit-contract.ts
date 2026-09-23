export class AuditInvalidFilterError extends Error { constructor() { super("AUDIT_INVALID_FILTER"); this.name = "AuditInvalidFilterError"; } }
export type AuditFilters = { query?: string; module?: string; action?: string; entityType?: string; entityId?: string; actorId?: string; actorRole?: string; severity?: string; origin?: string; dateFrom?: string; dateTo?: string; page?: number; pageSize?: number };
function text(params: URLSearchParams, key: string) { const value = params.get(key)?.trim(); return value || undefined; }
function positive(params: URLSearchParams, key: string) { const raw = params.get(key); if (!raw) return undefined; const value = Number(raw); if (!Number.isInteger(value) || value < 1) throw new AuditInvalidFilterError(); return value; }
function date(params: URLSearchParams, key: string) { const value = text(params, key); if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new AuditInvalidFilterError(); return value; }
export function parseAuditFilters(params: URLSearchParams): AuditFilters { const dateFrom = date(params, "dateFrom"); const dateTo = date(params, "dateTo"); if (dateFrom && dateTo && dateFrom > dateTo) throw new AuditInvalidFilterError(); return { query: text(params, "query") ?? text(params, "q"), module: text(params, "module"), action: text(params, "action"), entityType: text(params, "entityType"), entityId: text(params, "entityId"), actorId: text(params, "actorId"), actorRole: text(params, "actorRole"), severity: text(params, "severity"), origin: text(params, "origin"), dateFrom, dateTo, page: positive(params, "page"), pageSize: positive(params, "pageSize") }; }
export function auditSeverity(action: string, stored?: string | null): "INFO" | "WARNING" | "CRITICAL" { if (stored === "CRITICAL" || stored === "WARNING") return stored; if (/delete|role|permission|publish|refund|failed|denied|blocked|archive/i.test(action)) return /failed|denied|blocked/i.test(action) ? "WARNING" : "CRITICAL"; return "INFO"; }

// Shared action/module constants so the writers (Clerk webhook, integration test
// runner) and the audit reader (KPI queries) agree on exactly what to count.
export const AUDIT_LOGIN_ACTION = "access.session_created";
export const AUDIT_INTEGRATION_MODULE = "integrations";
export const AUDIT_INTEGRATION_TEST_ACTION = "integrations.tested";

// Raw `module` column value -> Spanish display label used across the audit UI.
// Most rows get their raw module from the `action` prefix (e.g. "pricing.price_updated"
// -> "pricing"); a few older call sites insert directly into audit_logs with a dotless
// SCREAMING_SNAKE action (PRODUCT_CREATED, REASSIGN...) which leaves `module` equal to
// the action itself — those are re-derived from entityType instead (see moduleLabel).
const MODULE_LABELS: Record<string, string> = {
  pricing: "Precios", inventory: "Inventario", customers: "Clientes", crm: "Pipeline",
  quotes: "Cotizaciones", sales: "Ventas", orders: "Pedidos", purchases: "Compras",
  payments: "Pagos", cms: "CMS", reports: "Reportes", notifications: "Notificaciones",
  access: "Accesos", company: "Configuración", taxonomy: "Taxonomía", promotions: "Promociones",
  media: "Media", catalog: "Productos", operations: "Operaciones", audit: "Auditoría",
  clerk: "Sistema", integrations: "Integraciones", users: "Usuarios",
  // Aliases written by the dev visual-history seed (module = `${entityType}s`).
  products: "Productos", inventorys: "Inventario", pipeline: "Pipeline", opportunities: "Pipeline",
};
const ENTITY_MODULE_FALLBACK: Record<string, string> = {
  product: "Productos", products: "Productos", sale: "Ventas", order: "Pedidos", quote: "Cotizaciones",
  opportunity: "Pipeline", user: "Usuarios", payment: "Pagos", inventory: "Inventario",
  company_settings: "Configuración", customer: "Clientes", operations_workspace: "Operaciones",
  work_item: "Operaciones", integration: "Integraciones",
};
function humanize(raw: string): string {
  return raw.replace(/[_-]+/g, " ").toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}
export function moduleLabel(rawModule: string, action: string, entityType: string): string {
  const key = rawModule.toLowerCase();
  if (MODULE_LABELS[key]) return MODULE_LABELS[key];
  if (rawModule === action && ENTITY_MODULE_FALLBACK[entityType]) return ENTITY_MODULE_FALLBACK[entityType];
  return humanize(rawModule);
}

const ENTITY_LABELS: Record<string, string> = {
  product: "Producto", products: "Productos", sale: "Venta", order: "Pedido", quote: "Cotización",
  opportunity: "Oportunidad", user: "Usuario", payment: "Pago", inventory: "Inventario",
  company_settings: "Configuración", customer: "Cliente", operations_workspace: "Espacio de operaciones",
  work_item: "Tarea", integration: "Integración", price: "Precio", discount_rule: "Regla de descuento",
  media_asset: "Recurso", clerk_webhook: "Webhook de Clerk", report_schedule: "Reporte programado",
  promotion: "Promoción", location: "Almacén", transfer: "Transferencia", reservation: "Reserva",
};
export function entityLabel(entityType: string): string {
  return ENTITY_LABELS[entityType.toLowerCase()] ?? humanize(entityType);
}

// Raw action -> Spanish verb phrase for the table's ACCIÓN column. Falls back to a
// humanized read of the action's last segment for anything not explicitly mapped
// (new actions still render as readable text, never a blank cell).
const ACTION_LABELS: Record<string, string> = {
  PRODUCT_CREATED: "Creó el producto", PRODUCT_DUPLICATE_REVIEWED: "Revisó un posible duplicado",
  PRODUCT_EDITORIAL_UPDATED: "Actualizó contenido editorial", PRODUCT_IMPORTED: "Importó el producto",
  PRODUCT_MEDIA_ASSOCIATED: "Asoció un archivo multimedia", PRODUCT_MEDIA_REMOVED: "Quitó un archivo multimedia",
  PRODUCT_PUBLICATION_CHANGED: "Cambió la publicación", CATALOG_BULK_ACTION: "Acción masiva de catálogo",
  CATALOG_IMPORT_COMMITTED: "Confirmó una importación", REASSIGN: "Reasignó la tarea", RESOLVE: "Resolvió la tarea", TAKE: "Tomó la tarea",
  "access.staff_invitation_created": "Invitó a un colaborador", "access.user_deletion_tombstone": "Registró baja de usuario",
  "access.user_role_sync_failed": "Falló sincronización de rol", "access.user_status_changed": "Cambió el estado del usuario",
  "access.user_role_changed": "Cambió el rol", "access.user_deactivated": "Desactivó el usuario",
  "access.user_deletion_blocked": "Bloqueó una baja de usuario", "access.session_created": "Inició sesión",
  "audit.exported": "Exportó auditoría", "clerk.webhook_processed": "Procesó evento de Clerk",
  "company.settings_restored": "Restauró configuración", "company.settings_updated": "Actualizó configuración",
  "crm.lead_created_from_quote": "Creó un lead desde cotización", "crm.pipeline_exported": "Exportó el pipeline",
  "crm.whatsapp_lead_created": "Creó un lead desde WhatsApp", "customers.exported": "Exportó clientes",
  "inventory.location_created": "Creó un almacén", "inventory.minimum_stock_updated": "Actualizó el stock mínimo",
  "inventory.movement_created": "Registró un movimiento", "inventory.reservation_consumed": "Consumió una reserva",
  "inventory.reservation_created": "Creó una reserva", "inventory.reservation_expired": "Expiró una reserva",
  "inventory.reservation_released": "Liberó una reserva", "inventory.transfer_created": "Creó una transferencia",
  "inventory.transfer_received": "Recibió una transferencia", "inventory.transfer_status_changed": "Cambió el estado de una transferencia",
  "media.asset_archived": "Archivó un recurso", "media.asset_associated": "Asoció un recurso",
  "media.asset_disassociated": "Desasoció un recurso", "media.asset_updated": "Actualizó un recurso", "media.asset_uploaded": "Subió un recurso",
  "operations.exported": "Exportó operaciones", "orders.exported": "Exportó pedidos", "payments.exported": "Exportó pagos",
  "pricing.bulk_applied": "Aplicó precios en lote", "pricing.discount_rule_created": "Creó una regla de descuento",
  "pricing.discount_rule_status_changed": "Cambió el estado de un descuento", "pricing.discount_rule_updated": "Actualizó una regla de descuento",
  "pricing.exported": "Exportó precios", "pricing.import_applied": "Aplicó una importación de precios",
  "pricing.price_archived": "Archivó un precio", "pricing.price_created": "Creó un precio",
  "pricing.price_replacement_scheduled": "Programó reemplazo de precio", "pricing.price_updated": "Actualizó un precio",
  "promotions.applied": "Aplicó una promoción", "promotions.created": "Creó una promoción",
  "promotions.exported": "Exportó promociones", "promotions.updated": "Actualizó una promoción",
  "purchases.exported": "Exportó compras", "quotes.exported": "Exportó cotizaciones", "quotes.pdf_generated": "Generó un PDF de cotización",
  "reports.exported": "Exportó reportes", "reports.schedule_cancelled": "Canceló un reporte programado",
  "reports.schedule_created": "Programó un reporte", "sales.cancelled": "Canceló una venta",
  "sales.exported": "Exportó ventas", "sales.invoice_status_updated": "Actualizó el estado de una factura",
  "integrations.tested": "Probó una integración",
  // Dev visual-history seed actions.
  "quotes.created": "Creó la cotización", "opportunities.created": "Creó la oportunidad", "sales.created": "Creó la venta",
  "orders.created": "Creó el pedido", "payments.created": "Registró el pago", "customers.created": "Creó el cliente",
  "inventory.adjustment": "Ajustó el inventario", "catalog.product_editorial_updated": "Actualizó contenido editorial",
  "catalog.media_associated": "Asoció un archivo multimedia",
};
export function actionLabel(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  const tail = action.includes(".") ? (action.split(".").pop() ?? action) : action;
  return humanize(tail);
}
export function isFailedAction(action: string): boolean {
  return /failed|denied|invalid/i.test(action);
}

// "Cambios sensibles" = writes to modules that touch price, permissions or configuration —
// the same three categories the audit alert copy describes. Computed from the real module,
// not a stored flag, so the definition stays adjustable without a backfill.
export const SENSITIVE_MODULES = ["pricing", "access", "company"] as const;
const sensitiveModuleSet = new Set<string>(SENSITIVE_MODULES);
export function isSensitiveModule(rawModule: string): boolean {
  return sensitiveModuleSet.has(rawModule.toLowerCase());
}

// Severity is a fixed 3-value domain (see the `audit_logs.severity` column), not
// something to discover per query — a distinct-values query would make the filter
// dropdown lose the very option the user just selected whenever it narrows the
// result set to zero rows.
export const ALL_SEVERITIES = ["INFO", "WARNING", "CRITICAL"] as const;

export type AuditListItem = {
  id: string; createdAt: Date; actorId: string | null; actorRole: string | null; action: string;
  module: string; moduleLabel: string; entityType: string; entityId: string;
  before: Record<string, unknown> | null; after: Record<string, unknown> | null;
  origin: string | null; requestId: string | null; correlationId: string | null;
  metadata: Record<string, unknown> | null; severity: "INFO" | "WARNING" | "CRITICAL";
  sensitive: boolean; ip: string | null; browserLabel: string | null; geo: { city: string | null; country: string | null };
  actorName: string | null; actorEmail: string | null;
};
export type AuditKpi = { current: number; previous: number; deltaPct: number | null };
export type AuditTrendPoint = { date: string; total: number; critical: number; failed: number; sensitive: number; logins: number; integrationErrors: number };
export type AuditAlert = { tone: "red" | "amber" | "blue" | "emerald"; title: string; description: string };
export type AuditPageResponse = {
  items: AuditListItem[]; page: number; pageSize: number; totalItems: number; totalPages: number;
  metrics: { events: AuditKpi; critical: AuditKpi; sensitive: AuditKpi; logins: AuditKpi; integrationErrors: AuditKpi; failed: AuditKpi };
  facets: { modules: Array<{ value: string; label: string }>; severities: string[] };
  trend: AuditTrendPoint[];
  trendPrevious: number[];
  alerts: AuditAlert[];
};
export type AuditFieldDiff = { field: string; before: unknown; after: unknown };
export type AuditSavedFilter = { id: string; name: string; filters: Record<string, unknown>; createdAt: Date };

function flatten(value: Record<string, unknown> | null | undefined, prefix = ""): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value ?? {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (item && typeof item === "object" && !Array.isArray(item)) Object.assign(out, flatten(item as Record<string, unknown>, path));
    else out[path] = item;
  }
  return out;
}

// Field-level diff between two audit snapshots, used by the drawer's "Cambios" tab.
// Only fields that actually changed are returned — a raw JSON diff of two large
// snapshots is noise; the reader wants what moved, not what stayed the same.
export function diffAuditSnapshots(before: Record<string, unknown> | null, after: Record<string, unknown> | null): AuditFieldDiff[] {
  const beforeFlat = flatten(before);
  const afterFlat = flatten(after);
  const fields = new Set([...Object.keys(beforeFlat), ...Object.keys(afterFlat)]);
  const diffs: AuditFieldDiff[] = [];
  for (const field of fields) {
    const beforeValue = beforeFlat[field];
    const afterValue = afterFlat[field];
    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) diffs.push({ field, before: beforeValue ?? null, after: afterValue ?? null });
  }
  return diffs.sort((a, b) => a.field.localeCompare(b.field));
}

// Viewers without audit.sensitive.view get the event envelope only: no snapshots, request
// metadata or raw IP. Viewers with it get snapshots passed through sanitizeAuditValue, since
// some rows were written directly without going through writeAuditLog's sanitization.
export function presentAuditItem<T extends AuditListItem>(item: T, canViewSensitive: boolean, sanitize: (value: unknown) => unknown): T {
  if (!canViewSensitive) return { ...item, before: null, after: null, metadata: null, ip: null, origin: item.origin && item.origin === item.ip ? null : item.origin };
  return { ...item, before: sanitize(item.before) as T["before"], after: sanitize(item.after) as T["after"], metadata: sanitize(item.metadata) as T["metadata"] };
}
