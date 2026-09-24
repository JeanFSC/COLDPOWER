import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, brands, categories, families, products } from "@/db/schema";

export type ManualProductInput = { sku: string; commercialName: string; categoryId: string; familyId: string; brandId?: string | null; productType?: string };
export type CatalogActor = { userId: string; role: string };

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 180);
}

export function buildManualProductInsert(input: ManualProductInput, actorId: string) {
  const sku = input.sku.trim();
  const name = input.commercialName.trim();
  if (!sku || !name || !input.categoryId || !input.familyId) throw new Error("CATALOG_VALIDATION_ERROR");
  return {
    id: `product-${crypto.randomUUID()}`,
    sku,
    slug: `${slugify(name)}-${slugify(sku)}`,
    originalName: name,
    normalizedName: name,
    commercialName: name,
    featured: false,
    productType: input.productType?.trim() || "Producto manual",
    categoryId: input.categoryId,
    familyId: input.familyId,
    brandId: input.brandId || null,
    status: "MANUAL",
    publicationStatus: "draft" as const,
    availabilityStatus: "unknown" as const,
    requiresReview: true,
    reviewReason: "Creación manual pendiente de revisión",
    possibleDuplicate: false,
    duplicateDecision: "pending" as const,
    canonicalProductId: null,
    sourcePage: null,
    sourceRow: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    publicationChangedBy: null,
    publicationChangedAt: null,
    publicationNote: `Creado manualmente por ${actorId}`,
  };
}

export async function createManualProduct(input: ManualProductInput, actor: CatalogActor) {
  const db = getDb();
  const values = buildManualProductInsert(input, actor.userId);
  return db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: products.id }).from(products).where(eq(products.sku, values.sku)).limit(1);
    if (existing) throw new Error("CATALOG_VALIDATION_ERROR");
    const [family] = await tx.select({ id: families.id, categoryId: families.categoryId }).from(families).where(and(eq(families.id, values.familyId), eq(families.categoryId, values.categoryId), eq(families.active, true))).limit(1);
    if (!family) throw new Error("CATALOG_VALIDATION_ERROR");
    const [category] = await tx.select({ id: categories.id }).from(categories).where(and(eq(categories.id, values.categoryId), eq(categories.active, true))).limit(1);
    if (!category) throw new Error("CATALOG_VALIDATION_ERROR");
    if (values.brandId) {
      const [brand] = await tx.select({ id: brands.id }).from(brands).where(and(eq(brands.id, values.brandId), eq(brands.active, true))).limit(1);
      if (!brand) throw new Error("CATALOG_VALIDATION_ERROR");
    }
    const [created] = await tx.insert(products).values(values).returning({ id: products.id, sku: products.sku, slug: products.slug, publicationStatus: products.publicationStatus, sourceStatus: products.status });
    await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "PRODUCT_CREATED", entityType: "product", entityId: created.id, before: null, after: { sku: created.sku, publicationStatus: created.publicationStatus, sourceStatus: created.sourceStatus }, metadata: null });
    return created;
  });
}
