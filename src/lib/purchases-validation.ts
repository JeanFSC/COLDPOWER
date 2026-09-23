export const supplierStatuses = ["ACTIVE", "INACTIVE"] as const;
export type SupplierStatus = (typeof supplierStatuses)[number];
export type SupplierInput = { name: string; identification: string | null; country: string; contactName: string | null; whatsapp: string | null; email: string | null; address: string | null; currency: string; notes: string | null; status: SupplierStatus };
type PurchaseItemInput = { productId: string; quantity: number; unitCost: string };
export const purchaseCreationModes = ["DRAFT", "PENDING"] as const;
export type PurchaseCreationMode = (typeof purchaseCreationModes)[number];
export type PurchaseInput = { supplierId: string; locationId: string; currency: string; notes: string | null; items: PurchaseItemInput[]; createAs?: PurchaseCreationMode; expectedDeliveryAt?: string | null; requestId?: string | null; idempotencyKey?: string | null };
export type ReceiptInput = { purchaseId: string; items: Array<{ productId: string; quantity: number }>; idempotencyKey?: string | null };
export const purchaseRequestStatuses = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "CONVERTED", "CANCELLED"] as const;
export const purchaseRequestSources = ["MANUAL", "STOCK_ALERT", "REPLENISHMENT", "OTHER"] as const;
export type PurchaseRequestStatus = (typeof purchaseRequestStatuses)[number];
export type PurchaseRequestSource = (typeof purchaseRequestSources)[number];
export type PurchaseRequestInput = { locationId: string; source?: PurchaseRequestSource; notes: string | null; items: Array<{ productId: string; quantity: number; notes: string | null }>; idempotencyKey?: string | null };
function text(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function nullableText(value: unknown, max: number) { return text(value, max) || null; }
function currency(value: unknown) { const result = text(value, 3).toUpperCase(); if (!/^[A-Z]{3}$/.test(result)) throw new Error("La moneda debe ser ISO de tres letras."); return result; }
function positiveMoney(value: unknown) { const amount = Number(value); if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100) throw new Error("El costo debe ser positivo y tener como máximo dos decimales."); return amount.toFixed(2); }
export function validatePurchaseRequestConversionItems(items: Array<{ productId: string; quantityRequested: number }>, unitCosts: Record<string, unknown>) {
  if (!items.length) throw new Error("La solicitud no tiene líneas para convertir.");
  return items.map((item) => {
    if (!item.productId || !Number.isInteger(item.quantityRequested) || item.quantityRequested <= 0) throw new Error("La línea de solicitud no es válida.");
    return { productId: item.productId, quantity: item.quantityRequested, unitCost: positiveMoney(unitCosts[item.productId]) };
  });
}
export function validateSupplierInput(input: unknown): SupplierInput {
  const value = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const name = text(value.name, 180); const country = text(value.country, 2).toUpperCase(); const status = text(value.status, 20) || "ACTIVE";
  if (!name) throw new Error("El proveedor necesita nombre."); if (!/^[A-Z]{2}$/.test(country)) throw new Error("El país debe ser ISO de dos letras."); if (!(supplierStatuses as readonly string[]).includes(status)) throw new Error("Estado de proveedor no válido.");
  return { name, country, currency: currency(value.currency), identification: nullableText(value.identification, 60), contactName: nullableText(value.contactName, 160), whatsapp: nullableText(value.whatsapp, 40), email: nullableText(value.email, 180)?.toLowerCase() ?? null, address: nullableText(value.address, 300), notes: nullableText(value.notes, 1000), status: status as SupplierStatus };
}
export function validatePurchaseInput(input: unknown): PurchaseInput {
  const value = input && typeof input === "object" ? input as Record<string, unknown> : {}; const supplierId = text(value.supplierId, 160); const locationId = text(value.locationId, 160); const items = Array.isArray(value.items) ? value.items : [];
  if (!supplierId || !locationId || !items.length || items.length > 500) throw new Error("Proveedor, local y al menos una línea son obligatorios.");
  const seen = new Set<string>(); const normalized = items.map((item) => { const row = item && typeof item === "object" ? item as Record<string, unknown> : {}; const productId = text(row.productId, 160); const quantity = Number(row.quantity); if (!productId || seen.has(productId)) throw new Error("Cada producto debe ser válido y único dentro de la compra."); if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100000) throw new Error("La cantidad de compra debe ser un entero positivo."); seen.add(productId); return { productId, quantity, unitCost: positiveMoney(row.unitCost) }; });
  const createAs = text(value.createAs, 20) || "PENDING";
  if (!(purchaseCreationModes as readonly string[]).includes(createAs)) throw new Error("Modo de creación de OC no válido.");
  const expectedDeliveryAt = nullableText(value.expectedDeliveryAt, 40);
  if (expectedDeliveryAt && Number.isNaN(new Date(expectedDeliveryAt).getTime())) throw new Error("La fecha esperada de entrega no es válida.");
  return { supplierId, locationId, currency: currency(value.currency), notes: nullableText(value.notes, 1000), items: normalized, createAs: createAs as PurchaseCreationMode, expectedDeliveryAt: expectedDeliveryAt ? new Date(expectedDeliveryAt).toISOString() : null, requestId: nullableText(value.requestId, 180), idempotencyKey: nullableText(value.idempotencyKey, 180) };
}

export function validatePurchaseRequestInput(input: unknown): PurchaseRequestInput {
  const value = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const locationId = text(value.locationId, 160);
  const source = text(value.source, 30) || "MANUAL";
  const items = Array.isArray(value.items) ? value.items : [];
  if (!locationId || !items.length || items.length > 500) throw new Error("Local y al menos una línea son obligatorios.");
  if (!(purchaseRequestSources as readonly string[]).includes(source)) throw new Error("Origen de solicitud no válido.");
  const seen = new Set<string>();
  const normalized = items.map((item) => {
    const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const productId = text(row.productId, 160);
    const quantity = Number(row.quantity);
    if (!productId || seen.has(productId)) throw new Error("Cada producto debe ser válido y único dentro de la solicitud.");
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100000) throw new Error("La cantidad solicitada debe ser un entero positivo.");
    seen.add(productId);
    return { productId, quantity, notes: nullableText(row.notes, 500) };
  });
  return { locationId, source: source as PurchaseRequestSource, notes: nullableText(value.notes, 1000), items: normalized, idempotencyKey: nullableText(value.idempotencyKey, 180) };
}
export function validateReceiptInput(input: unknown): ReceiptInput {
  const value = input && typeof input === "object" ? input as Record<string, unknown> : {}; const purchaseId = text(value.purchaseId, 160); const items = Array.isArray(value.items) ? value.items : [];
  if (!purchaseId || !items.length) throw new Error("Compra y líneas de recepción son obligatorias.");
  const seen = new Set<string>(); const normalized = items.map((item) => { const row = item && typeof item === "object" ? item as Record<string, unknown> : {}; const productId = text(row.productId, 160); const quantity = Number(row.quantity); if (!productId || seen.has(productId)) throw new Error("Cada producto debe ser válido y único dentro de la recepción."); if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("La cantidad recibida debe ser un entero positivo."); seen.add(productId); return { productId, quantity }; });
  return { purchaseId, items: normalized, idempotencyKey: nullableText(value.idempotencyKey, 180) };
}
