import { getCatalogProducts } from "@/lib/catalog-repository";

export async function getAllCatalogProductsForSitemap() {
  const firstPage = await getCatalogProducts({ page: 1, pageSize: 48 });
  const allProducts = [...firstPage.products];
  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    const nextPage = await getCatalogProducts({ page, pageSize: 48 });
    allProducts.push(...nextPage.products);
  }
  return allProducts;
}
