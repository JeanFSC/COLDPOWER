import { getCatalogBrands, getCatalogCategories, getCatalogCategoryBySlug, getCatalogProductBySlug, getCatalogProducts, getCatalogRelatedProducts } from "@/lib/catalog-repository";
import type { Product, ProductStatus } from "@/types/product";

export type ProductSort = "relevance" | "availability" | "consulted" | "price-asc" | "price-desc" | "updated" | "name-asc";
export type CatalogFilters = { query?: string; category?: string | string[]; family?: string | string[]; productType?: string; brand?: string | string[]; status?: ProductStatus | ProductStatus[] | "all"; sort?: ProductSort; application?: string; relation?: string };

export { getCatalogBrands as getBrands, getCatalogCategories as getCategories, getCatalogCategoryBySlug as getCategoryBySlug, getCatalogProductBySlug as getProductBySlug, getCatalogRelatedProducts as getRelatedProducts };

export function parseFacetValues(value: string | string[] | undefined) { if (value === undefined) return []; const values = Array.isArray(value) ? value : value.split(","); return values.map((item) => item.trim()).filter(Boolean); }
export function normalizeTechnicalValue(value = "") { return value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^\p{Letter}\p{Number}]+/gu, ""); }

export async function filterProducts(filters: CatalogFilters) { return (await getCatalogProducts({ query: filters.query, categorySlug: parseFacetValues(filters.category)[0], familySlug: parseFacetValues(filters.family)[0], brandSlug: parseFacetValues(filters.brand)[0], status: parseFacetValues(filters.status)[0], sort: filters.sort, pageSize: 48 })).products; }
export async function searchProducts(query: string) { return (await getCatalogProducts({ query, pageSize: 48 })).products; }
export async function searchProductsForQuote(query: string, limit = 8) { if (normalizeTechnicalValue(query).length < 2) return []; return (await getCatalogProducts({ query, pageSize: Math.min(12, Math.max(1, Math.floor(limit))) })).products; }
export async function getRelatedProductsForView(product: Product) { return getCatalogRelatedProducts(product.id, product.familyId); }
