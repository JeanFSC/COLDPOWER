import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { getDb } from "@/db";
import {
  auditLogs,
  brands,
  catalogMetricSnapshots,
  categories,
  families,
  inventoryBalances,
  mediaAssetUsages,
  mediaAssets,
  priceHistory,
  productPrices,
  products,
} from "@/db/schema";
import {
  publicationStatusLabels,
  stockState,
  type CatalogApiFilters,
  type PublicationStatus,
} from "@/lib/catalog-admin-contract";
import { calculateCatalogQuality, type CatalogQuality } from "@/lib/catalog-quality";
import { getActiveRetailPrices } from "@/lib/pricing-repository";
import { getEditorialWorkflowState } from "@/lib/publication-governance";

function effectiveCategoryJoin() {
  return or(
    eq(products.editorialCategoryId, categories.id),
    and(isNull(products.editorialCategoryId), eq(products.categoryId, categories.id)),
  )!;
}
function effectiveFamilyJoin() {
  return or(
    eq(products.editorialFamilyId, families.id),
    and(isNull(products.editorialFamilyId), eq(products.familyId, families.id)),
  )!;
}
function effectiveBrandJoin() {
  return or(
    eq(products.editorialBrandId, brands.id),
    and(isNull(products.editorialBrandId), eq(products.brandId, brands.id)),
  )!;
}

function conditions(filters: CatalogApiFilters) {
  const result: SQL[] = [];
  const query = filters.query?.trim();
  if (query) {
    const pattern = `%${query}%`;
    result.push(
      or(
        ilike(products.sku, pattern),
        ilike(products.normalizedName, pattern),
        ilike(products.commercialName, pattern),
        ilike(products.originalName, pattern),
        ilike(products.productType, pattern),
        ilike(categories.name, pattern),
        ilike(families.name, pattern),
        ilike(brands.name, pattern),
        ilike(products.application, pattern),
        ilike(products.refrigerant, pattern),
        ilike(products.voltage, pattern),
        ilike(products.power, pattern),
        ilike(products.frequency, pattern),
        ilike(products.rpm, pattern),
        ilike(products.amperage, pattern),
        ilike(products.capacitance, pattern),
        ilike(products.horsepower, pattern),
        ilike(products.temperature, pattern),
        ilike(products.dimensions, pattern),
        ilike(products.length, pattern),
        ilike(products.connectionSize, pattern),
      )!,
    );
  }
  if (filters.sku) result.push(ilike(products.sku, `%${filters.sku.trim()}%`));
  if (filters.name) {
    const pattern = `%${filters.name.trim()}%`;
    result.push(
      or(
        ilike(products.commercialName, pattern),
        ilike(products.normalizedName, pattern),
        ilike(products.originalName, pattern),
      )!,
    );
  }
  if (filters.category) result.push(eq(categories.slug, filters.category));
  if (filters.categoryId)
    result.push(
      or(
        eq(products.editorialCategoryId, filters.categoryId),
        eq(products.categoryId, filters.categoryId),
      )!,
    );
  if (filters.family) result.push(eq(families.slug, filters.family));
  if (filters.familyId)
    result.push(
      or(
        eq(products.editorialFamilyId, filters.familyId),
        eq(products.familyId, filters.familyId),
      )!,
    );
  if (filters.brand) result.push(eq(brands.slug, filters.brand));
  if (filters.brandId)
    result.push(
      or(eq(products.editorialBrandId, filters.brandId), eq(products.brandId, filters.brandId))!,
    );
  if (filters.hasBrand !== undefined)
    result.push(
      filters.hasBrand
        ? sql`coalesce(${products.editorialBrandId}, ${products.brandId}) is not null`
        : sql`coalesce(${products.editorialBrandId}, ${products.brandId}) is null`,
    );
  if (filters.hasMedia !== undefined)
    result.push(
      filters.hasMedia
        ? sql`exists (select 1 from media_asset_usages mau join media_assets ma on ma.id = mau.asset_id where mau.entity_type = 'product' and mau.entity_id = ${products.id} and mau.slot = 'primary' and ma.status = 'ACTIVE' and ma.deleted_at is null)`
        : sql`not exists (select 1 from media_asset_usages mau join media_assets ma on ma.id = mau.asset_id where mau.entity_type = 'product' and mau.entity_id = ${products.id} and mau.slot = 'primary' and ma.status = 'ACTIVE' and ma.deleted_at is null)`,
    );
  if (filters.hasPrice !== undefined)
    result.push(
      filters.hasPrice
        ? sql`exists (select 1 from product_prices pp where pp.product_id = ${products.id} and pp.price_type = 'RETAIL' and pp.active = true and pp.status = 'ACTIVE' and pp.valid_from <= now() and (pp.valid_until is null or pp.valid_until > now()))`
        : sql`not exists (select 1 from product_prices pp where pp.product_id = ${products.id} and pp.price_type = 'RETAIL' and pp.active = true and pp.status = 'ACTIVE' and pp.valid_from <= now() and (pp.valid_until is null or pp.valid_until > now()))`,
    );
  if (filters.publicationStatus)
    result.push(eq(products.publicationStatus, filters.publicationStatus));
  if (filters.requiresReview !== undefined)
    result.push(eq(products.requiresReview, filters.requiresReview));
  if (filters.possibleDuplicate !== undefined)
    result.push(eq(products.possibleDuplicate, filters.possibleDuplicate));
  if (filters.duplicateDecision)
    result.push(eq(products.duplicateDecision, filters.duplicateDecision));
  if (filters.confidence)
    result.push(ilike(products.normalizationConfidence, `%${filters.confidence.trim()}%`));
  if (filters.sourceStatus) result.push(ilike(products.status, `%${filters.sourceStatus.trim()}%`));
  return result.length ? and(...result) : undefined;
}

function stockView(row: {
  onHand: number | null;
  reserved: number | null;
  minimum: number | null;
  locations: number;
}) {
  const state = stockState(row);
  return {
    state,
    onHand: row.onHand,
    reserved: row.reserved,
    available: row.onHand === null || row.reserved === null ? null : row.onHand - row.reserved,
    minimum: row.minimum,
    locations: row.locations,
  };
}

function catalogSelection() {
  return {
    id: products.id,
    sku: products.sku,
    slug: products.slug,
    name: products.commercialName,
    normalizedName: products.normalizedName,
    originalName: products.originalName,
    commercialName: products.commercialName,
    featured: products.featured,
    productType: products.productType,
    category: categories.name,
    categoryId: categories.id,
    categorySlug: categories.slug,
    family: families.name,
    familyId: families.id,
    familySlug: families.slug,
    brand: brands.name,
    brandId: brands.id,
    publicationStatus: products.publicationStatus,
    requiresReview: products.requiresReview,
    reviewReason: products.reviewReason,
    possibleDuplicate: products.possibleDuplicate,
    duplicateGroup: products.duplicateGroup,
    duplicateDecision: products.duplicateDecision,
    canonicalProductId: products.canonicalProductId,
    normalizationConfidence: products.normalizationConfidence,
    sourceStatus: products.status,
    sourcePage: products.sourcePage,
    sourceRow: products.sourceRow,
    editorialDescription: products.editorialDescription,
    originalReferenceCode: products.originalReferenceCode,
    modelCode: products.modelCode,
    application: products.application,
    compatibilityBrands: products.compatibilityBrands,
    voltage: products.voltage,
    power: products.power,
    frequency: products.frequency,
    rpm: products.rpm,
    amperage: products.amperage,
    capacitance: products.capacitance,
    refrigerant: products.refrigerant,
    horsepower: products.horsepower,
    temperature: products.temperature,
    dimensions: products.dimensions,
    length: products.length,
    connectionSize: products.connectionSize,
    unitOfMeasure: products.unitOfMeasure,
    updatedAt: products.updatedAt,
  };
}

// Narrower than catalogSelection(): only the columns calculateCatalogQuality() (and the
// media/price/stock alert counts around it) actually reads. This runs unfiltered over the
// whole catalog on every /admin/catalogo load — cutting ~15 unused columns (sku, slug,
// featured, *Id/*Slug foreign keys, publicationStatus, reviewReason, canonicalProductId,
// normalizationConfidence, sourcePage/sourceRow, updatedAt) trims what Postgres has to
// serialize and Node has to deserialize for all ~1,348 rows, with zero change to which rows
// match or how quality is scored.
function qualityScanSelection() {
  return {
    id: products.id,
    name: products.commercialName,
    normalizedName: products.normalizedName,
    originalName: products.originalName,
    commercialName: products.commercialName,
    category: categories.name,
    family: families.name,
    brand: brands.name,
    productType: products.productType,
    requiresReview: products.requiresReview,
    possibleDuplicate: products.possibleDuplicate,
    duplicateDecision: products.duplicateDecision,
    editorialDescription: products.editorialDescription,
    originalReferenceCode: products.originalReferenceCode,
    modelCode: products.modelCode,
    application: products.application,
    compatibilityBrands: products.compatibilityBrands,
    voltage: products.voltage,
    power: products.power,
    frequency: products.frequency,
    rpm: products.rpm,
    amperage: products.amperage,
    capacitance: products.capacitance,
    refrigerant: products.refrigerant,
    horsepower: products.horsepower,
    temperature: products.temperature,
    dimensions: products.dimensions,
    length: products.length,
    connectionSize: products.connectionSize,
    unitOfMeasure: products.unitOfMeasure,
    sourceStatus: products.status,
  };
}

function sortOrder(filters: CatalogApiFilters) {
  const descending = filters.direction === "desc";
  const term = (column: Parameters<typeof asc>[0]) => (descending ? desc(column) : asc(column));
  switch (filters.sort) {
    case "sku":
      return [term(products.sku), asc(products.normalizedName)];
    case "category":
      return [term(categories.name), asc(products.sku)];
    case "brand":
      return [term(brands.name), asc(products.sku)];
    case "status":
      return [term(products.publicationStatus), asc(products.sku)];
    case "updatedAt":
      return [term(products.updatedAt), asc(products.sku)];
    case "name":
    default:
      return [term(products.normalizedName), asc(products.sku)];
  }
}

type MediaSummary = { primary: number; alt: number; gallery: number };
type CatalogRow = {
  id: string;
  sku: string;
  slug: string;
  name: string | null;
  normalizedName: string;
  originalName: string;
  commercialName: string | null;
  featured: boolean;
  productType: string;
  category: string;
  categoryId: string;
  categorySlug: string;
  family: string;
  familyId: string;
  familySlug: string;
  brand: string | null;
  brandId: string | null;
  publicationStatus: PublicationStatus;
  requiresReview: boolean | null;
  reviewReason: string | null;
  possibleDuplicate: boolean | null;
  duplicateGroup: string | null;
  duplicateDecision: "pending" | "different" | "confirmed" | "keep_both";
  canonicalProductId: string | null;
  normalizationConfidence: string | null;
  sourceStatus: string;
  sourcePage: number | null;
  sourceRow: number | null;
  editorialDescription: string | null;
  originalReferenceCode: string | null;
  modelCode: string | null;
  application: string | null;
  compatibilityBrands: string[] | null;
  voltage: string | null;
  power: string | null;
  frequency: string | null;
  rpm: string | null;
  amperage: string | null;
  capacitance: string | null;
  refrigerant: string | null;
  horsepower: string | null;
  temperature: string | null;
  dimensions: string | null;
  length: string | null;
  connectionSize: string | null;
  unitOfMeasure: string | null;
  updatedAt: Date;
};
function qualityForRow(row: CatalogRow, media: MediaSummary | undefined): CatalogQuality {
  return calculateCatalogQuality({
    ...row,
    name: row.name || row.normalizedName || row.originalName,
    categoryName: row.category,
    familyName: row.family,
    brandName: row.brand,
    hasPrimaryImage: Boolean(media?.primary),
    hasAltText: Boolean(media?.alt),
    hasSecondImage: Boolean(media && media.gallery > 1),
  });
}
function percent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

type CatalogQueueMetrics = {
  totalProducts: number;
  publishedProducts: number;
  reviewProducts: number;
  productsRequiringReview: number;
  duplicateProducts: number;
};
export type CatalogMetricTrend = {
  points: number[];
  previousValue: number | null;
  periodDays: number;
};
function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
function daysBefore(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() - days);
  return result;
}
async function getCatalogMetricTrends(queues: CatalogQueueMetrics) {
  const db = getDb();
  const today = isoDate(new Date());
  const periodDays = 7;
  // This ran an UPSERT on every single GET of /admin/catalogo — every staff
  // page view rewrote today's row with the same shape of data. Skipping the
  // write once today's snapshot already exists turns N writes/day into 1
  // write + N cheap indexed reads, without changing what the trend chart shows.
  const [existingToday] = await db
    .select({ snapshotDate: catalogMetricSnapshots.snapshotDate })
    .from(catalogMetricSnapshots)
    .where(eq(catalogMetricSnapshots.snapshotDate, today))
    .limit(1);
  if (!existingToday) {
    await db
      .insert(catalogMetricSnapshots)
      .values({ snapshotDate: today, ...queues })
      .onConflictDoUpdate({ target: catalogMetricSnapshots.snapshotDate, set: { ...queues } });
  }
  const snapshots = await db
    .select()
    .from(catalogMetricSnapshots)
    .where(
      gte(catalogMetricSnapshots.snapshotDate, isoDate(daysBefore(new Date(), periodDays * 2))),
    )
    .orderBy(asc(catalogMetricSnapshots.snapshotDate));
  const currentPeriodStart = isoDate(daysBefore(new Date(), periodDays - 1));
  const priorPeriodEnd = isoDate(daysBefore(new Date(), periodDays));
  const currentSnapshots = snapshots.filter(
    (snapshot) => snapshot.snapshotDate >= currentPeriodStart,
  );
  const previousSnapshot = snapshots
    .filter((snapshot) => snapshot.snapshotDate <= priorPeriodEnd)
    .at(-1);
  const trend = (field: keyof CatalogQueueMetrics): CatalogMetricTrend => ({
    points: currentSnapshots.map((snapshot) => snapshot[field]),
    previousValue: previousSnapshot?.[field] ?? null,
    periodDays,
  });
  return {
    totalProducts: trend("totalProducts"),
    publishedProducts: trend("publishedProducts"),
    reviewProducts: trend("reviewProducts"),
    productsRequiringReview: trend("productsRequiringReview"),
    duplicateProducts: trend("duplicateProducts"),
  };
}

async function getMediaSummary(productIds: string[]) {
  if (!productIds.length) return new Map<string, MediaSummary>();
  const rows = await getDb()
    .select({
      productId: mediaAssetUsages.entityId,
      primary: sql<string>`count(*) filter (where ${mediaAssetUsages.slot} = 'primary')`,
      alt: sql<string>`count(*) filter (where ${mediaAssetUsages.slot} = 'primary' and ${mediaAssets.altText} is not null and btrim(${mediaAssets.altText}) <> '')`,
      gallery: sql<string>`count(*)`,
    })
    .from(mediaAssetUsages)
    .innerJoin(mediaAssets, eq(mediaAssetUsages.assetId, mediaAssets.id))
    .where(
      and(
        eq(mediaAssetUsages.entityType, "product"),
        inArray(mediaAssetUsages.entityId, productIds),
        eq(mediaAssets.status, "ACTIVE"),
        isNull(mediaAssets.deletedAt),
      ),
    )
    .groupBy(mediaAssetUsages.entityId);
  return new Map(
    rows.map((row) => [
      row.productId,
      { primary: Number(row.primary), alt: Number(row.alt), gallery: Number(row.gallery) },
    ]),
  );
}

export async function getAdminCatalogPage(filters: CatalogApiFilters = {}) {
  const db = getDb();
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(filters.pageSize ?? 10)));
  const where = conditions(filters);
  const baseQuery = db
    .select(catalogSelection())
    .from(products)
    .innerJoin(categories, effectiveCategoryJoin())
    .innerJoin(families, effectiveFamilyJoin())
    .leftJoin(brands, effectiveBrandJoin())
    .where(where)
    .orderBy(...sortOrder(filters));
  const [
    rawRows,
    totalRows,
    statusRows,
    reviewRows,
    duplicateRows,
    brandCountRows,
    categoryCountRows,
    facetRows,
    categorySummaryRows,
    brandSummaryRows,
    qualityRows,
  ] = await Promise.all([
    filters.quality ? baseQuery : baseQuery.limit(pageSize).offset((page - 1) * pageSize),
    db
      .select({ total: count(products.id) })
      .from(products)
      .innerJoin(categories, effectiveCategoryJoin())
      .innerJoin(families, effectiveFamilyJoin())
      .leftJoin(brands, effectiveBrandJoin())
      .where(where),
    db
      .select({ status: products.publicationStatus, count: count(products.id) })
      .from(products)
      .groupBy(products.publicationStatus),
    db
      .select({ count: count(products.id) })
      .from(products)
      .where(eq(products.requiresReview, true)),
    db
      .select({ count: count(products.id) })
      .from(products)
      .where(
        and(
          isNull(products.canonicalProductId),
          eq(products.possibleDuplicate, true),
          eq(products.duplicateDecision, "pending"),
        ),
      ),
    db
      .select({
        count: sql<string>`count(distinct coalesce(${products.editorialBrandId}, ${products.brandId}))`,
      })
      .from(products)
      .where(sql`coalesce(${products.editorialBrandId}, ${products.brandId}) is not null`),
    db
      .select({
        count: sql<string>`count(distinct coalesce(${products.editorialCategoryId}, ${products.categoryId}))`,
      })
      .from(products),
    Promise.all([
      db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(eq(categories.active, true))
        .orderBy(categories.name),
      db
        .select({ id: families.id, name: families.name, categoryId: families.categoryId })
        .from(families)
        .where(eq(families.active, true))
        .orderBy(families.name),
      db
        .select({ id: brands.id, name: brands.name })
        .from(brands)
        .where(eq(brands.active, true))
        .orderBy(brands.name),
      db
        .selectDistinct({ value: products.publicationStatus })
        .from(products)
        .orderBy(products.publicationStatus),
      db.selectDistinct({ value: products.status }).from(products).orderBy(products.status),
      db
        .selectDistinct({ value: products.normalizationConfidence })
        .from(products)
        .where(sql`${products.normalizationConfidence} is not null`)
        .orderBy(products.normalizationConfidence),
    ]),
    db
      .select({ id: categories.id, name: categories.name, count: count(products.id) })
      .from(products)
      .innerJoin(categories, effectiveCategoryJoin())
      .groupBy(categories.id, categories.name)
      .orderBy(desc(count(products.id)), asc(categories.name)),
    db
      .select({ id: brands.id, name: brands.name, count: count(products.id) })
      .from(products)
      .leftJoin(brands, effectiveBrandJoin())
      .groupBy(brands.id, brands.name)
      .orderBy(desc(count(products.id)), asc(brands.name)),
    db
      .select(qualityScanSelection())
      .from(products)
      .innerJoin(categories, effectiveCategoryJoin())
      .innerJoin(families, effectiveFamilyJoin())
      .leftJoin(brands, effectiveBrandJoin()),
  ]);
  const rows = rawRows as unknown as CatalogRow[];
  const qualitySourceRows = qualityRows as unknown as CatalogRow[];
  const allQualityIds = qualitySourceRows.map((row) => row.id as string);
  const pageProductIds = rows.map((row) => row.id as string);
  const [mediaRows, mediaSummary, prices] = await Promise.all([
    pageProductIds.length
      ? db
          .select({
            productId: mediaAssetUsages.entityId,
            assetId: mediaAssets.id,
            url: mediaAssets.publicUrl,
            altText: mediaAssets.altText,
            sortOrder: mediaAssetUsages.sortOrder,
            slot: mediaAssetUsages.slot,
          })
          .from(mediaAssetUsages)
          .innerJoin(mediaAssets, eq(mediaAssetUsages.assetId, mediaAssets.id))
          .where(
            and(
              eq(mediaAssetUsages.entityType, "product"),
              inArray(mediaAssetUsages.entityId, pageProductIds),
              eq(mediaAssets.status, "ACTIVE"),
              isNull(mediaAssets.deletedAt),
            ),
          )
          .orderBy(
            sql`case when ${mediaAssetUsages.slot} = 'primary' then 0 else 1 end`,
            asc(mediaAssetUsages.sortOrder),
            asc(mediaAssets.createdAt),
          )
      : Promise.resolve([]),
    getMediaSummary(allQualityIds),
    getActiveRetailPrices(pageProductIds),
  ]);
  const stockRows = pageProductIds.length
    ? await db
        .select({
          productId: inventoryBalances.productId,
          onHand: sql<string>`sum(${inventoryBalances.onHand})`,
          reserved: sql<string>`sum(${inventoryBalances.reserved})`,
          minimum: sql<string>`case when count(${inventoryBalances.minimumStock}) = 0 then null else sum(${inventoryBalances.minimumStock}) end`,
          locations: count(),
        })
        .from(inventoryBalances)
        .where(inArray(inventoryBalances.productId, pageProductIds))
        .groupBy(inventoryBalances.productId)
    : [];
  const stockMap = new Map(
    (
      stockRows as Array<{
        productId: string;
        onHand: string | null;
        reserved: string | null;
        minimum: string | null;
        locations: number;
      }>
    ).map((row) => [
      row.productId,
      stockView({
        onHand: row.onHand === null ? null : Number(row.onHand),
        reserved: row.reserved === null ? null : Number(row.reserved),
        minimum: row.minimum === null ? null : Number(row.minimum),
        locations: Number(row.locations),
      }),
    ]),
  );
  const mediaMap = new Map<
    string,
    { primaryUrl: string; altText: string | null; assetId: string; galleryCount: number }
  >();
  for (const row of mediaRows as Array<{
    productId: string;
    url: string | null;
    altText: string | null;
    assetId: string;
    slot: string;
  }>)
    if (row.slot === "primary" && !mediaMap.has(row.productId))
      mediaMap.set(row.productId, {
        primaryUrl: row.url || `/api/media/${row.assetId}`,
        altText: row.altText,
        assetId: row.assetId,
        galleryCount: mediaSummary.get(row.productId)?.gallery ?? 1,
      });
  const enrich = (row: CatalogRow) => ({
    ...row,
    name: row.name || row.normalizedName || row.originalName,
    publicationStatusLabel: publicationStatusLabels[row.publicationStatus] ?? "Estado editorial",
    editorialWorkflowState: getEditorialWorkflowState(row),
    currentRetailPrice: prices.get(row.id) ?? null,
    stock:
      stockMap.get(row.id) ??
      stockView({ onHand: null, reserved: null, minimum: null, locations: 0 }),
    media: mediaMap.get(row.id) ?? null,
    quality: qualityForRow(row, mediaSummary.get(row.id)),
  });
  const enrichedRows = rows.map(enrich);
  const filteredRows = filters.quality
    ? enrichedRows.filter((row) => row.quality.level === filters.quality)
    : enrichedRows;
  const totalItems = filters.quality ? filteredRows.length : Number(totalRows[0]?.total ?? 0);
  const items = filters.quality
    ? filteredRows.slice((page - 1) * pageSize, page * pageSize)
    : filteredRows;
  const qualitySummaryRows = qualitySourceRows.map((row) =>
    qualityForRow(row, mediaSummary.get(row.id as string)),
  );
  const good = qualitySummaryRows.filter((row) => row.level === "good").length;
  const acceptable = qualitySummaryRows.filter((row) => row.level === "acceptable").length;
  const poor = qualitySummaryRows.filter((row) => row.level === "poor").length;
  const totalCatalog = qualitySummaryRows.length;
  const [
    categoriesFacet,
    familiesFacet,
    brandsFacet,
    publicationStatuses,
    sourceStatuses,
    confidenceLevels,
  ] = facetRows;
  const queues = {
    // statusRows already groups every product by publicationStatus (unconditional), so
    // summing it gives the exact same total as a separate COUNT(*) query — one less
    // sequential round trip after the main Promise.all on every catalog page load.
    totalProducts: statusRows.reduce((sum, row) => sum + Number(row.count), 0),
    publishedProducts: Number(statusRows.find((row) => row.status === "published")?.count ?? 0),
    draftProducts: Number(statusRows.find((row) => row.status === "draft")?.count ?? 0),
    hiddenProducts: Number(statusRows.find((row) => row.status === "hidden")?.count ?? 0),
    archivedProducts: Number(statusRows.find((row) => row.status === "archived")?.count ?? 0),
    reviewProducts: Number(statusRows.find((row) => row.status === "review")?.count ?? 0),
    duplicateProducts: Number(duplicateRows[0]?.count ?? 0),
    productsRequiringReview: Number(reviewRows[0]?.count ?? 0),
    totalBrands: Number(brandCountRows[0]?.count ?? 0),
    totalCategories: Number(categoryCountRows[0]?.count ?? 0),
  };
  const metricTrends = await getCatalogMetricTrends(queues);
  const allPrices = await getActiveRetailPrices(allQualityIds);
  const knownStockRows = allQualityIds.length
    ? await db
        .select({ productId: inventoryBalances.productId })
        .from(inventoryBalances)
        .where(inArray(inventoryBalances.productId, allQualityIds))
        .groupBy(inventoryBalances.productId)
    : [];
  const categoriesSummary = categorySummaryRows.map((row) => ({
    id: row.id,
    name: row.name,
    count: Number(row.count),
    percentage: percent(Number(row.count), queues.totalProducts),
  }));
  const brandsSummary = brandSummaryRows.map((row) => ({
    id: row.id ?? "no-brand",
    name: row.name ?? "Sin marca",
    count: Number(row.count),
    percentage: percent(Number(row.count), queues.totalProducts),
  }));
  return {
    items,
    rows: items,
    page,
    pageSize,
    totalItems,
    total: totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    fetchedAt: new Date().toISOString(),
    queues,
    metricTrends,
    facets: {
      categories: categoriesFacet,
      families: familiesFacet,
      brands: brandsFacet,
      publicationStatuses: publicationStatuses.map((row) => row.value),
      sourceStatuses: sourceStatuses.map((row) => row.value),
      confidenceLevels: confidenceLevels
        .map((row) => row.value)
        .filter((value): value is string => Boolean(value)),
    },
    summary: {
      categories: categoriesSummary,
      brands: brandsSummary,
      quality: {
        averageScore: totalCatalog
          ? Math.round(qualitySummaryRows.reduce((sum, row) => sum + row.score, 0) / totalCatalog)
          : 0,
        good,
        acceptable,
        poor,
        goodPercentage: percent(good, totalCatalog),
        acceptablePercentage: percent(acceptable, totalCatalog),
        poorPercentage: percent(poor, totalCatalog),
      },
      alerts: {
        requiresReview: queues.productsRequiringReview,
        pendingDuplicates: queues.duplicateProducts,
        missingPrimaryImage: qualitySourceRows.filter(
          (row) => !mediaSummary.get(row.id as string)?.primary,
        ).length,
        missingBrand: qualitySourceRows.filter((row) => !row.brand).length,
        insufficientDescription: qualitySourceRows.filter(
          (row) => (row.editorialDescription?.trim().length ?? 0) < 24,
        ).length,
        missingRetailPrice: Math.max(0, totalCatalog - allPrices.size),
        unknownStock: Math.max(0, allQualityIds.length - knownStockRows.length),
      },
    },
  };
}

export async function getAdminCatalogProductDetail(id: string, includePricing: boolean) {
  const db = getDb();
  const [product] = await db
    .select({
      id: products.id,
      sku: products.sku,
      slug: products.slug,
      originalName: products.originalName,
      normalizedName: products.normalizedName,
      commercialName: products.commercialName,
      productType: products.productType,
      categoryId: products.categoryId,
      categoryName: categories.name,
      familyId: products.familyId,
      familyName: families.name,
      brandId: products.brandId,
      brandName: brands.name,
      editorialCategoryId: products.editorialCategoryId,
      editorialFamilyId: products.editorialFamilyId,
      editorialBrandId: products.editorialBrandId,
      editorialDescription: products.editorialDescription,
      featured: products.featured,
      publicationStatus: products.publicationStatus,
      requiresReview: products.requiresReview,
      reviewReason: products.reviewReason,
      possibleDuplicate: products.possibleDuplicate,
      duplicateGroup: products.duplicateGroup,
      duplicateDecision: products.duplicateDecision,
      canonicalProductId: products.canonicalProductId,
      sourceStatus: products.status,
      sourcePage: products.sourcePage,
      sourceRow: products.sourceRow,
      availabilityStatus: products.availabilityStatus,
      originalReferenceCode: products.originalReferenceCode,
      modelCode: products.modelCode,
      application: products.application,
      compatibilityBrands: products.compatibilityBrands,
      voltage: products.voltage,
      power: products.power,
      frequency: products.frequency,
      rpm: products.rpm,
      amperage: products.amperage,
      capacitance: products.capacitance,
      refrigerant: products.refrigerant,
      horsepower: products.horsepower,
      temperature: products.temperature,
      dimensions: products.dimensions,
      length: products.length,
      connectionSize: products.connectionSize,
      unitOfMeasure: products.unitOfMeasure,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .innerJoin(families, eq(products.familyId, families.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(eq(products.id, id))
    .limit(1);
  if (!product) throw new Error("CATALOG_PRODUCT_NOT_FOUND");
  const [stockRows, mediaRows, prices, history, auditHistory] = await Promise.all([
    db
      .select({
        onHand: sql<string>`sum(${inventoryBalances.onHand})`,
        reserved: sql<string>`sum(${inventoryBalances.reserved})`,
        minimum: sql<string>`case when count(${inventoryBalances.minimumStock}) = 0 then null else sum(${inventoryBalances.minimumStock}) end`,
        locations: count(),
      })
      .from(inventoryBalances)
      .where(eq(inventoryBalances.productId, id)),
    db
      .select({
        assetId: mediaAssets.id,
        primaryUrl: mediaAssets.publicUrl,
        altText: mediaAssets.altText,
        slot: mediaAssetUsages.slot,
        sortOrder: mediaAssetUsages.sortOrder,
      })
      .from(mediaAssetUsages)
      .innerJoin(mediaAssets, eq(mediaAssetUsages.assetId, mediaAssets.id))
      .where(
        and(
          eq(mediaAssetUsages.entityType, "product"),
          eq(mediaAssetUsages.entityId, id),
          eq(mediaAssets.status, "ACTIVE"),
          isNull(mediaAssets.deletedAt),
        ),
      )
      .orderBy(
        sql`case when ${mediaAssetUsages.slot} = 'primary' then 0 else 1 end`,
        asc(mediaAssetUsages.sortOrder),
        asc(mediaAssets.createdAt),
      ),
    includePricing
      ? db
          .select()
          .from(productPrices)
          .where(eq(productPrices.productId, id))
          .orderBy(desc(productPrices.createdAt))
      : Promise.resolve([]),
    includePricing
      ? db
          .select()
          .from(priceHistory)
          .where(eq(priceHistory.productId, id))
          .orderBy(desc(priceHistory.createdAt))
          .limit(50)
      : Promise.resolve([]),
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        actorId: auditLogs.actorId,
        createdAt: auditLogs.createdAt,
        before: auditLogs.before,
        after: auditLogs.after,
      })
      .from(auditLogs)
      .where(and(eq(auditLogs.entityType, "product"), eq(auditLogs.entityId, id)))
      .orderBy(desc(auditLogs.createdAt))
      .limit(50),
  ]);
  const stockRow = stockRows[0];
  const stock = stockView({
    onHand: stockRow?.onHand == null ? null : Number(stockRow.onHand),
    reserved: stockRow?.reserved == null ? null : Number(stockRow.reserved),
    minimum: stockRow?.minimum == null ? null : Number(stockRow.minimum),
    locations: Number(stockRow?.locations ?? 0),
  });
  return {
    sourceIdentity: {
      sku: product.sku,
      originalName: product.originalName,
      normalizedName: product.normalizedName,
      categoryId: product.categoryId,
      familyId: product.familyId,
      brandId: product.brandId,
      sourceStatus: product.sourceStatus,
      sourcePage: product.sourcePage,
      sourceRow: product.sourceRow,
    },
    editorialData: {
      commercialName: product.commercialName,
      editorialDescription: product.editorialDescription,
      featured: product.featured,
    },
    technicalData: {
      productType: product.productType,
      originalReferenceCode: product.originalReferenceCode,
      modelCode: product.modelCode,
      application: product.application,
      compatibilityBrands: product.compatibilityBrands,
      voltage: product.voltage,
      power: product.power,
      frequency: product.frequency,
      rpm: product.rpm,
      amperage: product.amperage,
      capacitance: product.capacitance,
      refrigerant: product.refrigerant,
      horsepower: product.horsepower,
      temperature: product.temperature,
      dimensions: product.dimensions,
      length: product.length,
      connectionSize: product.connectionSize,
      unitOfMeasure: product.unitOfMeasure,
    },
    taxonomy: {
      category: { id: product.categoryId, name: product.categoryName },
      family: { id: product.familyId, name: product.familyName },
      brand: product.brandId ? { id: product.brandId, name: product.brandName } : null,
      editorial: {
        categoryId: product.editorialCategoryId,
        familyId: product.editorialFamilyId,
        brandId: product.editorialBrandId,
      },
    },
    publication: {
      status: product.publicationStatus,
      statusLabel:
        publicationStatusLabels[
          product.publicationStatus as keyof typeof publicationStatusLabels
        ] ?? "Estado editorial",
      workflowState: getEditorialWorkflowState(product),
      requiresReview: product.requiresReview,
      reviewReason: product.reviewReason,
    },
    duplicateInformation: {
      possibleDuplicate: product.possibleDuplicate,
      duplicateGroup: product.duplicateGroup,
      decision: product.duplicateDecision,
      canonicalProductId: product.canonicalProductId,
    },
    stockSummary: stock,
    media: mediaRows.map((row) => ({
      primaryUrl: row.primaryUrl || `/api/media/${row.assetId}`,
      altText: row.altText,
      assetId: row.assetId,
      slot: row.slot,
      sortOrder: row.sortOrder,
    })),
    pricing: includePricing ? prices : null,
    priceHistory: includePricing ? history : null,
    auditHistory,
  };
}
