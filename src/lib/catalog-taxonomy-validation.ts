import { and, eq } from "drizzle-orm";
import type { getDb } from "@/db";
import { brands, categories, families } from "@/db/schema";

type Database = ReturnType<typeof getDb>;
type CatalogTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export async function assertEditorialTaxonomy(
  tx: CatalogTransaction,
  values: {
    categoryId: string;
    familyId: string;
    brandId: string | null;
    requireCategoryActive?: boolean;
    requireFamilyActive?: boolean;
    requireBrandActive?: boolean;
  },
) {
  const [category] = await tx.select({ id: categories.id, active: categories.active }).from(categories).where(eq(categories.id, values.categoryId)).limit(1);
  if (!category || (values.requireCategoryActive && !category.active)) throw new Error("CATALOG_TAXONOMY_INVALID");

  const [family] = await tx.select({ id: families.id, categoryId: families.categoryId, active: families.active }).from(families).where(and(eq(families.id, values.familyId), eq(families.categoryId, values.categoryId))).limit(1);
  if (!family || (values.requireFamilyActive && !family.active)) throw new Error("CATALOG_TAXONOMY_INVALID");

  if (values.brandId) {
    const [brand] = await tx.select({ id: brands.id, active: brands.active }).from(brands).where(eq(brands.id, values.brandId)).limit(1);
    if (!brand || (values.requireBrandActive && !brand.active)) throw new Error("CATALOG_TAXONOMY_INVALID");
  }
}
