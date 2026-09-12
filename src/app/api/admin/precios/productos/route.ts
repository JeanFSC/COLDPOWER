import { asc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { brands, categories, families, products } from "@/db/schema";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";

export async function GET(request: Request) {
  try {
    await requireApiPermission("pricing.view");
    const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (query.length < 2) return apiSuccess({ items: [] });
    const pattern = `%${query}%`;
    const items = await getDb().select({ productId: products.id, sku: products.sku, productName: sql<string>`coalesce(${products.commercialName}, ${products.normalizedName}, ${products.originalName})`, categoryName: categories.name, familyName: families.name, brandName: brands.name }).from(products).innerJoin(categories, or(eq(products.categoryId, categories.id), eq(products.editorialCategoryId, categories.id))).innerJoin(families, or(eq(products.familyId, families.id), eq(products.editorialFamilyId, families.id))).leftJoin(brands, or(eq(products.brandId, brands.id), eq(products.editorialBrandId, brands.id))).where(or(ilike(products.sku, pattern), ilike(products.commercialName, pattern), ilike(products.normalizedName, pattern), ilike(products.originalName, pattern), ilike(brands.name, pattern))).orderBy(asc(products.sku)).limit(20);
    return apiSuccess({ items });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("PRICING_FORBIDDEN", "No tienes permiso para buscar productos.", 403);
    return apiError("PRICING_UNAVAILABLE", "No se pudo buscar productos.", 503);
  }
}
