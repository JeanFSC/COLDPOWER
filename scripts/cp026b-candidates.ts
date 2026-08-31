import { and, asc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { brands, categories, families, mediaAssetUsages, mediaAssets, products } from "@/db/schema";

async function main() {
const db = getDb();

const rows = await db
  .select({
    id: products.id,
    sku: products.sku,
    slug: products.slug,
    originalName: products.originalName,
    normalizedName: products.normalizedName,
    productType: products.productType,
    category: categories.name,
    categorySlug: categories.slug,
    family: families.name,
    familySlug: families.slug,
    brand: brands.name,
    sourceStatus: products.status,
    publicationStatus: products.publicationStatus,
    requiresReview: products.requiresReview,
    reviewReason: products.reviewReason,
    possibleDuplicate: products.possibleDuplicate,
    duplicateDecision: products.duplicateDecision,
    editorialDescription: products.editorialDescription,
    technicalFields: sql<string[]>`array_remove(array[${products.modelCode}, ${products.application}, ${products.voltage}, ${products.power}, ${products.frequency}, ${products.rpm}, ${products.amperage}, ${products.capacitance}, ${products.refrigerant}, ${products.horsepower}, ${products.temperature}, ${products.dimensions}, ${products.length}, ${products.connectionSize}], null)`,
    mediaId: mediaAssets.id,
    mediaUrl: mediaAssets.publicUrl,
  })
  .from(products)
  .innerJoin(categories, eq(products.categoryId, categories.id))
  .innerJoin(families, eq(products.familyId, families.id))
  .leftJoin(brands, eq(products.brandId, brands.id))
  .leftJoin(mediaAssetUsages, and(eq(mediaAssetUsages.entityType, "product"), eq(mediaAssetUsages.entityId, products.id), eq(mediaAssetUsages.slot, "primary")))
  .leftJoin(mediaAssets, and(eq(mediaAssets.id, mediaAssetUsages.assetId), eq(mediaAssets.status, "ACTIVE"), isNull(mediaAssets.deletedAt)))
  .where(and(
    eq(products.publicationStatus, "review"),
    sql`lower(${products.status}) in ('activo', 'active')`,
    or(eq(products.requiresReview, false), isNull(products.requiresReview))!,
    or(eq(products.possibleDuplicate, false), isNull(products.possibleDuplicate))!,
    or(
      ilike(categories.name, "%refriger%"),
      ilike(families.name, "%motor%"),
      ilike(families.name, "%ventil%"),
      ilike(products.originalName, "%motor%"),
      ilike(products.originalName, "%ventil%"),
      ilike(products.originalName, "%capacitor%"),
      ilike(products.originalName, "%tarjeta%"),
      ilike(families.name, "%capacitor%"),
      ilike(families.name, "%tarjeta%"),
    )!,
  ))
  .orderBy(asc(categories.name), asc(families.name), asc(products.normalizedName), asc(products.sku))
  .limit(Math.min(1500, Math.max(1, Number(process.argv[2] ?? "120"))));

console.log(JSON.stringify({
  total: rows.length,
  candidates: rows.map((row) => ({
    id: row.id,
    sku: row.sku,
    slug: row.slug,
    originalName: row.originalName,
    normalizedName: row.normalizedName,
    productType: row.productType,
    category: row.category,
    categorySlug: row.categorySlug,
    family: row.family,
    familySlug: row.familySlug,
    brand: row.brand,
    sourceStatus: row.sourceStatus,
    publicationStatus: row.publicationStatus,
    requiresReview: row.requiresReview,
    possibleDuplicate: row.possibleDuplicate,
    duplicateDecision: row.duplicateDecision,
    hasEditorialDescription: Boolean(row.editorialDescription?.trim()),
    editorialDescription: row.editorialDescription,
    technicalFields: row.technicalFields,
    mediaId: row.mediaId,
    mediaUrl: row.mediaUrl,
  })),
}, null, 2));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
