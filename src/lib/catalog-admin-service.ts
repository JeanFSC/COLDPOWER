import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, brands, categories, families, inventoryBalances, mediaAssetUsages, mediaAssets, priceHistory, productPrices, products } from "@/db/schema";
import { publicationStatusLabels, stockState, type CatalogApiFilters } from "@/lib/catalog-admin-contract";
import { getEditorialWorkflowState } from "@/lib/publication-governance";

function effectiveCategoryJoin() { return or(eq(products.editorialCategoryId, categories.id), and(isNull(products.editorialCategoryId), eq(products.categoryId, categories.id)))!; }
function effectiveFamilyJoin() { return or(eq(products.editorialFamilyId, families.id), and(isNull(products.editorialFamilyId), eq(products.familyId, families.id)))!; }
function effectiveBrandJoin() { return or(eq(products.editorialBrandId, brands.id), and(isNull(products.editorialBrandId), eq(products.brandId, brands.id)))!; }
function conditions(filters: CatalogApiFilters) {
  const result: SQL[] = [];
  const query = filters.query?.trim();
  if (query) { const pattern = `%${query}%`; result.push(or(ilike(products.sku, pattern), ilike(products.normalizedName, pattern), ilike(products.commercialName, pattern), ilike(products.originalName, pattern), ilike(categories.name, pattern), ilike(families.name, pattern), ilike(brands.name, pattern))!); }
  if (filters.sku) result.push(ilike(products.sku, `%${filters.sku.trim()}%`));
  if (filters.name) { const pattern = `%${filters.name.trim()}%`; result.push(or(ilike(products.commercialName, pattern), ilike(products.normalizedName, pattern), ilike(products.originalName, pattern))!); }
  if (filters.category) result.push(eq(categories.slug, filters.category));
  if (filters.categoryId) result.push(or(eq(products.editorialCategoryId, filters.categoryId), eq(products.categoryId, filters.categoryId))!);
  if (filters.family) result.push(eq(families.slug, filters.family));
  if (filters.familyId) result.push(or(eq(products.editorialFamilyId, filters.familyId), eq(products.familyId, filters.familyId))!);
  if (filters.brand) result.push(eq(brands.slug, filters.brand));
  if (filters.brandId) result.push(or(eq(products.editorialBrandId, filters.brandId), eq(products.brandId, filters.brandId))!);
  if (filters.publicationStatus) result.push(eq(products.publicationStatus, filters.publicationStatus));
  if (filters.requiresReview !== undefined) result.push(eq(products.requiresReview, filters.requiresReview));
  if (filters.possibleDuplicate !== undefined) result.push(eq(products.possibleDuplicate, filters.possibleDuplicate));
  if (filters.confidence) result.push(ilike(products.normalizationConfidence, `%${filters.confidence.trim()}%`));
  if (filters.sourceStatus) result.push(ilike(products.status, `%${filters.sourceStatus.trim()}%`));
  return result.length ? and(...result) : undefined;
}

function stockView(row: { onHand: number | null; reserved: number | null; minimum: number | null; locations: number }) {
  const state = stockState(row);
  return { state, onHand: row.onHand, reserved: row.reserved, available: row.onHand === null || row.reserved === null ? null : row.onHand - row.reserved, minimum: row.minimum, locations: row.locations };
}

export async function getAdminCatalogPage(filters: CatalogApiFilters = {}) {
  const db = getDb();
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(filters.pageSize ?? 12)));
  const where = conditions(filters);
  const [rows, totalRows, statusRows, reviewRows, duplicateRows, brandCountRows, categoryCountRows, facetRows] = await Promise.all([
    db.select({ id: products.id, sku: products.sku, slug: products.slug, name: products.commercialName, normalizedName: products.normalizedName, originalName: products.originalName, commercialName: products.commercialName, featured: products.featured, productType: products.productType, category: categories.name, categoryId: categories.id, categorySlug: categories.slug, family: families.name, familyId: families.id, familySlug: families.slug, brand: brands.name, brandId: brands.id, publicationStatus: products.publicationStatus, requiresReview: products.requiresReview, reviewReason: products.reviewReason, possibleDuplicate: products.possibleDuplicate, duplicateGroup: products.duplicateGroup, duplicateDecision: products.duplicateDecision, canonicalProductId: products.canonicalProductId, normalizationConfidence: products.normalizationConfidence, sourceStatus: products.status, sourcePage: products.sourcePage, sourceRow: products.sourceRow, editorialDescription: products.editorialDescription }).from(products).innerJoin(categories, effectiveCategoryJoin()).innerJoin(families, effectiveFamilyJoin()).leftJoin(brands, effectiveBrandJoin()).where(where).orderBy(desc(products.requiresReview), asc(products.normalizedName), asc(products.sku)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ total: count(products.id) }).from(products).innerJoin(categories, effectiveCategoryJoin()).innerJoin(families, effectiveFamilyJoin()).leftJoin(brands, effectiveBrandJoin()).where(where),
    db.select({ status: products.publicationStatus, count: count(products.id) }).from(products).groupBy(products.publicationStatus),
    db.select({ count: count(products.id) }).from(products).where(eq(products.requiresReview, true)),
    db.select({ count: count(products.id) }).from(products).where(and(isNull(products.canonicalProductId), eq(products.possibleDuplicate, true), eq(products.duplicateDecision, "pending"))),
    db.select({ count: sql<string>`count(distinct coalesce(${products.editorialBrandId}, ${products.brandId}))` }).from(products).where(sql`coalesce(${products.editorialBrandId}, ${products.brandId}) is not null`),
    db.select({ count: sql<string>`count(distinct coalesce(${products.editorialCategoryId}, ${products.categoryId}))` }).from(products),
    Promise.all([
      db.select({ id: categories.id, name: categories.name }).from(categories).where(eq(categories.active, true)).orderBy(categories.name),
      db.select({ id: families.id, name: families.name }).from(families).where(eq(families.active, true)).orderBy(families.name),
      db.select({ id: brands.id, name: brands.name }).from(brands).where(eq(brands.active, true)).orderBy(brands.name),
      db.selectDistinct({ value: products.publicationStatus }).from(products).orderBy(products.publicationStatus),
      db.selectDistinct({ value: products.status }).from(products).orderBy(products.status),
      db.selectDistinct({ value: products.normalizationConfidence }).from(products).where(sql`${products.normalizationConfidence} is not null`).orderBy(products.normalizationConfidence),
    ]),
  ]);
  const productIds = rows.map((row) => row.id);
  const [stockRows, mediaRows] = await Promise.all([
    productIds.length ? db.select({ productId: inventoryBalances.productId, onHand: sql<string>`sum(${inventoryBalances.onHand})`, reserved: sql<string>`sum(${inventoryBalances.reserved})`, minimum: sql<string>`case when count(${inventoryBalances.minimumStock}) = 0 then null else sum(${inventoryBalances.minimumStock}) end`, locations: count() }).from(inventoryBalances).where(inArray(inventoryBalances.productId, productIds)).groupBy(inventoryBalances.productId) : Promise.resolve([]),
    productIds.length ? db.select({ productId: mediaAssetUsages.entityId, assetId: mediaAssets.id, url: mediaAssets.publicUrl, altText: mediaAssets.altText, sortOrder: mediaAssetUsages.sortOrder, slot: mediaAssetUsages.slot }).from(mediaAssetUsages).innerJoin(mediaAssets, eq(mediaAssetUsages.assetId, mediaAssets.id)).where(and(eq(mediaAssetUsages.entityType, "product"), inArray(mediaAssetUsages.entityId, productIds), eq(mediaAssets.status, "ACTIVE"), isNull(mediaAssets.deletedAt))).orderBy(sql`case when ${mediaAssetUsages.slot} = 'primary' then 0 else 1 end`, asc(mediaAssetUsages.sortOrder), asc(mediaAssets.createdAt)) : Promise.resolve([]),
  ]);
  const stockMap = new Map(stockRows.map((row) => [row.productId, stockView({ onHand: row.onHand === null ? null : Number(row.onHand), reserved: row.reserved === null ? null : Number(row.reserved), minimum: row.minimum === null ? null : Number(row.minimum), locations: Number(row.locations) })]));
  const mediaMap = new Map<string, { primaryUrl: string; altText: string | null; assetId: string }>();
  for (const row of mediaRows) if (!mediaMap.has(row.productId)) mediaMap.set(row.productId, { primaryUrl: row.url || `/api/media/${row.assetId}`, altText: row.altText, assetId: row.assetId });
  const items = rows.map((row) => ({ ...row, name: row.name || row.normalizedName || row.originalName, publicationStatusLabel: publicationStatusLabels[row.publicationStatus as keyof typeof publicationStatusLabels] ?? "Estado editorial", editorialWorkflowState: getEditorialWorkflowState(row), stock: stockMap.get(row.id) ?? stockView({ onHand: null, reserved: null, minimum: null, locations: 0 }), media: mediaMap.get(row.id) ?? null }));
  const totalItems = Number(totalRows[0]?.total ?? 0);
  const [categoriesFacet, familiesFacet, brandsFacet, publicationStatuses, sourceStatuses, confidenceLevels] = facetRows;
  const queues = { totalProducts: Number((await db.select({ count: count(products.id) }).from(products))[0]?.count ?? 0), publishedProducts: Number(statusRows.find((row) => row.status === "published")?.count ?? 0), draftProducts: Number(statusRows.find((row) => row.status === "draft")?.count ?? 0), hiddenProducts: Number(statusRows.find((row) => row.status === "hidden")?.count ?? 0), reviewProducts: Number(statusRows.find((row) => row.status === "review")?.count ?? 0), duplicateProducts: Number(duplicateRows[0]?.count ?? 0), productsRequiringReview: Number(reviewRows[0]?.count ?? 0), totalBrands: Number(brandCountRows[0]?.count ?? 0), totalCategories: Number(categoryCountRows[0]?.count ?? 0) };
  return { items, rows: items, page, pageSize, totalItems, total: totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)), queues, facets: { categories: categoriesFacet, families: familiesFacet, brands: brandsFacet, publicationStatuses: publicationStatuses.map((row) => row.value), sourceStatuses: sourceStatuses.map((row) => row.value), confidenceLevels: confidenceLevels.map((row) => row.value).filter(Boolean) } };
}

export async function getAdminCatalogProductDetail(id: string, includePricing: boolean) {
  const db = getDb();
  const [product] = await db.select({ id: products.id, sku: products.sku, slug: products.slug, originalName: products.originalName, normalizedName: products.normalizedName, commercialName: products.commercialName, productType: products.productType, categoryId: products.categoryId, categoryName: categories.name, familyId: products.familyId, familyName: families.name, brandId: products.brandId, brandName: brands.name, editorialCategoryId: products.editorialCategoryId, editorialFamilyId: products.editorialFamilyId, editorialBrandId: products.editorialBrandId, editorialDescription: products.editorialDescription, featured: products.featured, publicationStatus: products.publicationStatus, requiresReview: products.requiresReview, reviewReason: products.reviewReason, possibleDuplicate: products.possibleDuplicate, duplicateGroup: products.duplicateGroup, duplicateDecision: products.duplicateDecision, canonicalProductId: products.canonicalProductId, sourceStatus: products.status, sourcePage: products.sourcePage, sourceRow: products.sourceRow, availabilityStatus: products.availabilityStatus }).from(products).innerJoin(categories, eq(products.categoryId, categories.id)).innerJoin(families, eq(products.familyId, families.id)).leftJoin(brands, eq(products.brandId, brands.id)).where(eq(products.id, id)).limit(1);
  if (!product) throw new Error("CATALOG_PRODUCT_NOT_FOUND");
  const [stockRows, mediaRows, prices, history, auditHistory] = await Promise.all([
    db.select({ onHand: sql<string>`sum(${inventoryBalances.onHand})`, reserved: sql<string>`sum(${inventoryBalances.reserved})`, minimum: sql<string>`case when count(${inventoryBalances.minimumStock}) = 0 then null else sum(${inventoryBalances.minimumStock}) end`, locations: count() }).from(inventoryBalances).where(eq(inventoryBalances.productId, id)),
    db.select({ assetId: mediaAssets.id, primaryUrl: mediaAssets.publicUrl, altText: mediaAssets.altText, slot: mediaAssetUsages.slot, sortOrder: mediaAssetUsages.sortOrder }).from(mediaAssetUsages).innerJoin(mediaAssets, eq(mediaAssetUsages.assetId, mediaAssets.id)).where(and(eq(mediaAssetUsages.entityType, "product"), eq(mediaAssetUsages.entityId, id), eq(mediaAssets.status, "ACTIVE"), isNull(mediaAssets.deletedAt))).orderBy(sql`case when ${mediaAssetUsages.slot} = 'primary' then 0 else 1 end`, asc(mediaAssetUsages.sortOrder), asc(mediaAssets.createdAt)),
    includePricing ? db.select().from(productPrices).where(eq(productPrices.productId, id)).orderBy(desc(productPrices.createdAt)) : Promise.resolve([]),
    includePricing ? db.select().from(priceHistory).where(eq(priceHistory.productId, id)).orderBy(desc(priceHistory.createdAt)).limit(50) : Promise.resolve([]),
    db.select({ id: auditLogs.id, action: auditLogs.action, actorId: auditLogs.actorId, createdAt: auditLogs.createdAt, before: auditLogs.before, after: auditLogs.after }).from(auditLogs).where(and(eq(auditLogs.entityType, "product"), eq(auditLogs.entityId, id))).orderBy(desc(auditLogs.createdAt)).limit(50),
  ]);
  const stockRow = stockRows[0];
  const stock = stockView({ onHand: stockRow?.onHand == null ? null : Number(stockRow.onHand), reserved: stockRow?.reserved == null ? null : Number(stockRow.reserved), minimum: stockRow?.minimum == null ? null : Number(stockRow.minimum), locations: Number(stockRow?.locations ?? 0) });
  return {
    sourceIdentity: { sku: product.sku, originalName: product.originalName, normalizedName: product.normalizedName, categoryId: product.categoryId, familyId: product.familyId, brandId: product.brandId, sourceStatus: product.sourceStatus, sourcePage: product.sourcePage, sourceRow: product.sourceRow },
    editorialData: { commercialName: product.commercialName, editorialDescription: product.editorialDescription, featured: product.featured },
    taxonomy: { category: { id: product.categoryId, name: product.categoryName }, family: { id: product.familyId, name: product.familyName }, brand: product.brandId ? { id: product.brandId, name: product.brandName } : null, editorial: { categoryId: product.editorialCategoryId, familyId: product.editorialFamilyId, brandId: product.editorialBrandId } },
    publication: { status: product.publicationStatus, statusLabel: publicationStatusLabels[product.publicationStatus as keyof typeof publicationStatusLabels] ?? "Estado editorial", workflowState: getEditorialWorkflowState(product), requiresReview: product.requiresReview, reviewReason: product.reviewReason },
    duplicateInformation: { possibleDuplicate: product.possibleDuplicate, duplicateGroup: product.duplicateGroup, decision: product.duplicateDecision, canonicalProductId: product.canonicalProductId },
    stockSummary: stock,
    media: mediaRows.map((row) => ({ primaryUrl: row.primaryUrl || `/api/media/${row.assetId}`, altText: row.altText, assetId: row.assetId, slot: row.slot, sortOrder: row.sortOrder })),
    pricing: includePricing ? prices : null,
    priceHistory: includePricing ? history : null,
    auditHistory,
  };
}
