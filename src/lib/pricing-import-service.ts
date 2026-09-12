import * as XLSX from "xlsx";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, priceHistory, productPrices, products } from "@/db/schema";
import { type PricingPriceType } from "@/lib/pricing-contract";
import { type PricingActor } from "@/lib/pricing-service";
import { normalizePriceDetails } from "@/lib/pricing-validation";
import { can } from "@/lib/roles";

type SourceRow = Record<string, unknown>;
type ImportResult = "new" | "change" | "blocked";
type ImportPrice = { type: PricingPriceType; amount: string; currency: "PEN" | "USD"; wholesaleMinQty: number | null; minimumAllowed: string | null; validFrom: Date; validUntil: Date | null; reason: string; current: typeof productPrices.$inferSelect | null };
type ImportPreviewRow = { rowNumber: number; sku: string; productName: string; priceType: PricingPriceType | null; currentAmount: string | null; newAmount: string | null; currency: string | null; result: ImportResult; message: string; productId: string | null; currentPriceId: string | null; price: ImportPrice | null };

export type PricingImportPreview = {
  filename: string;
  rowsRead: number;
  skuFound: number;
  skuMissing: number;
  newPrices: number;
  changes: number;
  conflicts: number;
  errors: number;
  rows: ImportPreviewRow[];
};

const headerAliases = {
  sku: ["sku", "codigo", "codigo sku", "código", "código sku"],
  currency: ["moneda", "currency"],
  retail: ["minorista", "retail", "precio minorista"],
  wholesale: ["mayorista", "wholesale", "precio mayorista"],
  wholesaleMinQty: ["cantidad mayorista", "cantidad minima mayorista", "cantidad mínima mayorista", "wholesale min qty"],
  minimum: ["minimo", "mínimo", "minimum", "piso comercial"],
  special: ["especial", "special", "precio especial"],
  cost: ["costo", "cost", "precio costo"],
  validFrom: ["valido desde", "válido desde", "valid from", "valid_from"],
  validUntil: ["valido hasta", "válido hasta", "valid until", "valid_until"],
  reason: ["motivo", "reason", "razon", "razón"],
} as const;

function normalizeHeader(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[\s./-]+/g, "_"); }
const aliases = Object.fromEntries(Object.entries(headerAliases).flatMap(([key, values]) => values.map((value) => [normalizeHeader(value), key]))) as Record<string, keyof typeof headerAliases>;
function value(row: SourceRow, key: keyof typeof headerAliases) { for (const [header, current] of Object.entries(row)) if (aliases[normalizeHeader(header)] === key && current !== null && current !== undefined && String(current).trim() !== "") return String(current).trim(); return ""; }
function hasHeader(columns: string[], key: keyof typeof headerAliases) { return columns.some((column) => aliases[normalizeHeader(column)] === key); }

function parseFile(data: ArrayBuffer) {
  const workbook = XLSX.read(Buffer.from(data), { type: "buffer", cellDates: false, raw: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("PRICING_IMPORT_EMPTY");
  return XLSX.utils.sheet_to_json<SourceRow>(sheet, { defval: null, raw: false });
}

function parseAmount(raw: string) {
  const normalized = raw.replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized) || Number(normalized) <= 0) throw new Error("El importe debe ser mayor que cero y tener hasta dos decimales.");
  const [whole, decimal = ""] = normalized.split(".");
  return `${whole}.${decimal.padEnd(2, "0")}`;
}

function parseDate(raw: string, fallback: Date) {
  if (!raw) return fallback;
  const value = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00-05:00`) : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw) ? new Date(`${raw}:00-05:00`) : new Date(raw);
  if (Number.isNaN(value.getTime())) throw new Error("La fecha de vigencia no es válida.");
  return value;
}

async function loadProducts(skus: string[]) {
  const rows = skus.length ? await getDb().select({ id: products.id, sku: products.sku, productName: products.normalizedName }).from(products).where(inArray(products.sku, skus)) : [];
  const priceRows = rows.length ? await getDb().select().from(productPrices).where(inArray(productPrices.productId, rows.map((row) => row.id))).orderBy(desc(productPrices.validFrom), desc(productPrices.createdAt)) : [];
  return new Map(rows.map((row) => [row.sku.toLowerCase(), { ...row, prices: priceRows.filter((price) => price.productId === row.id) }]));
}

function rowForType(source: SourceRow, rowNumber: number, type: PricingPriceType, product: { id: string; sku: string; productName: string; prices: Array<typeof productPrices.$inferSelect> } | undefined, globalReason: string, actor: PricingActor): ImportPreviewRow {
  const sku = value(source, "sku");
  if (!product) return { rowNumber, sku, productName: "Producto no encontrado", priceType: type, currentAmount: null, newAmount: null, currency: null, result: "blocked", message: `SKU ${sku || "vacío"} no existe.`, productId: null, currentPriceId: null, price: null };
  if (type === "COST" && !can(actor.role, "pricing.cost.edit")) return { rowNumber, sku, productName: product.productName, priceType: type, currentAmount: null, newAmount: null, currency: null, result: "blocked", message: "La columna Costo requiere permiso explícito.", productId: product.id, currentPriceId: null, price: null };
  try {
    const amount = parseAmount(value(source, type === "RETAIL" ? "retail" : type === "WHOLESALE" ? "wholesale" : type === "MINIMUM" ? "minimum" : type === "SPECIAL" ? "special" : "cost"));
    const existing = product.prices.find((price) => price.priceType === type && price.active && price.status === "ACTIVE" && price.validFrom.getTime() <= Date.now() && (!price.validUntil || price.validUntil.getTime() > Date.now())) ?? null;
    const currencyValue = value(source, "currency").toUpperCase() || existing?.currency || "PEN";
    if (currencyValue !== "PEN" && currencyValue !== "USD") throw new Error("La moneda debe ser PEN o USD.");
    const validFrom = parseDate(value(source, "validFrom"), existing?.validFrom ?? new Date());
    const validUntilRaw = value(source, "validUntil");
    const validUntil = validUntilRaw ? parseDate(validUntilRaw, new Date()) : existing?.validUntil ?? null;
    if (validUntil && validUntil <= validFrom) throw new Error("La ventana de vigencia no es válida.");
    if (validFrom.getTime() > Date.now()) return { rowNumber, sku, productName: product.productName, priceType: type, currentAmount: existing ? String(existing.amount) : null, newAmount: amount, currency: currencyValue, result: "blocked", message: "La importación no programa cambios; usa el editor de vigencias.", productId: product.id, currentPriceId: existing?.id ?? null, price: null };
    const qtyRaw = value(source, "wholesaleMinQty");
    const wholesaleMinQty = qtyRaw ? Number(qtyRaw) : existing?.wholesaleMinQty ?? null;
    const reason = value(source, "reason") || globalReason;
    if (!reason) throw new Error("El motivo es obligatorio.");
    const minimumAllowed = existing?.minimumAllowed ?? null;
    normalizePriceDetails({ amount, currency: currencyValue, priceType: type, wholesaleMinQty, minimumAllowed, status: "ACTIVE" });
    const duplicateKey = `${product.id}:${type}`;
    void duplicateKey;
    return { rowNumber, sku, productName: product.productName, priceType: type, currentAmount: existing ? String(existing.amount) : null, newAmount: amount, currency: currencyValue, result: existing ? "change" : "new", message: existing ? "Se actualizará el registro vigente." : "Se creará un registro nuevo.", productId: product.id, currentPriceId: existing?.id ?? null, price: { type, amount, currency: currencyValue, wholesaleMinQty, minimumAllowed, validFrom, validUntil, reason, current: existing } };
  } catch (error) {
    return { rowNumber, sku, productName: product.productName, priceType: type, currentAmount: null, newAmount: null, currency: null, result: "blocked", message: error instanceof Error ? error.message : "Fila inválida.", productId: product.id, currentPriceId: null, price: null };
  }
}

async function buildPreview(data: ArrayBuffer, filename: string, actor: PricingActor, globalReason = "") {
  const sourceRows = parseFile(data);
  if (!sourceRows.length) throw new Error("PRICING_IMPORT_EMPTY");
  const columns = [...new Set(sourceRows.flatMap((row) => Object.keys(row)))];
  const hasCostColumn = hasHeader(columns, "cost");
  const skus = [...new Set(sourceRows.map((row) => value(row, "sku")).filter(Boolean))];
  const productsBySku = await loadProducts(skus);
  const rows: ImportPreviewRow[] = [];
  const seenPriceKeys = new Set<string>();
  for (const [index, source] of sourceRows.entries()) {
    const sku = value(source, "sku");
    const product = productsBySku.get(sku.toLowerCase());
    if (hasCostColumn && !can(actor.role, "pricing.cost.edit")) {
      rows.push({ rowNumber: index + 2, sku, productName: product?.productName ?? "Producto no encontrado", priceType: "COST", currentAmount: null, newAmount: null, currency: null, result: "blocked", message: "El archivo incluye la columna Costo y requiere permiso explícito; no se ignoró silenciosamente.", productId: product?.id ?? null, currentPriceId: null, price: null });
      continue;
    }
    const types: PricingPriceType[] = ["RETAIL", "WHOLESALE", "MINIMUM", "SPECIAL", "COST"];
    const populatedTypes = types.filter((type) => value(source, type === "RETAIL" ? "retail" : type === "WHOLESALE" ? "wholesale" : type === "MINIMUM" ? "minimum" : type === "SPECIAL" ? "special" : "cost"));
    if (!populatedTypes.length) {
      rows.push({ rowNumber: index + 2, sku, productName: product?.productName ?? "Producto no encontrado", priceType: null, currentAmount: null, newAmount: null, currency: null, result: "blocked", message: hasCostColumn && !can(actor.role, "pricing.cost.edit") ? "El archivo incluye Costo y requiere permiso explícito." : "La fila no contiene ningún importe.", productId: product?.id ?? null, currentPriceId: null, price: null });
      continue;
    }
    for (const type of populatedTypes) {
      const key = `${sku.toLowerCase()}:${type}`;
      if (seenPriceKeys.has(key)) {
        rows.push({ rowNumber: index + 2, sku, productName: product?.productName ?? "Producto no encontrado", priceType: type, currentAmount: null, newAmount: null, currency: null, result: "blocked", message: "El SKU y tipo aparecen más de una vez en el archivo.", productId: product?.id ?? null, currentPriceId: null, price: null });
        continue;
      }
      seenPriceKeys.add(key);
      rows.push(rowForType(source, index + 2, type, product, globalReason, actor));
    }
  }
  const blocked = rows.filter((row) => row.result === "blocked");
  return { filename, rowsRead: sourceRows.length, skuFound: new Set(rows.filter((row) => row.productId).map((row) => row.sku)).size, skuMissing: new Set(rows.filter((row) => !row.productId).map((row) => row.sku)).size, newPrices: rows.filter((row) => row.result === "new").length, changes: rows.filter((row) => row.result === "change").length, conflicts: blocked.filter((row) => /vigencia|superpone|programa/.test(row.message)).length, errors: blocked.length, rows } satisfies PricingImportPreview;
}

function publicPreview(preview: PricingImportPreview) { return { ...preview, rows: preview.rows.map(({ price, ...row }) => { void price; return row; }) }; }

export async function previewPricingImport(data: ArrayBuffer, filename: string, actor: PricingActor, reason = "") { return publicPreview(await buildPreview(data, filename, actor, reason)); }

export async function applyPricingImport(data: ArrayBuffer, filename: string, actor: PricingActor, reason = "") {
  const preview = await buildPreview(data, filename, actor, reason);
  if (preview.errors) throw new Error(`PRICING_IMPORT_PREFLIGHT_FAILED:${preview.errors}`);
  const db = getDb();
  return db.transaction(async (tx) => {
    for (const row of preview.rows) {
      if (!row.price || !row.productId || !row.priceType) continue;
      const key = `pricing-import:${filename}:${row.rowNumber}:${row.priceType}`;
      if (row.currentPriceId) {
        const [updated] = await tx.update(productPrices).set({ amount: row.price.amount, currency: row.price.currency, wholesaleMinQty: row.price.wholesaleMinQty, minimumAllowed: row.price.minimumAllowed, validFrom: row.price.validFrom, validUntil: row.price.validUntil, idempotencyKey: key, updatedAt: new Date() }).where(and(eq(productPrices.id, row.currentPriceId), eq(productPrices.productId, row.productId))).returning();
        if (!updated) throw new Error("PRICING_IMPORT_STALE");
        await tx.insert(priceHistory).values({ id: `price-history-${crypto.randomUUID()}`, productId: row.productId, priceId: updated.id, priceType: updated.priceType, previousAmount: row.currentAmount, newAmount: updated.amount, currency: updated.currency, reason: row.price.reason, changedBy: actor.userId });
      } else {
        const [created] = await tx.insert(productPrices).values({ id: `price-${crypto.randomUUID()}`, productId: row.productId, priceType: row.priceType, amount: row.price.amount, currency: row.price.currency, wholesaleMinQty: row.price.wholesaleMinQty, minimumAllowed: row.price.minimumAllowed, status: "ACTIVE", validFrom: row.price.validFrom, validUntil: row.price.validUntil, active: true, idempotencyKey: key, createdBy: actor.userId }).returning();
        await tx.insert(priceHistory).values({ id: `price-history-${crypto.randomUUID()}`, productId: row.productId, priceId: created.id, priceType: created.priceType, previousAmount: null, newAmount: created.amount, currency: created.currency, reason: row.price.reason, changedBy: actor.userId });
      }
    }
    await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "pricing.import_applied", entityType: "pricing_import", entityId: `pricing-import-${crypto.randomUUID()}`, before: null, after: { filename, rowsRead: preview.rowsRead, newPrices: preview.newPrices, changes: preview.changes }, metadata: { reason } });
    return preview;
  });
}
