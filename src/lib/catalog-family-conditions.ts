import { and, eq, sql } from "drizzle-orm";
import { categories, families } from "@/db/schema";

export function catalogFamilyConditions(categoryId: string | undefined, publicOnly: boolean) {
  return and(
    categoryId ? eq(families.categoryId, categoryId) : undefined,
    publicOnly ? eq(families.active, true) : undefined,
    publicOnly ? sql`exists (select 1 from ${categories} where ${categories.id} = ${families.categoryId} and ${categories.active} = true)` : undefined,
  );
}
