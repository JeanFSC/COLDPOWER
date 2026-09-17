import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, priceHistory, productPrices, products } from "@/db/schema";
import { normalizePriceDetails } from "@/lib/pricing-validation";
import { can, type AppRole } from "@/lib/roles";

type PriceWindow = { validFrom: Date; validUntil: Date | null };

export function isPriceWindowOverlapping(existing: PriceWindow, incoming: PriceWindow) {
  const existingEnd = existing.validUntil?.getTime() ?? Number.POSITIVE_INFINITY;
  const incomingEnd = incoming.validUntil?.getTime() ?? Number.POSITIVE_INFINITY;
  return existing.validFrom.getTime() < incomingEnd && incoming.validFrom.getTime() < existingEnd;
}

export function validateDiscountRuleStatus(value: unknown) {
  if (value !== "ACTIVE" && value !== "INACTIVE") throw new Error("DISCOUNT_INVALID_STATUS");
  return value;
}

export type PricingActor = { userId: string; role: AppRole };
export type PriceMutationInput = {
  productId: string;
  amount: unknown;
  currency: unknown;
  priceType: unknown;
  wholesaleMinQty?: unknown;
  minimumAllowed?: unknown;
  status?: unknown;
  validFrom?: unknown;
  validUntil?: unknown;
  reason?: unknown;
  idempotencyKey?: unknown;
};

function parseWindow(input: Omit<PriceMutationInput, "productId">) {
  const parseDate = (value: unknown) => {
    if (value === undefined || value === "" || value === null) return null;
    const raw = String(value);
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw) ? new Date(`${raw}:00-05:00`) : new Date(raw);
  };
  const validFrom = parseDate(input.validFrom) ?? new Date();
  const validUntil = parseDate(input.validUntil);
  if (Number.isNaN(validFrom.getTime()) || (validUntil && Number.isNaN(validUntil.getTime())) || (validUntil && validUntil <= validFrom)) throw new Error("PRICE_INVALID_WINDOW");
  return { validFrom, validUntil };
}

export async function schedulePriceReplacement(id: string, input: Omit<PriceMutationInput, "productId">, actor: PricingActor) {
  const normalized = normalizePriceDetails(input);
  const window = parseWindow(input);
  const reason = mutationReason(input);
  const requestKey = idempotencyKey(input);
  assertPricePermission(actor, normalized.priceType);
  if (window.validFrom <= new Date()) throw new Error("PRICE_REPLACEMENT_MUST_BE_FUTURE");
  const db = getDb();
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(productPrices).where(and(eq(productPrices.id, id), eq(productPrices.active, true))).limit(1);
    if (!current) throw new Error("PRICE_NOT_FOUND");
    if (requestKey) {
      const [previousRequest] = await tx.select().from(productPrices).where(eq(productPrices.idempotencyKey, requestKey)).limit(1);
      if (previousRequest) {
        if (samePriceRequest(previousRequest, { productId: current.productId, priceType: normalized.priceType, amount: normalized.amount, currency: normalized.currency, validFrom: window.validFrom, validUntil: window.validUntil, status: normalized.status })) return { price: previousRequest, closed: null, idempotent: true };
        throw new Error("PRICE_IDEMPOTENCY_CONFLICT");
      }
    }
    if (current.priceType === "COST" && !can(actor.role, "pricing.cost.edit")) throw new Error("PRICING_COST_FORBIDDEN");
    if (current.priceType !== normalized.priceType) throw new Error("PRICE_REPLACEMENT_TYPE_MISMATCH");
    await assertNoOverlap(tx, current.productId, normalized.priceType, window, id);
    const [closed] = await tx.update(productPrices).set({ validUntil: window.validFrom, updatedAt: new Date() }).where(eq(productPrices.id, id)).returning();
    const [created] = await tx.insert(productPrices).values({ id: `price-${crypto.randomUUID()}`, productId: current.productId, priceType: normalized.priceType, amount: normalized.amount, currency: normalized.currency, wholesaleMinQty: normalized.wholesaleMinQty, minimumAllowed: normalized.minimumAllowed, status: normalized.status, active: normalized.status === "ACTIVE", validFrom: window.validFrom, validUntil: window.validUntil, idempotencyKey: requestKey, createdBy: actor.userId }).returning();
    await tx.insert(priceHistory).values({ id: `price-history-${crypto.randomUUID()}`, productId: current.productId, priceId: id, priceType: current.priceType, previousAmount: current.amount, newAmount: current.amount, currency: current.currency, reason: `${reason} · cierre por reemplazo`, changedBy: actor.userId });
    await tx.insert(priceHistory).values({ id: `price-history-${crypto.randomUUID()}`, productId: current.productId, priceId: created.id, priceType: normalized.priceType, previousAmount: current.amount, newAmount: normalized.amount, currency: normalized.currency, reason, changedBy: actor.userId });
    await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "pricing.price_replacement_scheduled", entityType: "product_price", entityId: created.id, before: { current, closed }, after: created, metadata: { reason, replacementOf: id } });
    return { price: created, closed, idempotent: false };
  });
}

function mutationReason(input: Omit<PriceMutationInput, "productId">) {
  const reason = typeof input.reason === "string" ? input.reason.trim().slice(0, 240) : "";
  if (!reason) throw new Error("PRICE_REASON_REQUIRED");
  return reason;
}

function idempotencyKey(input: { idempotencyKey?: unknown }) {
  const value = typeof input.idempotencyKey === "string" ? input.idempotencyKey.trim().slice(0, 200) : "";
  return value || null;
}

function assertPricePermission(actor: PricingActor, priceType: string) {
  if (!can(actor.role, "pricing.edit")) throw new Error("PRICING_FORBIDDEN");
  if (priceType === "COST" && !can(actor.role, "pricing.cost.edit")) throw new Error("PRICING_COST_FORBIDDEN");
}

async function assertNoOverlap(tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0], productId: string, priceType: "COST" | "RETAIL" | "WHOLESALE" | "MINIMUM" | "SPECIAL", window: PriceWindow, excludeId?: string) {
  // Serialize concurrent price mutations for the same (productId, priceType)
  // via a transaction-scoped advisory lock before reading existing windows.
  // A plain SELECT here (even with FOR UPDATE) can't prevent two concurrent
  // transactions from both seeing "no overlap" when there are zero existing
  // rows to lock — the advisory lock closes that gap without a schema change.
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${productId}), hashtext(${priceType}))`);
  const rows = await tx.select({ id: productPrices.id, validFrom: productPrices.validFrom, validUntil: productPrices.validUntil }).from(productPrices).where(and(eq(productPrices.productId, productId), eq(productPrices.priceType, priceType), eq(productPrices.active, true))).orderBy(desc(productPrices.validFrom));
  if (rows.some((row) => row.id !== excludeId && isPriceWindowOverlapping({ validFrom: row.validFrom, validUntil: row.validUntil }, window))) throw new Error("PRICE_WINDOW_OVERLAP");
}

function samePriceRequest(row: { productId: string; priceType: string; amount: string; currency: string; validFrom: Date; validUntil: Date | null; status: string }, values: { productId: string; priceType: string; amount: string; currency: string; validFrom: Date; validUntil: Date | null; status: string }) {
  return row.productId === values.productId && row.priceType === values.priceType && String(row.amount) === String(values.amount) && row.currency === values.currency && row.validFrom.getTime() === values.validFrom.getTime() && (row.validUntil?.getTime() ?? null) === (values.validUntil?.getTime() ?? null) && row.status === values.status;
}

export async function createPrice(input: PriceMutationInput, actor: PricingActor) {
  const normalized = normalizePriceDetails(input);
  const window = parseWindow(input);
  const reason = mutationReason(input);
  const requestKey = idempotencyKey(input);
  assertPricePermission(actor, normalized.priceType);
  const db = getDb();
  return db.transaction(async (tx) => {
    const [product] = await tx.select({ id: products.id }).from(products).where(eq(products.id, input.productId)).limit(1);
    if (!product) throw new Error("PRODUCT_NOT_FOUND");
    if (requestKey) {
      const [previousRequest] = await tx.select().from(productPrices).where(eq(productPrices.idempotencyKey, requestKey)).limit(1);
      if (previousRequest) {
        if (samePriceRequest(previousRequest, { productId: input.productId, priceType: normalized.priceType, amount: normalized.amount, currency: normalized.currency, validFrom: window.validFrom, validUntil: window.validUntil, status: normalized.status })) return { price: previousRequest, idempotent: true };
        throw new Error("PRICE_IDEMPOTENCY_CONFLICT");
      }
    }
    const [duplicate] = await tx.select().from(productPrices).where(and(eq(productPrices.productId, input.productId), eq(productPrices.priceType, normalized.priceType), eq(productPrices.amount, normalized.amount), eq(productPrices.currency, normalized.currency), eq(productPrices.status, normalized.status))).orderBy(desc(productPrices.createdAt)).limit(1);
    if (duplicate && samePriceRequest(duplicate, { productId: input.productId, priceType: normalized.priceType, amount: normalized.amount, currency: normalized.currency, validFrom: window.validFrom, validUntil: window.validUntil, status: normalized.status })) return { price: duplicate, idempotent: true };
    await assertNoOverlap(tx, input.productId, normalized.priceType, window);
    const [created] = await tx.insert(productPrices).values({ id: `price-${crypto.randomUUID()}`, productId: input.productId, priceType: normalized.priceType, amount: normalized.amount, currency: normalized.currency, wholesaleMinQty: normalized.wholesaleMinQty, minimumAllowed: normalized.minimumAllowed, status: normalized.status, active: normalized.status === "ACTIVE", validFrom: window.validFrom, validUntil: window.validUntil, idempotencyKey: requestKey, createdBy: actor.userId }).returning();
    await tx.insert(priceHistory).values({ id: `price-history-${crypto.randomUUID()}`, productId: input.productId, priceId: created.id, priceType: normalized.priceType, previousAmount: null, newAmount: normalized.amount, currency: normalized.currency, reason, changedBy: actor.userId });
    await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "pricing.price_created", entityType: "product_price", entityId: created.id, before: null, after: created, metadata: { productId: input.productId, priceType: normalized.priceType, reason } });
    return { price: created, idempotent: false };
  });
}

export async function updatePrice(id: string, input: Omit<PriceMutationInput, "productId">, actor: PricingActor) {
  const normalized = normalizePriceDetails(input);
  const window = parseWindow(input);
  const reason = mutationReason(input);
  const requestKey = idempotencyKey(input);
  const db = getDb();
  assertPricePermission(actor, normalized.priceType);
  return db.transaction(async (tx) => {
    if (requestKey) {
      const [previousRequest] = await tx.select().from(productPrices).where(eq(productPrices.idempotencyKey, requestKey)).limit(1);
      if (previousRequest) {
        if (previousRequest.id === id) return { price: previousRequest, idempotent: true };
        throw new Error("PRICE_IDEMPOTENCY_CONFLICT");
      }
    }
    const [before] = await tx.select().from(productPrices).where(eq(productPrices.id, id)).limit(1);
    if (!before) throw new Error("PRICE_NOT_FOUND");
    if (before.priceType === "COST" && !can(actor.role, "pricing.cost.edit")) throw new Error("PRICING_COST_FORBIDDEN");
    await assertNoOverlap(tx, before.productId, normalized.priceType, window, id);
    const [after] = await tx.update(productPrices).set({ priceType: normalized.priceType, amount: normalized.amount, currency: normalized.currency, wholesaleMinQty: normalized.wholesaleMinQty, minimumAllowed: normalized.minimumAllowed, status: normalized.status, active: normalized.status === "ACTIVE", validFrom: window.validFrom, validUntil: window.validUntil, idempotencyKey: requestKey ?? before.idempotencyKey, updatedAt: new Date() }).where(eq(productPrices.id, id)).returning();
    await tx.insert(priceHistory).values({ id: `price-history-${crypto.randomUUID()}`, productId: before.productId, priceId: id, priceType: normalized.priceType, previousAmount: before.amount, newAmount: normalized.amount, currency: normalized.currency, reason, changedBy: actor.userId });
    await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "pricing.price_updated", entityType: "product_price", entityId: id, before, after, metadata: { reason } });
    return { price: after, idempotent: false };
  });
}

export async function archivePrice(id: string, reason: unknown, actor: PricingActor, idempotencyKeyInput?: unknown) {
  const normalizedReason = typeof reason === "string" ? reason.trim().slice(0, 240) : "";
  if (!normalizedReason) throw new Error("PRICE_REASON_REQUIRED");
  if (!can(actor.role, "pricing.edit")) throw new Error("PRICING_FORBIDDEN");
  const requestKey = idempotencyKey({ idempotencyKey: idempotencyKeyInput });
  const db = getDb();
  return db.transaction(async (tx) => {
    if (requestKey) {
      const [previousRequest] = await tx.select().from(productPrices).where(eq(productPrices.idempotencyKey, requestKey)).limit(1);
      if (previousRequest) {
        if (previousRequest.id === id && !previousRequest.active) return { price: previousRequest, idempotent: true };
        throw new Error("PRICE_IDEMPOTENCY_CONFLICT");
      }
    }
    const [before] = await tx.select().from(productPrices).where(and(eq(productPrices.id, id), eq(productPrices.active, true))).limit(1);
    if (!before) throw new Error("PRICE_NOT_FOUND");
    if (before.priceType === "COST" && !can(actor.role, "pricing.cost.edit")) throw new Error("PRICING_COST_FORBIDDEN");
    const [after] = await tx.update(productPrices).set({ active: false, status: "ARCHIVED", idempotencyKey: requestKey ?? before.idempotencyKey, updatedAt: new Date() }).where(eq(productPrices.id, id)).returning();
    await tx.insert(priceHistory).values({ id: `price-history-${crypto.randomUUID()}`, productId: before.productId, priceId: id, priceType: before.priceType, previousAmount: before.amount, newAmount: before.amount, currency: before.currency, reason: normalizedReason, changedBy: actor.userId });
    await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "pricing.price_archived", entityType: "product_price", entityId: id, before, after, metadata: { reason: normalizedReason } });
    return { price: after, idempotent: false };
  });
}
