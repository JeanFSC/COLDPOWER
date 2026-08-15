export const supplierStatuses = ["ACTIVE", "INACTIVE"] as const;
export type SupplierStatus = (typeof supplierStatuses)[number];
export type SupplierInput = { name: string; identification: string | null; country: string; contactName: string | null; whatsapp: string | null; email: string | null; address: string | null; currency: string; notes: string | null; status: SupplierStatus };
type PurchaseItemInput = { productId: string; quantity: number; unitCost: string };
export type PurchaseInput = { supplierId: string; locationId: string; currency: string; notes: string | null; items: PurchaseItemInput[]; idempotencyKey?: string | null };
export type ReceiptInput = { purchaseId: string; items: Array<{ productId: string; quantity: number }>; idempotencyKey?: string | null };
function text(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function nullableText(value: unknown, max: number) { return text(value, max) || null; }
function currency(value: unknown) { const result = text(value, 3).toUpperCase(); if (!/^[A-Z]{3}$/.test(result)) throw new Error("La moneda debe ser ISO de tres letras."); return result; }
function positiveMoney(value: unknown) { const amount = Number(value); if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100) throw new Error("El costo debe ser positivo y tener como máximo dos decimales."); return amount.toFixed(2); }
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
  return { supplierId, locationId, currency: currency(value.currency), notes: nullableText(value.notes, 1000), items: normalized, idempotencyKey: nullableText(value.idempotencyKey, 180) };
}
export function validateReceiptInput(input: unknown): ReceiptInput {
  const value = input && typeof input === "object" ? input as Record<string, unknown> : {}; const purchaseId = text(value.purchaseId, 160); const items = Array.isArray(value.items) ? value.items : [];
  if (!purchaseId || !items.length) throw new Error("Compra y líneas de recepción son obligatorias.");
  const seen = new Set<string>(); const normalized = items.map((item) => { const row = item && typeof item === "object" ? item as Record<string, unknown> : {}; const productId = text(row.productId, 160); const quantity = Number(row.quantity); if (!productId || seen.has(productId)) throw new Error("Cada producto debe ser válido y único dentro de la recepción."); if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("La cantidad recibida debe ser un entero positivo."); seen.add(productId); return { productId, quantity }; });
  return { purchaseId, items: normalized, idempotencyKey: nullableText(value.idempotencyKey, 180) };
}
