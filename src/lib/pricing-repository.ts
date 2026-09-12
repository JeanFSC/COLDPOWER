import { and, asc, count, desc, eq, exists, gte, gt, ilike, inArray, isNull, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { brands, categories, discountRules, families, mediaAssetUsages, mediaAssets, priceHistory, productPrices, products, users } from "@/db/schema";
import type { PricingFilters, PricingHistoryFilters, PricingItem, PricingListResponse, PricingPriceRecord } from "@/lib/pricing-contract";
import { getPriceEffectiveStatus, isPriceEffectiveAt, resolvePricingStates } from "@/lib/pricing-domain";

export type PriceView = {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  priceType: string;
  amount: string;
  currency: string;
  wholesaleMinQty: number | null;
  minimumAllowed: string | null;
  status: string;
  validFrom: Date;
  validUntil: Date | null;
  active: boolean;
  createdBy: string | null;
};

function activeWindow(now = new Date()): SQL {
  return and(eq(productPrices.active, true), eq(productPrices.status, "ACTIVE"), lte(productPrices.validFrom, now), or(isNull(productPrices.validUntil), gt(productPrices.validUntil, now)))!;
}

export async function getActiveRetailPrices(productIds: string[], now = new Date()) {
  if (!productIds.length) return new Map<string, { amount: number; currency: string }>();
  const rows = await getDb().select({ productId: productPrices.productId, amount: productPrices.amount, currency: productPrices.currency }).from(productPrices).where(and(inArray(productPrices.productId, productIds), eq(productPrices.priceType, "RETAIL"), activeWindow(now))).orderBy(desc(productPrices.createdAt));
  const result = new Map<string, { amount: number; currency: string }>();
  for (const row of rows) if (!result.has(row.productId)) result.set(row.productId, { amount: Number(row.amount), currency: row.currency });
  return result;
}

export async function listProductPrices(productId?: string, options: { includeCost?: boolean } = {}): Promise<PriceView[]> {
  const where = and(productId ? eq(productPrices.productId, productId) : undefined, options.includeCost ? undefined : inArray(productPrices.priceType, ["RETAIL", "WHOLESALE", "MINIMUM", "SPECIAL"]));
  const rows = await getDb().select({ id: productPrices.id, productId: productPrices.productId, sku: products.sku, productName: products.normalizedName, priceType: productPrices.priceType, amount: productPrices.amount, currency: productPrices.currency, wholesaleMinQty: productPrices.wholesaleMinQty, minimumAllowed: productPrices.minimumAllowed, status: productPrices.status, validFrom: productPrices.validFrom, validUntil: productPrices.validUntil, active: productPrices.active, createdBy: productPrices.createdBy }).from(productPrices).innerJoin(products, eq(productPrices.productId, products.id)).where(where).orderBy(desc(productPrices.createdAt));
  return rows.map((row) => ({ ...row, amount: String(row.amount) }));
}

export async function getPriceHistory(productId?: string, options: { includeCost?: boolean } = {}) {
  const where = and(productId ? eq(priceHistory.productId, productId) : undefined, options.includeCost ? undefined : inArray(priceHistory.priceType, ["RETAIL", "WHOLESALE", "MINIMUM", "SPECIAL"]));
  return getDb().select({ id: priceHistory.id, productId: priceHistory.productId, sku: products.sku, productName: products.normalizedName, priceId: priceHistory.priceId, priceType: priceHistory.priceType, previousAmount: priceHistory.previousAmount, newAmount: priceHistory.newAmount, currency: priceHistory.currency, reason: priceHistory.reason, changedBy: priceHistory.changedBy, createdAt: priceHistory.createdAt }).from(priceHistory).innerJoin(products, eq(priceHistory.productId, products.id)).where(where).orderBy(desc(priceHistory.createdAt)).limit(500);
}

export async function listDiscountRules() {
  return getDb().select().from(discountRules).orderBy(asc(discountRules.name));
}

const defaultPageSize = 12;
const maxPageSize = 100;

function pageValues(page?: number, pageSize?: number) {
  return { page: Math.max(1, Math.floor(page ?? 1)), pageSize: Math.min(maxPageSize, Math.max(1, Math.floor(pageSize ?? defaultPageSize))) };
}

function baseMetricConditions(filters: PricingFilters) {
  const conditions: SQL[] = [];
  if (filters.query) {
    const pattern = `%${filters.query.trim()}%`;
    conditions.push(or(ilike(products.sku, pattern), ilike(products.commercialName, pattern), ilike(products.normalizedName, pattern), ilike(products.originalName, pattern), ilike(categories.name, pattern), ilike(families.name, pattern), ilike(brands.name, pattern))!);
  }
  if (filters.sku) conditions.push(ilike(products.sku, `%${filters.sku.trim()}%`));
  if (filters.productId) conditions.push(eq(products.id, filters.productId));
  if (filters.categoryId) conditions.push(or(eq(products.categoryId, filters.categoryId), eq(products.editorialCategoryId, filters.categoryId))!);
  if (filters.familyId) conditions.push(or(eq(products.familyId, filters.familyId), eq(products.editorialFamilyId, filters.familyId))!);
  if (filters.brandId) conditions.push(or(eq(products.brandId, filters.brandId), eq(products.editorialBrandId, filters.brandId))!);
  return conditions;
}

function productConditions(filters: PricingFilters) {
  const conditions = baseMetricConditions(filters);
  const retailCurrent = and(eq(productPrices.priceType, "RETAIL"), activeWindow());
  if (filters.pricingCoverage === "PRICED") conditions.push(exists(getDb().select({ id: productPrices.id }).from(productPrices).where(and(eq(productPrices.productId, products.id), retailCurrent))));
  if (filters.pricingCoverage === "MISSING" || filters.effectiveStatus === "MISSING") conditions.push(sql`not exists (select 1 from ${productPrices} where ${productPrices.productId} = ${products.id} and ${productPrices.priceType} = 'RETAIL' and ${productPrices.active} = true and ${productPrices.status} = 'ACTIVE' and ${productPrices.validFrom} <= now() and (${productPrices.validUntil} is null or ${productPrices.validUntil} > now()))`);
  if (filters.hasWholesale !== undefined) {
    const wholesaleConfigured = exists(getDb().select({ id: productPrices.id }).from(productPrices).where(and(eq(productPrices.productId, products.id), eq(productPrices.priceType, "WHOLESALE"), gt(productPrices.wholesaleMinQty, 0), eq(productPrices.active, true), eq(productPrices.status, "ACTIVE"))));
    conditions.push(filters.hasWholesale ? wholesaleConfigured : sql`not exists (select 1 from ${productPrices} where ${productPrices.productId} = ${products.id} and ${productPrices.priceType} = 'WHOLESALE' and ${productPrices.wholesaleMinQty} > 0 and ${productPrices.active} = true and ${productPrices.status} = 'ACTIVE')`);
  }
  for (const [filter, type] of [[filters.hasPromotion, "SPECIAL"], [filters.hasMinimum, "MINIMUM"]] as const) {
    if (filter === undefined) continue;
    const matching = exists(getDb().select({ id: productPrices.id }).from(productPrices).where(and(eq(productPrices.productId, products.id), eq(productPrices.priceType, type), eq(productPrices.active, true), eq(productPrices.status, "ACTIVE"))));
    conditions.push(filter ? matching : sql`not exists (select 1 from ${productPrices} where ${productPrices.productId} = ${products.id} and ${productPrices.priceType} = ${type} and ${productPrices.active} = true and ${productPrices.status} = 'ACTIVE')`);
  }
  return conditions;
}

function priceConditions(filters: PricingFilters, includeCost: boolean) {
  const conditions: SQL[] = [];
  if (filters.priceType) conditions.push(eq(productPrices.priceType, filters.priceType));
  if (filters.status) conditions.push(eq(productPrices.status, filters.status));
  if (filters.active !== undefined) conditions.push(eq(productPrices.active, filters.active));
  if (filters.effectiveStatus === "CURRENT") conditions.push(activeWindow());
  if (filters.effectiveStatus === "SCHEDULED") conditions.push(and(eq(productPrices.active, true), eq(productPrices.status, "ACTIVE"), gt(productPrices.validFrom, new Date()))!);
  if (filters.effectiveStatus === "EXPIRED") conditions.push(and(eq(productPrices.active, true), eq(productPrices.status, "ACTIVE"), lte(productPrices.validUntil, new Date()))!);
  if (filters.effectiveStatus === "INACTIVE") conditions.push(eq(productPrices.status, "INACTIVE"));
  if (filters.effectiveStatus === "ARCHIVED") conditions.push(eq(productPrices.status, "ARCHIVED"));
  if (filters.currency) conditions.push(eq(productPrices.currency, filters.currency));
  if (filters.validFrom) conditions.push(gte(productPrices.validFrom, new Date(`${filters.validFrom}T00:00:00-05:00`)));
  if (filters.validUntil) conditions.push(lt(productPrices.validUntil, new Date(`${filters.validUntil}T23:59:59.999-05:00`)));
  if (filters.updatedFrom) conditions.push(gte(productPrices.updatedAt, new Date(`${filters.updatedFrom}T00:00:00-05:00`)));
  if (filters.updatedUntil) conditions.push(lt(productPrices.updatedAt, new Date(`${filters.updatedUntil}T23:59:59.999-05:00`)));
  if (!includeCost) conditions.push(inArray(productPrices.priceType, ["RETAIL", "WHOLESALE", "MINIMUM", "SPECIAL"]));
  return conditions;
}

function choosePrice(prices: PricingPriceRecord[], at = new Date()) {
  const states = resolvePricingStates(prices, true, at);
  const preferredTypes = ["retail", "wholesale", "minimum", "special", "cost"] as const;
  return preferredTypes.map((type) => states[type]).find((price) => price && isPriceEffectiveAt(price, at))
    ?? preferredTypes.map((type) => states[type]).find(Boolean)
    ?? null;
}

function mapPrice(row: { id: string; priceType: PricingPriceRecord["priceType"]; amount: string; currency: string; wholesaleMinQty: number | null; minimumAllowed: string | null; status: string; active: boolean; validFrom: Date; validUntil: Date | null; updatedAt?: Date | string | null }): PricingPriceRecord {
  return { ...row, amount: String(row.amount), minimumAllowed: row.minimumAllowed === null ? null : String(row.minimumAllowed) };
}

export async function getPricingPage(filters: PricingFilters = {}, options: { includeCost?: boolean } = {}): Promise<PricingListResponse> {
  const includeCost = options.includeCost === true;
  const { page, pageSize } = pageValues(filters.page, filters.pageSize);
  const db = getDb();
  const conditions = productConditions(filters);
  const hasPriceFilter = filters.priceType !== undefined || filters.status !== undefined || filters.active !== undefined || (filters.effectiveStatus !== undefined && filters.effectiveStatus !== "MISSING") || filters.currency !== undefined || filters.validFrom !== undefined || filters.validUntil !== undefined || filters.updatedFrom !== undefined || filters.updatedUntil !== undefined;
  if (hasPriceFilter) {
    conditions.push(exists(db.select({ id: productPrices.id }).from(productPrices).where(and(eq(productPrices.productId, products.id), ...priceConditions(filters, includeCost)))));
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const [productRows, totalRows, facetRows] = await Promise.all([
    db.select({ id: products.id, sku: products.sku, productName: sql<string>`coalesce(${products.commercialName}, ${products.normalizedName}, ${products.originalName})`, categoryId: categories.id, categoryName: categories.name, familyId: families.id, familyName: families.name, brandId: brands.id, brandName: brands.name, updatedAt: products.updatedAt }).from(products).innerJoin(categories, eq(products.categoryId, categories.id)).innerJoin(families, eq(products.familyId, families.id)).leftJoin(brands, eq(products.brandId, brands.id)).where(where).orderBy(asc(products.sku)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ total: count(products.id) }).from(products).innerJoin(categories, eq(products.categoryId, categories.id)).innerJoin(families, eq(products.familyId, families.id)).leftJoin(brands, eq(products.brandId, brands.id)).where(where),
    Promise.all([
      db.selectDistinct({ id: categories.id, name: categories.name }).from(products).innerJoin(categories, eq(products.categoryId, categories.id)).innerJoin(families, eq(products.familyId, families.id)).leftJoin(brands, eq(products.brandId, brands.id)).where(where).orderBy(asc(categories.name)),
      db.selectDistinct({ id: families.id, name: families.name }).from(products).innerJoin(categories, eq(products.categoryId, categories.id)).innerJoin(families, eq(products.familyId, families.id)).leftJoin(brands, eq(products.brandId, brands.id)).where(where).orderBy(asc(families.name)),
      db.selectDistinct({ id: brands.id, name: brands.name }).from(products).innerJoin(categories, eq(products.categoryId, categories.id)).innerJoin(families, eq(products.familyId, families.id)).leftJoin(brands, eq(products.brandId, brands.id)).where(where).orderBy(asc(brands.name)),
      db.selectDistinct({ status: productPrices.status }).from(productPrices).innerJoin(products, eq(productPrices.productId, products.id)).innerJoin(categories, eq(products.categoryId, categories.id)).innerJoin(families, eq(products.familyId, families.id)).leftJoin(brands, eq(products.brandId, brands.id)).where(and(where, includeCost ? undefined : inArray(productPrices.priceType, ["RETAIL", "WHOLESALE", "MINIMUM", "SPECIAL"]))).orderBy(productPrices.status),
    ]),
  ]);
  const productIds = productRows.map((row) => row.id);
  const priceRows = productIds.length ? await db.select({ productId: productPrices.productId, id: productPrices.id, priceType: productPrices.priceType, amount: productPrices.amount, currency: productPrices.currency, wholesaleMinQty: productPrices.wholesaleMinQty, minimumAllowed: productPrices.minimumAllowed, status: productPrices.status, active: productPrices.active, validFrom: productPrices.validFrom, validUntil: productPrices.validUntil, updatedAt: productPrices.updatedAt }).from(productPrices).where(and(inArray(productPrices.productId, productIds), ...(includeCost ? [] : [inArray(productPrices.priceType, ["RETAIL", "WHOLESALE", "MINIMUM", "SPECIAL"])]))).orderBy(desc(productPrices.active), desc(productPrices.validFrom), desc(productPrices.createdAt)) : [];
  const mediaRows = productIds.length ? await db.select({ productId: mediaAssetUsages.entityId, assetId: mediaAssets.id, publicUrl: mediaAssets.publicUrl, altText: mediaAssets.altText }).from(mediaAssetUsages).innerJoin(mediaAssets, eq(mediaAssetUsages.assetId, mediaAssets.id)).where(and(eq(mediaAssetUsages.entityType, "product"), eq(mediaAssetUsages.slot, "primary"), eq(mediaAssets.status, "ACTIVE"), isNull(mediaAssets.deletedAt), inArray(mediaAssetUsages.entityId, productIds))).orderBy(asc(mediaAssetUsages.sortOrder), asc(mediaAssets.createdAt)) : [];
  const pricesByProduct = new Map<string, PricingPriceRecord[]>();
  for (const row of priceRows) {
    const prices = pricesByProduct.get(row.productId) ?? [];
    prices.push(mapPrice(row));
    pricesByProduct.set(row.productId, prices);
  }
  const mediaByProduct = new Map<string, { assetId: string; publicUrl: string | null; altText: string | null }>();
  for (const row of mediaRows) if (!mediaByProduct.has(row.productId)) mediaByProduct.set(row.productId, row);
  const items = productRows.map((row): PricingItem => {
    const prices = pricesByProduct.get(row.id) ?? [];
    const price = choosePrice(prices);
    const pricing = resolvePricingStates(prices, includeCost);
    const retail = pricing.retail;
    const effectiveStatus = getPriceEffectiveStatus(retail);
    const media = mediaByProduct.get(row.id);
    const latestPriceUpdate = prices.map((candidate) => candidate.updatedAt).filter(Boolean).sort((a, b) => new Date(b as Date | string).getTime() - new Date(a as Date | string).getTime())[0] ?? row.updatedAt;
    return { ...row, id: row.id, productId: row.id, price, prices, pricing, effectiveStatus, hasRetail: Boolean(retail && isPriceEffectiveAt(retail)), priceType: price?.priceType, amount: price?.amount, currency: price?.currency, status: price?.status, updatedAt: latestPriceUpdate, media: media ? { primaryUrl: media.publicUrl ?? `/api/media/${media.assetId}`, altText: media.altText, assetId: media.assetId } : null };
  });
  const totalItems = Number(totalRows[0]?.total ?? 0);
  const now = new Date();
  const [metricTotalRows, metricRows] = await Promise.all([
    db.select({ total: count(products.id) }).from(products).innerJoin(categories, eq(products.categoryId, categories.id)).innerJoin(families, eq(products.familyId, families.id)).leftJoin(brands, eq(products.brandId, brands.id)).where(and(...baseMetricConditions(filters))),
    db.select({ productId: productPrices.productId, priceType: productPrices.priceType, status: productPrices.status, active: productPrices.active, validFrom: productPrices.validFrom, validUntil: productPrices.validUntil, wholesaleMinQty: productPrices.wholesaleMinQty }).from(productPrices).innerJoin(products, eq(productPrices.productId, products.id)).innerJoin(categories, eq(products.categoryId, categories.id)).innerJoin(families, eq(products.familyId, families.id)).leftJoin(brands, eq(products.brandId, brands.id)).where(and(...baseMetricConditions(filters), inArray(productPrices.priceType, ["RETAIL", "WHOLESALE", "MINIMUM", "SPECIAL"]))),
  ]);
  const metricTotal = Number(metricTotalRows[0]?.total ?? 0);
  const retailProducts = new Set(metricRows.filter((row) => row.priceType === "RETAIL" && isPriceEffectiveAt(row, now)).map((row) => row.productId));
  const wholesaleProducts = new Set(metricRows.filter((row) => row.priceType === "WHOLESALE" && row.wholesaleMinQty && row.wholesaleMinQty > 0 && row.status !== "ARCHIVED").map((row) => row.productId));
  const currentSpecials = metricRows.filter((row) => row.priceType === "SPECIAL" && isPriceEffectiveAt(row, now));
  return {
    items,
    page,
    pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    metrics: {
      totalWithPrice: retailProducts.size,
      totalWithoutPrice: Math.max(0, metricTotal - retailProducts.size),
      activePrices: metricRows.filter((row) => isPriceEffectiveAt(row, now)).length,
      promotions: currentSpecials.length,
      expiredPrices: metricRows.filter((row) => row.validUntil !== null && row.validUntil <= now && row.status === "ACTIVE").length,
      totalProducts: metricTotal,
      retailPricedProducts: retailProducts.size,
      retailMissingProducts: Math.max(0, metricTotal - retailProducts.size),
      wholesaleConfiguredProducts: wholesaleProducts.size,
      activeSpecialPrices: currentSpecials.length,
      scheduledPriceChanges: metricRows.filter((row) => row.status === "ACTIVE" && row.active && row.validFrom > now).length,
      expiringSoon: metricRows.filter((row) => isPriceEffectiveAt(row, now) && row.validUntil && row.validUntil.getTime() <= now.getTime() + 7 * 86400000).length,
    },
    facets: { categories: facetRows[0].filter((row): row is { id: string; name: string } => Boolean(row.id && row.name)), families: facetRows[1].filter((row): row is { id: string; name: string } => Boolean(row.id && row.name)), brands: facetRows[2].filter((row): row is { id: string; name: string } => Boolean(row.id && row.name)), statuses: facetRows[3].map((row) => row.status).filter((status): status is string => Boolean(status)) },
  };
}

export async function getPricingExportData(filters: PricingFilters = {}, options: { includeCost?: boolean } = {}) {
  const pageSize = 100;
  const first = await getPricingPage({ ...filters, page: 1, pageSize }, options);
  const items = [...first.items];
  for (let page = 2; page <= first.totalPages; page += 1) {
    const next = await getPricingPage({ ...filters, page, pageSize }, options);
    items.push(...next.items);
  }
  return { ...first, items, page: 1, pageSize: items.length || pageSize, totalPages: 1 };
}

export async function getPricingHistoryPage(filters: PricingHistoryFilters = {}, options: { includeCost?: boolean } = {}) {
  const includeCost = options.includeCost === true;
  const { page, pageSize } = pageValues(filters.page, filters.pageSize);
  const conditions: SQL[] = [];
  if (filters.productId) conditions.push(eq(priceHistory.productId, filters.productId));
  if (filters.sku) conditions.push(ilike(products.sku, `%${filters.sku.trim()}%`));
  if (filters.priceType) conditions.push(eq(priceHistory.priceType, filters.priceType));
  if (filters.actorId) conditions.push(eq(priceHistory.changedBy, filters.actorId));
  if (filters.from) conditions.push(gte(priceHistory.createdAt, new Date(`${filters.from}T00:00:00-05:00`)));
  if (filters.to) conditions.push(lt(priceHistory.createdAt, new Date(new Date(`${filters.to}T00:00:00-05:00`).getTime() + 86400000)));
  if (!includeCost) conditions.push(inArray(priceHistory.priceType, ["RETAIL", "WHOLESALE", "MINIMUM", "SPECIAL"]));
  const where = conditions.length ? and(...conditions) : undefined;
  const db = getDb();
  const [rows, totalRows] = await Promise.all([
    db.select({ id: priceHistory.id, productId: priceHistory.productId, sku: products.sku, productName: sql<string>`coalesce(${products.commercialName}, ${products.normalizedName}, ${products.originalName})`, priceId: priceHistory.priceId, priceType: priceHistory.priceType, previousAmount: priceHistory.previousAmount, newAmount: priceHistory.newAmount, currency: priceHistory.currency, reason: priceHistory.reason, changedBy: priceHistory.changedBy, actorName: users.name, actorEmail: users.email, createdAt: priceHistory.createdAt }).from(priceHistory).innerJoin(products, eq(priceHistory.productId, products.id)).leftJoin(users, eq(priceHistory.changedBy, users.id)).where(where).orderBy(desc(priceHistory.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ total: count(priceHistory.id) }).from(priceHistory).innerJoin(products, eq(priceHistory.productId, products.id)).where(where),
  ]);
  const totalItems = Number(totalRows[0]?.total ?? 0);
  return { items: rows.map((row) => ({ ...row, previousAmount: row.previousAmount === null ? null : String(row.previousAmount), newAmount: String(row.newAmount), actor: row.changedBy ? { id: row.changedBy, name: row.actorName, email: row.actorEmail } : null })), page, pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)) };
}
