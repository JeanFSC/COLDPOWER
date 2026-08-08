import { categories } from "@/data/categories";
import { products } from "@/data/products";
import type { Product, ProductStatus } from "@/types/product";

export type ProductSort = "name-asc" | "price-asc" | "price-desc";

export type CatalogFilters = {
  query?: string;
  category?: string;
  brand?: string;
  status?: ProductStatus | "all";
  sort?: ProductSort;
};

export function getCategoryBySlug(slug: string) {
  return categories.find((category) => category.slug === slug);
}

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}

export function getRelatedProducts(product: Product) {
  const explicit = product.relatedIds
    .map((id) => products.find((item) => item.id === id))
    .filter((item): item is Product => Boolean(item));

  if (explicit.length > 0) {
    return explicit.slice(0, 4);
  }

  return products
    .filter((item) => item.category === product.category && item.id !== product.id)
    .slice(0, 4);
}

export function getBrands() {
  return Array.from(new Set(products.map((product) => product.brand))).sort((a, b) =>
    a.localeCompare(b),
  );
}

export function searchProducts(query: string) {
  return filterProducts({ query });
}

export function filterProducts(filters: CatalogFilters) {
  const normalizedQuery = normalize(filters.query);

  const filtered = products.filter((product) => {
    const matchesQuery =
      !normalizedQuery ||
      [
        product.name,
        product.brand,
        product.sku,
        product.category,
        product.type,
        product.origin,
        product.description,
        product.shortDescription,
        product.longDescription,
        ...product.compatibility,
      ]
        .map(normalize)
        .some((value) => value.includes(normalizedQuery));

    const matchesCategory =
      !filters.category || filters.category === "all" || product.category === filters.category;
    const matchesBrand =
      !filters.brand || filters.brand === "all" || product.brand === filters.brand;
    const matchesStatus =
      !filters.status || filters.status === "all" || product.status === filters.status;

    return matchesQuery && matchesCategory && matchesBrand && matchesStatus;
  });

  return sortProducts(filtered, filters.sort ?? "name-asc");
}

function sortProducts(items: Product[], sort: ProductSort) {
  return [...items].sort((a, b) => {
    if (sort === "price-asc") {
      return a.price - b.price;
    }

    if (sort === "price-desc") {
      return b.price - a.price;
    }

    return a.name.localeCompare(b.name);
  });
}

function normalize(value = "") {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}
