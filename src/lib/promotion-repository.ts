import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
  sum,
  type SQL,
} from "drizzle-orm";
import { getDb } from "@/db";
import {
  auditLogs,
  categories,
  discountRules,
  mediaAssets,
  products,
  users,
} from "@/db/schema";
import {
  promotionApplications,
  promotionCategories,
  promotionProducts,
  promotions,
} from "@/db/operations-schema";
import {
  effectivePromotionStatus,
  promotionStatuses,
  promotionTypes,
  type PromotionInput,
  type PromotionStatus,
  type PromotionType,
} from "@/lib/operations-validation";
import { applyPromotionToUnitPrice } from "@/lib/promotion-service";
import { loadRetailPrices } from "@/lib/retail-price";
import { addPromotionCalendarDays, createPromotionCalendarScale, promotionCalendarDateKey } from "@/lib/promotion-calendar";

const DAY_MS = 86_400_000;

export type PromotionFilterStatus = PromotionStatus | "SCHEDULED";
export type PromotionFilters = {
  query?: string;
  status?: PromotionFilterStatus;
  approval?: "PENDING";
  conflict?: boolean;
  type?: PromotionType;
  scope?: "PRODUCTS" | "CATEGORIES";
  productId?: string;
  categoryId?: string;
  startsFrom?: string;
  endsTo?: string;
  page?: number;
  pageSize?: number;
};

export class PromotionInvalidFilterError extends Error {
  constructor() {
    super("PROMOTION_INVALID_FILTER");
    this.name = "PromotionInvalidFilterError";
  }
}

export type PromotionConflict = {
  otherPromotionId: string;
  otherPromotionName: string;
  affectedProductCount: number;
  affectedProducts: Array<{ id: string; sku: string; name: string }>;
  winnerPromotionId: string;
  winnerPromotionName: string;
  winnerPriority: number;
  otherStartsAt: Date;
  otherEndsAt: Date;
};

export type PromotionImpact = {
  productId: string;
  sku: string;
  name: string;
  baseUnitPrice: string;
  finalUnitPrice: string;
  discountAmount: string;
  discountPercentage: number;
  currency: string;
};

export type PromotionPageItem = typeof promotions.$inferSelect & {
  effectiveStatus: PromotionFilterStatus;
  productCount: number;
  categoryCount: number;
  usage30Applications: number;
  usage30Discount: string;
  creatorName: string | null;
  banner: { id: string; publicUrl: string | null; altText: string | null } | null;
  conflicts: PromotionConflict[];
};

export type PromotionMetrics = {
  activeNow: number;
  expiringSoon: number;
  scheduled: number;
  pendingApproval: number;
  draft: number;
  expired: number;
  inactive: number;
  total: number;
  oldestPendingAt: Date | null;
  applications30: number;
  checkoutApplications30: number;
  quoteApplications30: number;
  discount30: string;
  discountPrevious30: string;
  dailyDiscount30: number[];
  conflictPromotions: number;
  conflictProducts: number;
};

export type PromotionCalendarItem = {
  id: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
  status: PromotionStatus;
  effectiveStatus: PromotionFilterStatus;
  approvalStatus: string;
  productCount: number;
  categoryCount: number;
  hasConflict: boolean;
  conflictSegments: Array<{ startsAt: Date; endsAt: Date }>;
};

export type PromotionPage = {
  generatedAt: Date;
  items: PromotionPageItem[];
  calendar: PromotionCalendarItem[];
  metrics: PromotionMetrics;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  facets: {
    total: number;
    active: number;
    scheduled: number;
    pending: number;
    draft: number;
    expired: number;
    conflict: number;
  };
  approvalThreshold: number | null;
};

export type PromotionDetail = {
  promotion: typeof promotions.$inferSelect & { effectiveStatus: PromotionFilterStatus };
  products: Array<{ productId: string; sku: string; name: string }>;
  categories: Array<{ categoryId: string; name: string }>;
  banner: { id: string; publicUrl: string | null; altText: string | null } | null;
  usage: number;
  usage30Applications: number;
  usage30Discount: string;
  channelUsage: Array<{ contextType: string; applications: number; discount: string }>;
  impact: PromotionImpact[];
  conflicts: PromotionConflict[];
  history: Array<{
    id: string;
    action: string;
    actorName: string;
    actorRole: string | null;
    createdAt: Date;
  }>;
  creatorName: string;
  approvedByName: string | null;
};

export type PromotionDraftPreview = {
  product: PromotionImpact | null;
  impact: {
    affectedProducts: number;
    pricedProducts: number;
    averageDiscountPercentage: number;
    averageDiscountAmount: string;
    totalDiscountAmount: string;
  };
  conflicts: Array<{
    promotionId: string;
    promotionName: string;
    affectedProductCount: number;
    href: string;
  }>;
  approvalThreshold: number | null;
};

export function parsePromotionFilters(params: URLSearchParams): PromotionFilters {
  const status = params.get("status")?.trim() || undefined;
  const type = params.get("type")?.trim() || undefined;
  const scope = params.get("scope")?.trim() || undefined;
  const approval = params.get("approval")?.trim() || undefined;
  const positive = (key: string) => {
    const raw = params.get(key);
    if (!raw) return undefined;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 1) throw new PromotionInvalidFilterError();
    return value;
  };
  const allowedStatuses = [...promotionStatuses, "SCHEDULED"];
  if (status && !allowedStatuses.includes(status as PromotionFilterStatus)) throw new PromotionInvalidFilterError();
  if (type && !(promotionTypes as readonly string[]).includes(type)) throw new PromotionInvalidFilterError();
  if (scope && scope !== "PRODUCTS" && scope !== "CATEGORIES") throw new PromotionInvalidFilterError();
  if (approval && approval !== "PENDING") throw new PromotionInvalidFilterError();
  const conflict = params.get("conflict");
  if (conflict && conflict !== "1" && conflict !== "true") throw new PromotionInvalidFilterError();
  return {
    query: params.get("query")?.trim() || undefined,
    status: status as PromotionFilterStatus | undefined,
    approval: approval as "PENDING" | undefined,
    conflict: conflict === "1" || conflict === "true" ? true : undefined,
    type: type as PromotionType | undefined,
    scope: scope as "PRODUCTS" | "CATEGORIES" | undefined,
    productId: params.get("productId")?.trim() || undefined,
    categoryId: params.get("categoryId")?.trim() || undefined,
    startsFrom: params.get("startsFrom")?.trim() || undefined,
    endsTo: params.get("endsTo")?.trim() || undefined,
    page: positive("page"),
    pageSize: positive("pageSize"),
  };
}

function productName(row: { commercialName: string | null; normalizedName: string; sku: string }) {
  return row.commercialName?.trim() || row.normalizedName?.trim() || row.sku;
}

function money(value: number) {
  return Math.max(0, Math.round(value * 100) / 100).toFixed(2);
}

function comparePromotionPriority(
  left: { priority: number; startsAt: Date },
  right: { priority: number; startsAt: Date },
) {
  return right.priority - left.priority || left.startsAt.getTime() - right.startsAt.getTime();
}

function displayPromotionStatus(promotion: { status: PromotionStatus; startsAt: Date; endsAt: Date }, now: Date): PromotionFilterStatus {
  if (promotion.status === "ACTIVE" && now < promotion.startsAt) return "SCHEDULED";
  return effectivePromotionStatus(promotion, now);
}

function promotionCoversProduct(
  promotionId: string,
  productId: string,
  categoryId: string,
  directByPromotion: Map<string, Set<string>>,
  categoriesByPromotion: Map<string, Set<string>>,
) {
  const direct = directByPromotion.get(promotionId);
  const category = categoriesByPromotion.get(promotionId);
  return (!direct?.size && !category?.size) || Boolean(direct?.has(productId) || category?.has(categoryId));
}

async function getPromotionConflictMap(now = new Date()) {
  const db = getDb();
  const activeRows = await db
    .select()
    .from(promotions)
    .where(and(eq(promotions.status, "ACTIVE"), lte(promotions.startsAt, now), gt(promotions.endsAt, now)))
    .orderBy(desc(promotions.priority), asc(promotions.startsAt));
  if (activeRows.length < 2) return new Map<string, PromotionConflict[]>();
  const activeIds = activeRows.map((row) => row.id);
  const [directRows, categoryRows, productRows] = await Promise.all([
    db.select({ promotionId: promotionProducts.promotionId, productId: promotionProducts.productId }).from(promotionProducts).where(inArray(promotionProducts.promotionId, activeIds)),
    db.select({ promotionId: promotionCategories.promotionId, categoryId: promotionCategories.categoryId }).from(promotionCategories).where(inArray(promotionCategories.promotionId, activeIds)),
    db.select({ id: products.id, sku: products.sku, commercialName: products.commercialName, normalizedName: products.normalizedName, categoryId: products.categoryId }).from(products),
  ]);
  const directByPromotion = new Map<string, Set<string>>();
  const categoriesByPromotion = new Map<string, Set<string>>();
  for (const row of directRows) {
    const values = directByPromotion.get(row.promotionId) ?? new Set<string>();
    values.add(row.productId);
    directByPromotion.set(row.promotionId, values);
  }
  for (const row of categoryRows) {
    const values = categoriesByPromotion.get(row.promotionId) ?? new Set<string>();
    values.add(row.categoryId);
    categoriesByPromotion.set(row.promotionId, values);
  }
  const summaryByPromotion = new Map<string, Map<string, PromotionConflict>>();
  for (const product of productRows) {
    const eligible = activeRows.filter((promotion) => promotionCoversProduct(promotion.id, product.id, product.categoryId, directByPromotion, categoriesByPromotion));
    const exclusive = eligible.filter((promotion) => promotion.policy === "EXCLUSIVE").sort(comparePromotionPriority);
    if (eligible.length < 2 || !exclusive.length) continue;
    const winner = exclusive[0];
    for (const current of eligible) {
      for (const other of eligible) {
        if (current.id === other.id) continue;
        const byOther = summaryByPromotion.get(current.id) ?? new Map<string, PromotionConflict>();
        const existing = byOther.get(other.id);
        if (existing) {
          if (!existing.affectedProducts.some((item) => item.id === product.id)) {
            existing.affectedProducts.push({ id: product.id, sku: product.sku, name: productName(product) });
            existing.affectedProductCount = existing.affectedProducts.length;
          }
        } else {
          byOther.set(other.id, {
            otherPromotionId: other.id,
            otherPromotionName: other.name,
            affectedProductCount: 1,
            affectedProducts: [{ id: product.id, sku: product.sku, name: productName(product) }],
            winnerPromotionId: winner.id,
            winnerPromotionName: winner.name,
            winnerPriority: winner.priority,
            otherStartsAt: other.startsAt,
            otherEndsAt: other.endsAt,
          });
        }
        summaryByPromotion.set(current.id, byOther);
      }
    }
  }
  const result = new Map<string, PromotionConflict[]>();
  for (const [id, values] of summaryByPromotion) {
    result.set(id, [...values.values()].map((item) => ({
      ...item,
      affectedProducts: item.affectedProducts.slice(0, 12),
    })));
  }
  return result;
}

function conflictProductCount(conflicts: Map<string, PromotionConflict[]>) {
  const ids = new Set<string>();
  for (const entries of conflicts.values()) for (const entry of entries) for (const product of entry.affectedProducts) ids.add(product.id);
  return ids.size;
}

async function getApprovalThreshold(now: Date) {
  const db = getDb();
  const [rule] = await db
    .select({ threshold: discountRules.approvalAbovePercentage })
    .from(discountRules)
    .where(and(eq(discountRules.status, "ACTIVE"), or(sql`${discountRules.validFrom} is null`, lte(discountRules.validFrom, now)), or(sql`${discountRules.validUntil} is null`, gt(discountRules.validUntil, now))))
    .orderBy(desc(discountRules.approvalAbovePercentage))
    .limit(1);
  return rule ? Number(rule.threshold) : null;
}

async function getPromotionMetrics(now: Date, conflicts: Map<string, PromotionConflict[]>): Promise<PromotionMetrics> {
  const db = getDb();
  const soon = new Date(now.getTime() + 7 * DAY_MS);
  const todayKey = promotionCalendarDateKey(now);
  const todayStart = new Date(`${todayKey}T00:00:00-05:00`);
  const currentCutoff = new Date(todayStart.getTime() - 29 * DAY_MS);
  const previousCutoff = new Date(todayStart.getTime() - 59 * DAY_MS);
  const [total, activeNow, expiringSoon, scheduled, pendingApproval, draft, expired, inactive, oldestPending, applicationRows] = await Promise.all([
    db.select({ value: count() }).from(promotions),
    db.select({ value: count() }).from(promotions).where(and(eq(promotions.status, "ACTIVE"), lte(promotions.startsAt, now), gt(promotions.endsAt, now))),
    db.select({ value: count() }).from(promotions).where(and(eq(promotions.status, "ACTIVE"), gt(promotions.endsAt, now), lte(promotions.endsAt, soon))),
    db.select({ value: count() }).from(promotions).where(and(eq(promotions.status, "ACTIVE"), gt(promotions.startsAt, now), gt(promotions.endsAt, now))),
    db.select({ value: count() }).from(promotions).where(eq(promotions.approvalStatus, "PENDING")),
    db.select({ value: count() }).from(promotions).where(eq(promotions.status, "DRAFT")),
    db.select({ value: count() }).from(promotions).where(or(eq(promotions.status, "EXPIRED"), and(eq(promotions.status, "ACTIVE"), lte(promotions.endsAt, now)))),
    db.select({ value: count() }).from(promotions).where(eq(promotions.status, "INACTIVE")),
    db.select({ createdAt: promotions.createdAt }).from(promotions).where(eq(promotions.approvalStatus, "PENDING")).orderBy(asc(promotions.createdAt)).limit(1),
    db.select({ createdAt: promotionApplications.createdAt, discountAmount: promotionApplications.discountAmount, contextType: promotionApplications.contextType }).from(promotionApplications).where(gte(promotionApplications.createdAt, previousCutoff)),
  ]);
  let applications30 = 0;
  let checkoutApplications30 = 0;
  let quoteApplications30 = 0;
  let discount30 = 0;
  let discountPrevious30 = 0;
  const daily = new Map<string, number>();
  for (const row of applicationRows) {
    const amount = Number(row.discountAmount);
    if (row.createdAt >= currentCutoff) {
      applications30 += 1;
      discount30 += amount;
      if (row.contextType === "quote") quoteApplications30 += 1;
      else if (row.contextType === "checkout") checkoutApplications30 += 1;
      const key = promotionCalendarDateKey(row.createdAt);
      daily.set(key, (daily.get(key) ?? 0) + amount);
    } else {
      discountPrevious30 += amount;
    }
  }
  const dailyDiscount30 = Array.from({ length: 30 }, (_, index) => {
    const key = addPromotionCalendarDays(promotionCalendarDateKey(currentCutoff), index);
    return Number((daily.get(key) ?? 0).toFixed(2));
  });
  return {
    total: Number(total[0]?.value ?? 0),
    activeNow: Number(activeNow[0]?.value ?? 0),
    expiringSoon: Number(expiringSoon[0]?.value ?? 0),
    scheduled: Number(scheduled[0]?.value ?? 0),
    pendingApproval: Number(pendingApproval[0]?.value ?? 0),
    draft: Number(draft[0]?.value ?? 0),
    expired: Number(expired[0]?.value ?? 0),
    inactive: Number(inactive[0]?.value ?? 0),
    oldestPendingAt: oldestPending[0]?.createdAt ?? null,
    applications30,
    checkoutApplications30,
    quoteApplications30,
    discount30: money(discount30),
    discountPrevious30: money(discountPrevious30),
    dailyDiscount30,
    conflictPromotions: conflicts.size,
    conflictProducts: conflictProductCount(conflicts),
  };
}

function promotionWhere(filters: PromotionFilters, conflictIds: string[], now = new Date()) {
  const conditions: SQL[] = [];
  if (filters.query) {
    const pattern = `%${filters.query}%`;
    conditions.push(or(ilike(promotions.name, pattern), ilike(promotions.description, pattern))!);
  }
  if (filters.status === "ACTIVE") conditions.push(and(eq(promotions.status, "ACTIVE"), lte(promotions.startsAt, now), gt(promotions.endsAt, now))!);
  else if (filters.status === "SCHEDULED") conditions.push(and(eq(promotions.status, "ACTIVE"), gt(promotions.startsAt, now), gt(promotions.endsAt, now))!);
  else if (filters.status === "EXPIRED") conditions.push(or(eq(promotions.status, "EXPIRED"), and(eq(promotions.status, "ACTIVE"), lte(promotions.endsAt, now)))!);
  else if (filters.status === "DRAFT") conditions.push(eq(promotions.status, "DRAFT"));
  else if (filters.status === "INACTIVE") conditions.push(eq(promotions.status, "INACTIVE"));
  if (filters.approval === "PENDING") conditions.push(eq(promotions.approvalStatus, "PENDING"));
  if (filters.conflict) conditions.push(conflictIds.length ? inArray(promotions.id, conflictIds) : sql`false`);
  if (filters.type) conditions.push(eq(promotions.type, filters.type));
  if (filters.scope === "PRODUCTS") conditions.push(sql`exists (select 1 from promotion_products pp where pp.promotion_id = ${promotions.id})`);
  if (filters.scope === "CATEGORIES") conditions.push(sql`exists (select 1 from promotion_categories pc where pc.promotion_id = ${promotions.id})`);
  if (filters.productId) conditions.push(sql`exists (select 1 from promotion_products pp where pp.promotion_id = ${promotions.id} and pp.product_id = ${filters.productId})`);
  if (filters.categoryId) conditions.push(sql`exists (select 1 from promotion_categories pc where pc.promotion_id = ${promotions.id} and pc.category_id = ${filters.categoryId})`);
  if (filters.startsFrom) conditions.push(gte(promotions.startsAt, new Date(filters.startsFrom)));
  if (filters.endsTo) conditions.push(lte(promotions.endsAt, new Date(filters.endsTo)));
  return conditions.length ? and(...conditions) : undefined;
}

async function getCalendar(now: Date, conflicts: Map<string, PromotionConflict[]>) {
  const db = getDb();
  const scale = createPromotionCalendarScale(now);
  const from = new Date(`${scale.from}T00:00:00-05:00`);
  const to = new Date(`${scale.to}T23:59:59.999-05:00`);
  const rows = await db
    .select({ promotion: promotions, productCount: countDistinct(promotionProducts.productId), categoryCount: countDistinct(promotionCategories.categoryId) })
    .from(promotions)
    .leftJoin(promotionProducts, eq(promotionProducts.promotionId, promotions.id))
    .leftJoin(promotionCategories, eq(promotionCategories.promotionId, promotions.id))
    .where(and(lte(promotions.startsAt, to), gt(promotions.endsAt, from)))
    .groupBy(promotions.id)
    .orderBy(asc(promotions.startsAt), asc(promotions.name))
    .limit(100);
  return rows.map((row) => ({
    id: row.promotion.id,
    name: row.promotion.name,
    startsAt: row.promotion.startsAt,
    endsAt: row.promotion.endsAt,
    status: row.promotion.status,
    effectiveStatus: displayPromotionStatus(row.promotion, now),
    approvalStatus: row.promotion.approvalStatus,
    productCount: Number(row.productCount ?? 0),
    categoryCount: Number(row.categoryCount ?? 0),
    hasConflict: conflicts.has(row.promotion.id),
    conflictSegments: (conflicts.get(row.promotion.id) ?? []).map((conflict) => ({ startsAt: conflict.otherStartsAt, endsAt: conflict.otherEndsAt })),
  }));
}

export async function getPromotionPage(filters: PromotionFilters = {}): Promise<PromotionPage> {
  const now = new Date();
  const db = getDb();
  const conflicts = await getPromotionConflictMap(now);
  const conflictIds = [...conflicts.keys()];
  const where = promotionWhere(filters, conflictIds, now);
  const pageSize = Math.min(100, Math.max(1, Math.floor(filters.pageSize ?? 25)));
  const requestedPage = Math.max(1, Math.floor(filters.page ?? 1));
  const cutoff = new Date(now.getTime() - 30 * DAY_MS);
  const [rows, totals, usageRows, creators, banners, metrics, calendar, approvalThreshold, facetCounts] = await Promise.all([
    db.select({ promotion: promotions, productCount: countDistinct(promotionProducts.productId), categoryCount: countDistinct(promotionCategories.categoryId) }).from(promotions).leftJoin(promotionProducts, eq(promotionProducts.promotionId, promotions.id)).leftJoin(promotionCategories, eq(promotionCategories.promotionId, promotions.id)).where(where).groupBy(promotions.id).orderBy(desc(promotions.startsAt), asc(promotions.name)).limit(pageSize).offset((requestedPage - 1) * pageSize),
    db.select({ value: count() }).from(promotions).where(where),
    db.select({ promotionId: promotionApplications.promotionId, applications: count(), discount: sum(promotionApplications.discountAmount) }).from(promotionApplications).where(gte(promotionApplications.createdAt, cutoff)).groupBy(promotionApplications.promotionId),
    db.select({ id: users.id, name: users.name, email: users.email }).from(users),
    db.select({ id: mediaAssets.id, publicUrl: mediaAssets.publicUrl, altText: mediaAssets.altText }).from(mediaAssets),
    getPromotionMetrics(now, conflicts),
    getCalendar(now, conflicts),
    getApprovalThreshold(now),
    Promise.all([
      db.select({ value: count() }).from(promotions).where(and(eq(promotions.status, "ACTIVE"), lte(promotions.startsAt, now), gt(promotions.endsAt, now))),
      db.select({ value: count() }).from(promotions).where(and(eq(promotions.status, "ACTIVE"), gt(promotions.startsAt, now), gt(promotions.endsAt, now))),
      db.select({ value: count() }).from(promotions).where(eq(promotions.approvalStatus, "PENDING")),
      db.select({ value: count() }).from(promotions).where(eq(promotions.status, "DRAFT")),
      db.select({ value: count() }).from(promotions).where(or(eq(promotions.status, "EXPIRED"), and(eq(promotions.status, "ACTIVE"), lte(promotions.endsAt, now)))),
    ]),
  ]);
  const usageByPromotion = new Map(usageRows.map((row) => [row.promotionId, { applications: Number(row.applications ?? 0), discount: money(Number(row.discount ?? 0)) }]));
  const creatorById = new Map(creators.map((row) => [row.id, row.name?.trim() || row.email]));
  const bannerById = new Map(banners.map((row) => [row.id, row]));
  const items = rows.map((row) => {
    const usage = usageByPromotion.get(row.promotion.id) ?? { applications: 0, discount: "0.00" };
    return {
      ...row.promotion,
       effectiveStatus: displayPromotionStatus(row.promotion, now),
      productCount: Number(row.productCount ?? 0),
      categoryCount: Number(row.categoryCount ?? 0),
      usage30Applications: usage.applications,
      usage30Discount: usage.discount,
      creatorName: row.promotion.createdBy ? creatorById.get(row.promotion.createdBy) ?? null : null,
      banner: row.promotion.bannerAssetId ? bannerById.get(row.promotion.bannerAssetId) ?? null : null,
      conflicts: conflicts.get(row.promotion.id) ?? [],
    };
  });
  const totalItems = Number(totals[0]?.value ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  return {
    generatedAt: now,
    items,
    calendar,
    metrics,
    page: Math.min(requestedPage, totalPages),
    pageSize,
    totalItems,
    totalPages,
    facets: {
      total: metrics.total,
      active: Number(facetCounts[0][0]?.value ?? 0),
      scheduled: Number(facetCounts[1][0]?.value ?? 0),
      pending: Number(facetCounts[2][0]?.value ?? 0),
      draft: Number(facetCounts[3][0]?.value ?? 0),
      expired: Number(facetCounts[4][0]?.value ?? 0),
      conflict: conflicts.size,
    },
    approvalThreshold,
  };
}

async function getScopedProductRows(productIds: string[], categoryIds: string[], limit?: number) {
  const db = getDb();
  const conditions: SQL[] = [];
  if (productIds.length) conditions.push(inArray(products.id, productIds));
  if (categoryIds.length) conditions.push(inArray(products.categoryId, categoryIds));
  const query = db
    .select({ id: products.id, sku: products.sku, commercialName: products.commercialName, normalizedName: products.normalizedName, categoryId: products.categoryId })
    .from(products)
    .where(conditions.length ? or(...conditions) : undefined)
    .orderBy(asc(products.sku));
  return limit ? query.limit(limit) : query;
}

async function getProductImpact(promotion: typeof promotions.$inferSelect, productIds: string[], categoryIds: string[], limit = 5) {
  const rows = await getScopedProductRows(productIds, categoryIds, Math.max(limit * 12, 40));
  const prices = await loadRetailPrices(getDb(), rows.map((row) => row.id));
  const impact: PromotionImpact[] = [];
  for (const row of rows) {
    const price = prices.get(row.id);
    if (!price) continue;
    const calculated = applyPromotionToUnitPrice(promotion, price.amount);
    const base = Number(calculated.baseUnitPrice);
    impact.push({ productId: row.id, sku: row.sku, name: productName(row), baseUnitPrice: calculated.baseUnitPrice, finalUnitPrice: calculated.finalUnitPrice, discountAmount: calculated.discountAmount, discountPercentage: base > 0 ? Number(((Number(calculated.discountAmount) / base) * 100).toFixed(1)) : 0, currency: price.currency });
    if (impact.length >= limit) break;
  }
  return impact;
}

export async function getPromotionDetail(id: string): Promise<PromotionDetail | null> {
  const db = getDb();
  const [promotion] = await db.select().from(promotions).where(eq(promotions.id, id)).limit(1);
  if (!promotion) return null;
  const now = new Date();
  const cutoff = new Date(now.getTime() - 30 * DAY_MS);
  const [productRows, categoryRows] = await Promise.all([
    db.select({ productId: promotionProducts.productId }).from(promotionProducts).where(eq(promotionProducts.promotionId, id)),
    db.select({ categoryId: promotionCategories.categoryId }).from(promotionCategories).where(eq(promotionCategories.promotionId, id)),
  ]);
  const productIds = productRows.map((row) => row.productId);
  const categoryIds = categoryRows.map((row) => row.categoryId);
  const [productData, banner, usage, usage30, channelRows, history, impact, conflicts, identities] = await Promise.all([
    productIds.length ? db.select({ id: products.id, sku: products.sku, commercialName: products.commercialName, normalizedName: products.normalizedName }).from(products).where(inArray(products.id, productIds)) : Promise.resolve([]),
    promotion.bannerAssetId ? db.select({ id: mediaAssets.id, publicUrl: mediaAssets.publicUrl, altText: mediaAssets.altText }).from(mediaAssets).where(eq(mediaAssets.id, promotion.bannerAssetId)).limit(1).then(([row]) => row ?? null) : null,
    db.select({ value: count() }).from(promotionApplications).where(eq(promotionApplications.promotionId, id)),
    db.select({ applications: count(), discount: sum(promotionApplications.discountAmount) }).from(promotionApplications).where(and(eq(promotionApplications.promotionId, id), gte(promotionApplications.createdAt, cutoff))),
    db.select({ contextType: promotionApplications.contextType, applications: count(), discount: sum(promotionApplications.discountAmount) }).from(promotionApplications).where(and(eq(promotionApplications.promotionId, id), gte(promotionApplications.createdAt, cutoff))).groupBy(promotionApplications.contextType),
    db.select().from(auditLogs).where(and(eq(auditLogs.entityType, "promotion"), eq(auditLogs.entityId, id))).orderBy(desc(auditLogs.createdAt)).limit(100),
    getProductImpact(promotion, productIds, categoryIds),
    getPromotionConflictMap(now).then((map) => map.get(id) ?? []),
    db.select({ id: users.id, name: users.name, email: users.email }).from(users),
  ]);
  const categoryData = categoryIds.length ? await db.select({ id: categories.id, name: categories.name }).from(categories).where(inArray(categories.id, categoryIds)) : [];
  const identityById = new Map(identities.map((row) => [row.id, row.name?.trim() || row.email]));
  const actorLabel = (actorId: string | null, actorRole: string | null) => actorId ? identityById.get(actorId) ?? "Identidad no disponible" : actorRole ? `${actorRole} · sistema` : "Sistema";
  return {
    promotion: { ...promotion, effectiveStatus: displayPromotionStatus(promotion, now) },
    products: productRows.map((row) => {
      const product = productData.find((candidate) => candidate.id === row.productId);
      return { productId: row.productId, sku: product?.sku ?? row.productId, name: product ? productName(product) : row.productId };
    }),
    categories: categoryData.map((row) => ({ categoryId: row.id, name: row.name })),
    banner,
    usage: Number(usage[0]?.value ?? 0),
    usage30Applications: Number(usage30[0]?.applications ?? 0),
    usage30Discount: money(Number(usage30[0]?.discount ?? 0)),
    channelUsage: channelRows.map((row) => ({ contextType: row.contextType, applications: Number(row.applications ?? 0), discount: money(Number(row.discount ?? 0)) })),
    impact,
    conflicts,
    history: history.map((row) => ({ id: row.id, action: row.action, actorName: actorLabel(row.actorId, row.actorRole), actorRole: row.actorRole, createdAt: row.createdAt })),
    creatorName: actorLabel(promotion.createdBy, null),
    approvedByName: promotion.approvedBy ? actorLabel(promotion.approvedBy, null) : null,
  };
}

export async function getPromotionDraftPreview(input: PromotionInput): Promise<PromotionDraftPreview> {
  const db = getDb();
  const rows = await getScopedProductRows(input.productIds, input.categoryIds);
  const prices = await loadRetailPrices(db, rows.map((row) => row.id));
  let totalPercentage = 0;
  let totalDiscount = 0;
  const impacts: PromotionImpact[] = [];
  for (const row of rows) {
    const price = prices.get(row.id);
    if (!price) continue;
    const calculated = applyPromotionToUnitPrice({ id: "draft-preview", type: input.type, discountValue: input.discountValue }, price.amount);
    const base = Number(calculated.baseUnitPrice);
    const percentage = base > 0 ? (Number(calculated.discountAmount) / base) * 100 : 0;
    totalPercentage += percentage;
    totalDiscount += Number(calculated.discountAmount);
    if (!impacts.length) impacts.push({ productId: row.id, sku: row.sku, name: productName(row), baseUnitPrice: calculated.baseUnitPrice, finalUnitPrice: calculated.finalUnitPrice, discountAmount: calculated.discountAmount, discountPercentage: Number(percentage.toFixed(1)), currency: price.currency });
  }
  return {
    product: impacts[0] ?? null,
    impact: { affectedProducts: rows.length, pricedProducts: prices.size, averageDiscountPercentage: prices.size ? Number((totalPercentage / prices.size).toFixed(1)) : 0, averageDiscountAmount: prices.size ? money(totalDiscount / prices.size) : "0.00", totalDiscountAmount: money(totalDiscount) },
    conflicts: await getDraftConflicts(input),
    approvalThreshold: await getApprovalThreshold(new Date()),
  };
}

async function getDraftConflicts(input: PromotionInput) {
  if (input.policy === "STACKABLE" || input.policy === "BEST_VALUE") return [];
  const db = getDb();
  const start = new Date(input.startsAt);
  const end = new Date(input.endsAt);
  const activeRows = await db.select().from(promotions).where(and(eq(promotions.status, "ACTIVE"), lte(promotions.startsAt, end), gt(promotions.endsAt, start)));
  if (!activeRows.length) return [];
  const ids = activeRows.map((row) => row.id);
  const [directRows, categoryRows, targetProducts] = await Promise.all([
    db.select({ promotionId: promotionProducts.promotionId, productId: promotionProducts.productId }).from(promotionProducts).where(inArray(promotionProducts.promotionId, ids)),
    db.select({ promotionId: promotionCategories.promotionId, categoryId: promotionCategories.categoryId }).from(promotionCategories).where(inArray(promotionCategories.promotionId, ids)),
    getScopedProductRows(input.productIds, input.categoryIds),
  ]);
  const allProducts = targetProducts.length ? targetProducts : await getScopedProductRows([], []);
  const directByPromotion = new Map<string, Set<string>>();
  const categoriesByPromotion = new Map<string, Set<string>>();
  for (const row of directRows) {
    const values = directByPromotion.get(row.promotionId) ?? new Set<string>();
    values.add(row.productId);
    directByPromotion.set(row.promotionId, values);
  }
  for (const row of categoryRows) {
    const values = categoriesByPromotion.get(row.promotionId) ?? new Set<string>();
    values.add(row.categoryId);
    categoriesByPromotion.set(row.promotionId, values);
  }
  return activeRows.flatMap((promotion) => {
    if (promotion.policy === "STACKABLE" || promotion.policy === "BEST_VALUE") return [];
    let affected = 0;
    for (const product of allProducts) {
      const draftCovers = (!input.productIds.length && !input.categoryIds.length) || input.productIds.includes(product.id) || input.categoryIds.includes(product.categoryId);
      if (draftCovers && promotionCoversProduct(promotion.id, product.id, product.categoryId, directByPromotion, categoriesByPromotion)) affected += 1;
    }
    return affected ? [{ promotionId: promotion.id, promotionName: promotion.name, affectedProductCount: affected, href: `/admin/promociones?id=${encodeURIComponent(promotion.id)}` }] : [];
  });
}
