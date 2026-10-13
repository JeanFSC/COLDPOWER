import { ilike, or } from "drizzle-orm";
import { brands, categories, families, products } from "@/db/schema";

export function pricingProductSearchPredicate(query: string) {
  const pattern = `%${query.trim()}%`;
  return or(
    ilike(products.sku, pattern),
    ilike(products.commercialName, pattern),
    ilike(products.normalizedName, pattern),
    ilike(products.originalName, pattern),
    ilike(brands.name, pattern),
    ilike(families.name, pattern),
    ilike(categories.name, pattern),
  );
}
