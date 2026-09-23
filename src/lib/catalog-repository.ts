import { and, asc, count, desc, eq, ilike, inArray, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { brands, categories, families, productPrices, productRelations, products } from "@/db/schema";
import { getPublishedMediaForEntities } from "@/lib/media-repository";
import { getActiveRetailPrices } from "@/lib/pricing-repository";
import { mapCatalogProductRow, type CatalogProductSourceRow } from "@/lib/catalog-view-model";
import { invalidateRuntimeCache, withRuntimeCache } from "@/lib/runtime-cache";
import type { Product } from "@/types/product";
import type { ProductSort } from "@/lib/catalog";

export const DEFAULT_CATALOG_PAGE_SIZE = 24;
export const MAX_CATALOG_PAGE_SIZE = 48;
export type CatalogQuery = {
  query?: string;
  categorySlug?: string;
  familySlug?: string;
  brandSlug?: string;
  status?: string;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
  publicOnly?: boolean;
};
export type CatalogCategory = { id: string; name: string; slug: string; productCount: number };
export type CatalogFamily = { id: string; categoryId: string; name: string; slug: string; productCount: number };
export type CatalogBrand = { id: string; name: string; slug: string; productCount: number };
export type CatalogPage = { products: Product[]; total: number; page: number; pageSize: number; totalPages: number };
type CatalogJoinRow = CatalogProductSourceRow & { category: { id: string; name: string; slug: string }; family: { id: string; name: string; slug: string }; brand: { id: string; name: string; slug: string } | null };

function normalizePagination(query: CatalogQuery) {
  return { page: Math.max(1, Math.floor(query.page ?? 1)), pageSize: Math.min(MAX_CATALOG_PAGE_SIZE, Math.max(1, Math.floor(query.pageSize ?? DEFAULT_CATALOG_PAGE_SIZE))) };
}

export function publicConditions() {
  return [eq(products.publicationStatus, "published"), or(eq(products.requiresReview, false), isNull(products.requiresReview))!, or(eq(products.possibleDuplicate, false), isNull(products.possibleDuplicate))!, sql`lower(${products.status}) in ('activo', 'active')`];
}

function buildConditions(query: CatalogQuery, publicOnly = query.publicOnly !== false) {
  const conditions: SQL[] = publicOnly ? [...publicConditions()] : [];
  const search = query.query?.trim();
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(or(ilike(products.sku, pattern), ilike(products.originalName, pattern), ilike(products.normalizedName, pattern), ilike(products.commercialName, pattern), ilike(products.productType, pattern), ilike(products.modelCode, pattern), ilike(products.application, pattern), ilike(products.refrigerant, pattern), ilike(products.voltage, pattern), ilike(products.power, pattern), ilike(products.capacitance, pattern), ilike(products.dimensions, pattern), ilike(products.length, pattern), ilike(products.connectionSize, pattern), ilike(categories.name, pattern), ilike(families.name, pattern), ilike(brands.name, pattern))!);
  }
  if (query.categorySlug) conditions.push(eq(categories.slug, query.categorySlug));
  if (query.familySlug) conditions.push(eq(families.slug, query.familySlug));
  if (query.brandSlug) conditions.push(eq(brands.slug, query.brandSlug));
  if (query.status === "out-of-stock") conditions.push(eq(products.availabilityStatus, "out_of_stock"));
  else if (query.status === "on-request") conditions.push(eq(products.availabilityStatus, "on_request"));
  return conditions.length ? and(...conditions) : undefined;
}

function catalogSelection() {
  return { product: { id: products.id, sku: products.sku, slug: products.slug, originalName: products.originalName, normalizedName: products.normalizedName, commercialName: products.commercialName, featured: products.featured, productType: products.productType, compatibilityBrands: products.compatibilityBrands, modelCode: products.modelCode, application: products.application, voltage: products.voltage, power: products.power, frequency: products.frequency, rpm: products.rpm, amperage: products.amperage, capacitance: products.capacitance, refrigerant: products.refrigerant, horsepower: products.horsepower, temperature: products.temperature, dimensions: products.dimensions, length: products.length, connectionSize: products.connectionSize, unitOfMeasure: products.unitOfMeasure, status: products.status, publicationStatus: products.publicationStatus, availabilityStatus: products.availabilityStatus, editorialDescription: products.editorialDescription }, category: { id: categories.id, name: categories.name, slug: categories.slug }, family: { id: families.id, name: families.name, slug: families.slug }, brand: { id: brands.id, name: brands.name, slug: brands.slug } };
}

function effectiveCategoryJoin() { return or(eq(products.editorialCategoryId, categories.id), and(isNull(products.editorialCategoryId), eq(products.categoryId, categories.id)))!; }
function effectiveFamilyJoin() { return or(eq(products.editorialFamilyId, families.id), and(isNull(products.editorialFamilyId), eq(products.familyId, families.id)))!; }
function effectiveBrandJoin() { return or(eq(products.editorialBrandId, brands.id), and(isNull(products.editorialBrandId), eq(products.brandId, brands.id)))!; }
function joinBase(db: ReturnType<typeof getDb>) { return db.select(catalogSelection()).from(products).innerJoin(categories, effectiveCategoryJoin()).innerJoin(families, effectiveFamilyJoin()).leftJoin(brands, effectiveBrandJoin()); }

async function mapRows(rows: CatalogJoinRow[]) {
  const ids = rows.map((row) => row.product.id);
  const [media, prices] = await Promise.all([getPublishedMediaForEntities("product", ids), getActiveRetailPrices(ids)]);
  return rows.map((row) => {
    const price = prices.get(row.product.id);
    return mapCatalogProductRow({ ...row, product: { ...row.product, images: media.get(row.product.id) ?? [], price: price?.amount ?? null, priceCurrency: price?.currency ?? null } });
  });
}

function currentPriceExpression() {
  return sql`(select min(${productPrices.amount}) from ${productPrices} where ${productPrices.productId} = ${products.id} and ${productPrices.priceType} = 'RETAIL' and ${productPrices.active} = true and ${productPrices.status} = 'ACTIVE' and ${productPrices.validFrom} <= now() and (${productPrices.validUntil} is null or ${productPrices.validUntil} > now()))`;
}

function orderFor(sort: ProductSort | undefined) {
  switch (sort) {
    case "availability":
      return [sql`case ${products.availabilityStatus} when 'in_stock' then 0 when 'low_stock' then 1 when 'on_request' then 2 when 'unknown' then 3 when 'out_of_stock' then 4 else 5 end`, asc(products.normalizedName), asc(products.sku)];
    case "price-asc":
      return [sql`${currentPriceExpression()} is null`, asc(currentPriceExpression()), asc(products.normalizedName), asc(products.sku)];
    case "price-desc":
      return [sql`${currentPriceExpression()} is null`, desc(currentPriceExpression()), asc(products.normalizedName), asc(products.sku)];
    case "updated":
      return [desc(products.updatedAt), asc(products.normalizedName), asc(products.sku)];
    case "name-asc":
    case "relevance":
    case "consulted":
    default:
      return [asc(products.normalizedName), asc(products.sku)];
  }
}

export async function getCatalogProducts(query: CatalogQuery = {}): Promise<CatalogPage> {
  const db = getDb();
  const { page, pageSize } = normalizePagination(query);
  const where = buildConditions(query);
  const [rows, totalRows] = await Promise.all([
    joinBase(db).where(where).orderBy(...orderFor(query.sort)).limit(pageSize).offset((page - 1) * pageSize) as unknown as Promise<CatalogJoinRow[]>,
    db.select({ total: count(products.id) }).from(products).innerJoin(categories, effectiveCategoryJoin()).innerJoin(families, effectiveFamilyJoin()).leftJoin(brands, effectiveBrandJoin()).where(where),
  ]);
  const totalCount = Number(totalRows[0]?.total ?? 0);
  return { products: await mapRows(rows), total: totalCount, page, pageSize, totalPages: Math.max(1, Math.ceil(totalCount / pageSize)) };
}

export function catalogSlugCandidates(rawSlug: string) {
  const candidates = new Set<string>();
  let current = rawSlug;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    candidates.add(current);
    const repaired = current.replace(/\u00c2\u00b5/g, "\u00b5");
    candidates.add(repaired);
    try {
      const decoded = decodeURIComponent(current);
      if (decoded === current) break;
      current = decoded;
    } catch {
      break;
    }
  }
  return [...candidates];
}

export async function getCatalogProductBySlug(slug: string, publicOnly = true) {
  const [row] = await joinBase(getDb()).where(and(inArray(products.slug, catalogSlugCandidates(slug)), ...(publicOnly ? publicConditions() : []))).limit(1) as unknown as CatalogJoinRow[];
  return row ? (await mapRows([row]))[0] : undefined;
}

export async function getCatalogProductBySku(sku: string, publicOnly = true) {
  const normalizedSku = sku.trim();
  if (!normalizedSku) return undefined;
  const [row] = await joinBase(getDb()).where(and(sql`lower(${products.sku}) = lower(${normalizedSku})`, ...(publicOnly ? publicConditions() : []))).limit(1) as unknown as CatalogJoinRow[];
  return row ? (await mapRows([row]))[0] : undefined;
}

export async function getCatalogProductsByIds(ids: string[], publicOnly = true) {
  if (!ids.length) return [];
  const rows = await joinBase(getDb()).where(and(inArray(products.id, ids), ...(publicOnly ? publicConditions() : []))) as unknown as CatalogJoinRow[];
  return mapRows(rows);
}

async function queryCatalogCategories(publicOnly: boolean): Promise<CatalogCategory[]> {
  const rows = await getDb().select({ id: categories.id, name: categories.name, slug: categories.slug, productCount: count(products.id) }).from(categories).leftJoin(products, and(effectiveCategoryJoin(), ...(publicOnly ? publicConditions() : []))).where(eq(categories.active, true)).groupBy(categories.id, categories.name, categories.slug).orderBy(asc(categories.name));
  return rows.map((row) => ({ ...row, productCount: Number(row.productCount) }));
}

export async function getCatalogCategories(publicOnly = true): Promise<CatalogCategory[]> {
  if (!publicOnly) return queryCatalogCategories(false);
  return withRuntimeCache("catalog:categories:public", () => queryCatalogCategories(true));
}

export async function getCatalogCategoryBySlug(slug: string) {
  return (await getCatalogCategories()).find((category) => category.slug === slug);
}

async function queryCatalogFamilies(categoryId: string | undefined, publicOnly: boolean): Promise<CatalogFamily[]> {
  const rows = await getDb().select({ id: families.id, categoryId: families.categoryId, name: families.name, slug: families.slug, productCount: count(products.id) }).from(families).leftJoin(products, and(effectiveFamilyJoin(), ...(publicOnly ? publicConditions() : []))).where(categoryId ? eq(families.categoryId, categoryId) : undefined).groupBy(families.id, families.categoryId, families.name, families.slug).orderBy(asc(families.name));
  return rows.map((row) => ({ ...row, productCount: Number(row.productCount) }));
}

export async function getCatalogFamilies(categoryId?: string, publicOnly = true) {
  if (!publicOnly) return queryCatalogFamilies(categoryId, false);
  return withRuntimeCache(`catalog:families:public:${categoryId ?? "all"}`, () => queryCatalogFamilies(categoryId, true));
}

async function queryCatalogBrands(publicOnly: boolean, categoryId?: string): Promise<CatalogBrand[]> {
  const rows = categoryId
    ? await getDb().select({ id: brands.id, name: brands.name, slug: brands.slug, productCount: count(products.id) }).from(brands).innerJoin(categories, eq(categories.id, categoryId)).leftJoin(products, and(effectiveBrandJoin(), effectiveCategoryJoin(), ...(publicOnly ? publicConditions() : []))).where(eq(brands.active, true)).groupBy(brands.id, brands.name, brands.slug).orderBy(asc(brands.name))
    : await getDb().select({ id: brands.id, name: brands.name, slug: brands.slug, productCount: count(products.id) }).from(brands).leftJoin(products, and(effectiveBrandJoin(), ...(publicOnly ? publicConditions() : []))).where(eq(brands.active, true)).groupBy(brands.id, brands.name, brands.slug).orderBy(asc(brands.name));
  return rows.map((row) => ({ ...row, productCount: Number(row.productCount) }));
}

export async function getCatalogBrands(publicOnly = true) {
  if (!publicOnly) return queryCatalogBrands(false);
  return withRuntimeCache("catalog:brands:public", () => queryCatalogBrands(true));
}

export async function getCatalogBrandsForCategory(categoryId: string, publicOnly = true) {
  if (!publicOnly) return queryCatalogBrands(false, categoryId);
  return withRuntimeCache(`catalog:brands:public:category:${categoryId}`, () => queryCatalogBrands(true, categoryId));
}

export function clearPublicCatalogRuntimeCache() { invalidateRuntimeCache("catalog:"); }

export async function getCatalogRelatedProducts(productId: string, familyId?: string) {
  const db = getDb();
  const conditions = publicConditions();
  const explicitRows = await db.select(catalogSelection()).from(productRelations).innerJoin(products, eq(productRelations.relatedProductId, products.id)).innerJoin(categories, effectiveCategoryJoin()).innerJoin(families, effectiveFamilyJoin()).leftJoin(brands, effectiveBrandJoin()).where(and(eq(productRelations.productId, productId), eq(productRelations.validated, true), ...conditions)).limit(4) as unknown as CatalogJoinRow[];
  if (explicitRows.length) return mapRows(explicitRows);
  if (!familyId) return [];
  const relatedRows = await joinBase(db).where(and(or(eq(products.editorialFamilyId, familyId), and(isNull(products.editorialFamilyId), eq(products.familyId, familyId)))!, ne(products.id, productId), ...conditions)).orderBy(asc(products.normalizedName)).limit(4) as unknown as CatalogJoinRow[];
  return mapRows(relatedRows);
}

export async function getCatalogStats(publicOnly = false) {
  const [row] = await getDb().select({ total: count(products.id) }).from(products).where(publicOnly ? and(...publicConditions()) : undefined);
  return { totalProducts: Number(row?.total ?? 0) };
}

export function makeCatalogSearchPattern(value: string) { return sql`%${value.trim()}%`; }

