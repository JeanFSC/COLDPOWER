import { and, asc, count, countDistinct, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, brands, categories, families, products } from "@/db/schema";
import type { Permission } from "@/lib/roles";

export const taxonomyEntities = ["categories", "families", "brands"] as const;
export type TaxonomyEntity = (typeof taxonomyEntities)[number];
export type TaxonomyFilters = { entity: TaxonomyEntity; query?: string; active?: boolean; categoryId?: string; page?: number; pageSize?: number };
export type TaxonomyItem = { id: string; name: string; slug: string; active: boolean; categoryId: string | null; categoryName: string | null; productCount: number; publishedProductCount: number; reviewProductCount: number; createdAt: Date; updatedAt: Date };
export type TaxonomyPage = { entity: TaxonomyEntity; items: TaxonomyItem[]; page: number; pageSize: number; totalItems: number; totalPages: number; metrics: { total: number; active: number; inactive: number; used: number; unused: number; productsWithoutBrand: number } };
export class TaxonomyInvalidFilterError extends Error { constructor() { super("TAXONOMY_INVALID_FILTER"); this.name = "TaxonomyInvalidFilterError"; } }

export function isTaxonomyEntity(value: string | null | undefined): value is TaxonomyEntity { return Boolean(value && taxonomyEntities.includes(value as TaxonomyEntity)); }
export function slugifyTaxonomy(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120); }
export function taxonomyLabel(entity: TaxonomyEntity) { return entity === "categories" ? "Categorías" : entity === "families" ? "Familias" : "Marcas"; }
export function taxonomyPermission(entity: TaxonomyEntity): Permission { return entity === "categories" ? "catalog.category.manage" : entity === "families" ? "catalog.family.manage" : "catalog.brand.manage"; }
export function parseTaxonomyFilters(params: URLSearchParams): TaxonomyFilters { const entity = params.get("entity"); if (!isTaxonomyEntity(entity)) throw new TaxonomyInvalidFilterError(); const activeRaw = params.get("active"); if (activeRaw && activeRaw !== "true" && activeRaw !== "false") throw new TaxonomyInvalidFilterError(); const page = params.get("page") ? Number(params.get("page")) : undefined; const pageSize = params.get("pageSize") ? Number(params.get("pageSize")) : undefined; if ((page !== undefined && (!Number.isInteger(page) || page < 1)) || (pageSize !== undefined && (!Number.isInteger(pageSize) || pageSize < 1))) throw new TaxonomyInvalidFilterError(); return { entity, query: params.get("query")?.trim() || undefined, active: activeRaw === null ? undefined : activeRaw === "true", categoryId: params.get("categoryId")?.trim() || undefined, page, pageSize }; }

function conditionsFor(table: typeof categories | typeof families | typeof brands, filters: TaxonomyFilters) { const conditions: SQL[] = []; if (filters.query) { const pattern = `%${filters.query}%`; conditions.push(or(ilike(table.name, pattern), ilike(table.slug, pattern))!); } if (filters.active !== undefined) conditions.push(eq(table.active, filters.active)); return conditions; }
function normalizeCount(value: unknown) { return Number(value ?? 0); }
function effectiveCategoryJoin() { return or(eq(products.editorialCategoryId, categories.id), and(isNull(products.editorialCategoryId), eq(products.categoryId, categories.id)))!; }
function effectiveFamilyJoin() { return or(eq(products.editorialFamilyId, families.id), and(isNull(products.editorialFamilyId), eq(products.familyId, families.id)))!; }
function effectiveBrandJoin() { return or(eq(products.editorialBrandId, brands.id), and(isNull(products.editorialBrandId), eq(products.brandId, brands.id)))!; }
function effectiveProductWhere(entity: TaxonomyEntity, id: string) { return entity === "categories" ? or(eq(products.editorialCategoryId, id), and(isNull(products.editorialCategoryId), eq(products.categoryId, id)))! : entity === "families" ? or(eq(products.editorialFamilyId, id), and(isNull(products.editorialFamilyId), eq(products.familyId, id)))! : or(eq(products.editorialBrandId, id), and(isNull(products.editorialBrandId), eq(products.brandId, id)))!; }

export async function getTaxonomyPage(filters: TaxonomyFilters): Promise<TaxonomyPage> {
  const pageSize = Math.min(100, Math.max(1, Math.floor(filters.pageSize ?? 25)));
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const db = getDb();
  let items: TaxonomyItem[] = [];
  let totalItems = 0;
  let active = 0;
  let inactive = 0;
  let used = 0;

  if (filters.entity === "categories") {
    const where = conditionsFor(categories, filters);
    const [rows, total, activeRows, inactiveRows, usedRows] = await Promise.all([
      db.select({ id: categories.id, name: categories.name, slug: categories.slug, active: categories.active, createdAt: categories.createdAt, updatedAt: categories.updatedAt, productCount: countDistinct(products.id), publishedProductCount: sql<number>`count(distinct ${products.id}) filter (where ${products.publicationStatus} = 'published')`, reviewProductCount: sql<number>`count(distinct ${products.id}) filter (where ${products.publicationStatus} = 'review')` }).from(categories).leftJoin(products, effectiveCategoryJoin()).where(and(...where)).groupBy(categories.id).orderBy(asc(categories.name)).limit(pageSize).offset((page - 1) * pageSize),
      db.select({ value: count() }).from(categories).where(and(...where)),
      db.select({ value: count() }).from(categories).where(and(...where, eq(categories.active, true))),
      db.select({ value: count() }).from(categories).where(and(...where, eq(categories.active, false))),
      db.select({ value: countDistinct(categories.id) }).from(categories).innerJoin(products, effectiveCategoryJoin()).where(and(...where)),
    ]);
    items = rows.map((row) => ({ ...row, categoryId: null, categoryName: null, productCount: normalizeCount(row.productCount), publishedProductCount: normalizeCount(row.publishedProductCount), reviewProductCount: normalizeCount(row.reviewProductCount) }));
    totalItems = normalizeCount(total[0]?.value); active = normalizeCount(activeRows[0]?.value); inactive = normalizeCount(inactiveRows[0]?.value); used = normalizeCount(usedRows[0]?.value);
  }

  if (filters.entity === "families") {
    const where = conditionsFor(families, filters);
    if (filters.categoryId) where.push(eq(families.categoryId, filters.categoryId));
    const [rows, total, activeRows, inactiveRows, usedRows] = await Promise.all([
      db.select({ id: families.id, name: families.name, slug: families.slug, active: families.active, categoryId: families.categoryId, categoryName: categories.name, createdAt: families.createdAt, updatedAt: families.updatedAt, productCount: countDistinct(products.id), publishedProductCount: sql<number>`count(distinct ${products.id}) filter (where ${products.publicationStatus} = 'published')`, reviewProductCount: sql<number>`count(distinct ${products.id}) filter (where ${products.publicationStatus} = 'review')` }).from(families).innerJoin(categories, eq(categories.id, families.categoryId)).leftJoin(products, effectiveFamilyJoin()).where(and(...where)).groupBy(families.id, categories.name).orderBy(asc(families.name)).limit(pageSize).offset((page - 1) * pageSize),
      db.select({ value: count() }).from(families).where(and(...where)),
      db.select({ value: count() }).from(families).where(and(...where, eq(families.active, true))),
      db.select({ value: count() }).from(families).where(and(...where, eq(families.active, false))),
      db.select({ value: countDistinct(families.id) }).from(families).innerJoin(products, effectiveFamilyJoin()).where(and(...where)),
    ]);
    items = rows.map((row) => ({ ...row, productCount: normalizeCount(row.productCount), publishedProductCount: normalizeCount(row.publishedProductCount), reviewProductCount: normalizeCount(row.reviewProductCount) }));
    totalItems = normalizeCount(total[0]?.value); active = normalizeCount(activeRows[0]?.value); inactive = normalizeCount(inactiveRows[0]?.value); used = normalizeCount(usedRows[0]?.value);
  }

  if (filters.entity === "brands") {
    const where = conditionsFor(brands, filters);
    const [rows, total, activeRows, inactiveRows, usedRows] = await Promise.all([
      db.select({ id: brands.id, name: brands.name, slug: brands.slug, active: brands.active, createdAt: brands.createdAt, updatedAt: brands.updatedAt, productCount: countDistinct(products.id), publishedProductCount: sql<number>`count(distinct ${products.id}) filter (where ${products.publicationStatus} = 'published')`, reviewProductCount: sql<number>`count(distinct ${products.id}) filter (where ${products.publicationStatus} = 'review')` }).from(brands).leftJoin(products, effectiveBrandJoin()).where(and(...where)).groupBy(brands.id).orderBy(asc(brands.name)).limit(pageSize).offset((page - 1) * pageSize),
      db.select({ value: count() }).from(brands).where(and(...where)),
      db.select({ value: count() }).from(brands).where(and(...where, eq(brands.active, true))),
      db.select({ value: count() }).from(brands).where(and(...where, eq(brands.active, false))),
      db.select({ value: countDistinct(brands.id) }).from(brands).innerJoin(products, effectiveBrandJoin()).where(and(...where)),
    ]);
    items = rows.map((row) => ({ ...row, categoryId: null, categoryName: null, productCount: normalizeCount(row.productCount), publishedProductCount: normalizeCount(row.publishedProductCount), reviewProductCount: normalizeCount(row.reviewProductCount) }));
    totalItems = normalizeCount(total[0]?.value); active = normalizeCount(activeRows[0]?.value); inactive = normalizeCount(inactiveRows[0]?.value); used = normalizeCount(usedRows[0]?.value);
  }

  const [unbranded] = await db
    .select({ value: count(products.id) })
    .from(products)
    .where(and(isNull(products.brandId), isNull(products.editorialBrandId)));
  return { entity: filters.entity, items, page: Math.min(page, Math.max(1, Math.ceil(totalItems / pageSize))), pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)), metrics: { total: totalItems, active, inactive, used, unused: Math.max(0, totalItems - used), productsWithoutBrand: normalizeCount(unbranded?.value) } };
}

export async function getTaxonomyDetail(entity: TaxonomyEntity, id: string, page = 1, pageSize = 25) {
  const db = getDb();
  const safePage = Math.max(1, page);
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const [record, history] = await Promise.all([
    entity === "categories" ? db.select().from(categories).where(eq(categories.id, id)).limit(1).then(([row]) => row) : entity === "families" ? db.select().from(families).where(eq(families.id, id)).limit(1).then(([row]) => row) : db.select().from(brands).where(eq(brands.id, id)).limit(1).then(([row]) => row),
    db.select().from(auditLogs).where(and(eq(auditLogs.entityType, entity.slice(0, -1)), eq(auditLogs.entityId, id))).orderBy(desc(auditLogs.createdAt)).limit(100),
  ]);
  if (!record) return null;
  const productWhere = effectiveProductWhere(entity, id);
  const [productRows, productTotal] = await Promise.all([
    db.select({ id: products.id, sku: products.sku, name: products.normalizedName, slug: products.slug, status: products.status, publicationStatus: products.publicationStatus }).from(products).where(productWhere).orderBy(asc(products.normalizedName)).limit(safeSize).offset((safePage - 1) * safeSize),
    db.select({ value: count() }).from(products).where(productWhere),
  ]);
  const dependents = entity === "categories" ? await db.select().from(families).where(eq(families.categoryId, id)).orderBy(asc(families.name)) : [];
  return { entity: record, products: { items: productRows, page: safePage, pageSize: safeSize, totalItems: normalizeCount(productTotal[0]?.value), totalPages: Math.max(1, Math.ceil(normalizeCount(productTotal[0]?.value) / safeSize)) }, dependents, history };
}

export { categories, families, brands };
