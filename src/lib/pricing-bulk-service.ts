import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, priceHistory, productPrices, products } from "@/db/schema";
import { type PricingPriceType } from "@/lib/pricing-contract";
import { normalizePriceDetails } from "@/lib/pricing-validation";
import { type PricingActor } from "@/lib/pricing-service";
import { can } from "@/lib/roles";

export type BulkPriceOperation = "SET" | "INCREASE_PERCENT" | "DECREASE_PERCENT" | "ARCHIVE";

export type BulkPriceInput = {
  productIds: string[];
  priceType: unknown;
  operation: unknown;
  amount?: unknown;
  percentage?: unknown;
  currency?: unknown;
  wholesaleMinQty?: unknown;
  minimumAllowed?: unknown;
  reason?: unknown;
  idempotencyKey?: unknown;
};

type BulkRow = {
  productId: string;
  sku: string;
  productName: string;
  current: typeof productPrices.$inferSelect | null;
};

export type BulkPreviewRow = {
  productId: string;
  sku: string;
  productName: string;
  currentPriceId: string | null;
  currentAmount: string | null;
  currentCurrency: string | null;
  newAmount: string | null;
  newCurrency: string | null;
  result: "new" | "change" | "archive" | "blocked";
  message: string;
};

export type BulkPreview = { selected: number; valid: number; blocked: number; newPrices: number; changes: number; archives: number; rows: BulkPreviewRow[] };

const editableTypes: PricingPriceType[] = ["RETAIL", "WHOLESALE", "MINIMUM", "SPECIAL", "COST"];
const operations: BulkPriceOperation[] = ["SET", "INCREASE_PERCENT", "DECREASE_PERCENT", "ARCHIVE"];
const oneHundred = BigInt(100);
const tenThousand = BigInt(10000);
const halfBasis = BigInt(5000);

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function parseCents(value: unknown, label: string) {
  const raw = text(value).replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) throw new Error(`BULK_${label.toUpperCase()}_INVALID`);
  const [whole, decimal = ""] = raw.split(".");
  const cents = BigInt(`${whole}${decimal.padEnd(2, "0")}`);
  if (cents <= BigInt(0)) throw new Error(`BULK_${label.toUpperCase()}_INVALID`);
  return cents;
}

function amountFromCents(cents: bigint) {
  return `${cents / oneHundred}.${(cents % oneHundred).toString().padStart(2, "0")}`;
}

function parseBasisPoints(value: unknown) {
  const raw = text(value).replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) throw new Error("BULK_PERCENTAGE_INVALID");
  const [whole, decimal = ""] = raw.split(".");
  const basisPoints = BigInt(`${whole}${decimal.padEnd(2, "0")}`);
  if (basisPoints <= BigInt(0) || basisPoints > tenThousand) throw new Error("BULK_PERCENTAGE_INVALID");
  return basisPoints;
}

function percentageAmount(currentAmount: string, operation: BulkPriceOperation, percentage: unknown) {
  const cents = parseCents(currentAmount, "amount");
  const basisPoints = parseBasisPoints(percentage);
  const factor = operation === "INCREASE_PERCENT" ? tenThousand + basisPoints : tenThousand - basisPoints;
  const next = (cents * factor + halfBasis) / tenThousand;
  if (next <= BigInt(0)) throw new Error("BULK_AMOUNT_INVALID");
  return amountFromCents(next);
}

function normalizeInput(input: BulkPriceInput, actor: PricingActor) {
  const priceType = text(input.priceType) as PricingPriceType;
  const operation = text(input.operation) as BulkPriceOperation;
  if (!editableTypes.includes(priceType)) throw new Error("BULK_PRICE_TYPE_INVALID");
  if (!operations.includes(operation)) throw new Error("BULK_OPERATION_INVALID");
  if (!can(actor.role, "pricing.edit")) throw new Error("PRICING_FORBIDDEN");
  if (priceType === "COST" && !can(actor.role, "pricing.cost.edit")) throw new Error("PRICING_COST_FORBIDDEN");
  const reason = text(input.reason).slice(0, 240);
  if (!reason) throw new Error("PRICE_REASON_REQUIRED");
  const productIds = [...new Set(input.productIds.filter(Boolean))].slice(0, 100);
  if (!productIds.length) throw new Error("BULK_PRODUCTS_REQUIRED");
  if (operation === "SET") parseCents(input.amount, "amount");
  if (operation === "INCREASE_PERCENT" || operation === "DECREASE_PERCENT") parseBasisPoints(input.percentage);
  const currency = text(input.currency).toUpperCase();
  if (operation === "SET" && currency !== "PEN" && currency !== "USD") throw new Error("BULK_CURRENCY_INVALID");
  return { ...input, productIds, priceType, operation, reason, currency: currency || undefined };
}

async function loadRows(input: ReturnType<typeof normalizeInput>) {
  const db = getDb();
  const productRows = await db.select({ id: products.id, sku: products.sku, productName: products.normalizedName }).from(products).where(inArray(products.id, input.productIds));
  const priceRows = productRows.length ? await db.select().from(productPrices).where(and(inArray(productPrices.productId, productRows.map((row) => row.id)), eq(productPrices.priceType, input.priceType))).orderBy(desc(productPrices.validFrom), desc(productPrices.createdAt)) : [];
  const now = Date.now();
  return input.productIds.map((productId): BulkRow => {
    const product = productRows.find((row) => row.id === productId);
    if (!product) return { productId, sku: productId, productName: "Producto no encontrado", current: null };
    const current = priceRows.find((row) => row.productId === productId && row.active && row.status === "ACTIVE" && row.validFrom.getTime() <= now && (!row.validUntil || row.validUntil.getTime() > now)) ?? null;
    return { productId, sku: product.sku, productName: product.productName, current };
  });
}

function makePreviewRow(row: BulkRow, input: ReturnType<typeof normalizeInput>): BulkPreviewRow {
  const currentAmount = row.current ? String(row.current.amount) : null;
  const currentCurrency = row.current?.currency ?? null;
  if (input.operation === "ARCHIVE") {
    return row.current
      ? { productId: row.productId, sku: row.sku, productName: row.productName, currentPriceId: row.current.id, currentAmount, currentCurrency, newAmount: null, newCurrency: currentCurrency, result: "archive", message: "Se archivará el registro vigente." }
      : { productId: row.productId, sku: row.sku, productName: row.productName, currentPriceId: null, currentAmount, currentCurrency, newAmount: null, newCurrency: null, result: "blocked", message: "No existe un precio vigente para archivar." };
  }
  if ((input.operation === "INCREASE_PERCENT" || input.operation === "DECREASE_PERCENT") && !row.current) return { productId: row.productId, sku: row.sku, productName: row.productName, currentPriceId: null, currentAmount, currentCurrency, newAmount: null, newCurrency: null, result: "blocked", message: "No hay precio vigente base para calcular el porcentaje." };
  try {
    const newAmount = input.operation === "SET" ? amountFromCents(parseCents(input.amount, "amount")) : percentageAmount(currentAmount ?? "0", input.operation, input.percentage);
    const newCurrency = input.operation === "SET" ? input.currency ?? null : currentCurrency;
    normalizePriceDetails({ amount: newAmount, currency: newCurrency, priceType: input.priceType, wholesaleMinQty: input.wholesaleMinQty ?? row.current?.wholesaleMinQty, minimumAllowed: input.minimumAllowed ?? row.current?.minimumAllowed, status: "ACTIVE" });
    return { productId: row.productId, sku: row.sku, productName: row.productName, currentPriceId: row.current?.id ?? null, currentAmount, currentCurrency, newAmount, newCurrency, result: row.current ? "change" : "new", message: row.current ? "Se actualizará en una transacción." : "Se creará el primer registro de este tipo." };
  } catch (error) {
    return { productId: row.productId, sku: row.sku, productName: row.productName, currentPriceId: row.current?.id ?? null, currentAmount, currentCurrency, newAmount: null, newCurrency: null, result: "blocked", message: error instanceof Error ? error.message : "Datos inválidos." };
  }
}

function summary(rows: BulkPreviewRow[]) {
  return { selected: rows.length, valid: rows.filter((row) => row.result !== "blocked").length, blocked: rows.filter((row) => row.result === "blocked").length, newPrices: rows.filter((row) => row.result === "new").length, changes: rows.filter((row) => row.result === "change").length, archives: rows.filter((row) => row.result === "archive").length };
}

export async function previewBulkPrice(input: BulkPriceInput, actor: PricingActor): Promise<BulkPreview> {
  const normalized = normalizeInput(input, actor);
  const rows = (await loadRows(normalized)).map((row) => makePreviewRow(row, normalized));
  return { ...summary(rows), rows };
}

export async function applyBulkPrice(input: BulkPriceInput, actor: PricingActor) {
  const normalized = normalizeInput(input, actor);
  const preview = await previewBulkPrice(normalized, actor);
  if (preview.blocked) throw new Error(`BULK_PREFLIGHT_FAILED:${preview.blocked}`);
  const db = getDb();
  return db.transaction(async (tx) => {
    let applied = 0;
    for (const row of preview.rows) {
      const idempotencyKey = text(normalized.idempotencyKey) ? `${text(normalized.idempotencyKey)}:${row.productId}` : null;
      if (idempotencyKey) {
        const [previous] = await tx.select().from(productPrices).where(eq(productPrices.idempotencyKey, idempotencyKey)).limit(1);
        if (previous) { applied += 1; continue; }
      }
      if (row.currentPriceId && row.result !== "new") {
        const [current] = await tx.select().from(productPrices).where(eq(productPrices.id, row.currentPriceId)).limit(1);
        if (!current || String(current.amount) !== row.currentAmount || current.currency !== row.currentCurrency) throw new Error("BULK_STALE_PREFLIGHT");
        if (row.result === "archive") {
          const [archived] = await tx.update(productPrices).set({ active: false, status: "ARCHIVED", idempotencyKey, updatedAt: new Date() }).where(eq(productPrices.id, current.id)).returning();
          await tx.insert(priceHistory).values({ id: `price-history-${crypto.randomUUID()}`, productId: current.productId, priceId: current.id, priceType: current.priceType, previousAmount: current.amount, newAmount: current.amount, currency: current.currency, reason: normalized.reason, changedBy: actor.userId });
          void archived;
        } else {
          const [updated] = await tx.update(productPrices).set({ amount: row.newAmount ?? current.amount, currency: row.newCurrency ?? current.currency, wholesaleMinQty: normalized.wholesaleMinQty === undefined ? current.wholesaleMinQty : Number(normalized.wholesaleMinQty), minimumAllowed: normalized.minimumAllowed === undefined ? current.minimumAllowed : text(normalized.minimumAllowed) || null, idempotencyKey, updatedAt: new Date() }).where(eq(productPrices.id, current.id)).returning();
          await tx.insert(priceHistory).values({ id: `price-history-${crypto.randomUUID()}`, productId: current.productId, priceId: current.id, priceType: current.priceType, previousAmount: current.amount, newAmount: updated.amount, currency: updated.currency, reason: normalized.reason, changedBy: actor.userId });
        }
      } else if (row.result === "new") {
        const [created] = await tx.insert(productPrices).values({ id: `price-${crypto.randomUUID()}`, productId: row.productId, priceType: normalized.priceType, amount: row.newAmount ?? "0.00", currency: row.newCurrency ?? "PEN", wholesaleMinQty: normalized.wholesaleMinQty === undefined ? null : Number(normalized.wholesaleMinQty), minimumAllowed: normalized.minimumAllowed === undefined ? null : text(normalized.minimumAllowed) || null, status: "ACTIVE", validFrom: new Date(), validUntil: null, active: true, idempotencyKey, createdBy: actor.userId }).returning();
        await tx.insert(priceHistory).values({ id: `price-history-${crypto.randomUUID()}`, productId: row.productId, priceId: created.id, priceType: created.priceType, previousAmount: null, newAmount: created.amount, currency: created.currency, reason: normalized.reason, changedBy: actor.userId });
      }
      applied += 1;
    }
    await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "pricing.bulk_applied", entityType: "pricing_bulk", entityId: `bulk-${crypto.randomUUID()}`, before: null, after: { priceType: normalized.priceType, operation: normalized.operation, selected: preview.selected, applied }, metadata: { reason: normalized.reason } });
    return { ...summary(preview.rows), applied, idempotent: applied === preview.selected };
  });
}
