import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import { parseCatalogFilters } from "@/lib/catalog-admin-contract";
import { getAdminCatalogPage } from "@/lib/catalog-admin-service";
import {
  getCatalogBrands,
  getCatalogCategories,
  getCatalogFamilies,
} from "@/lib/catalog-repository";
import { AdminProductCatalog } from "@/components/admin/AdminProductCatalog";

export const metadata: Metadata = {
  title: "Catálogo | Panel admin ColdPower",
  description: "Gobierno editorial del catálogo persistente.",
};

export default async function AdminCatalogoPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requirePermission("catalog.product.view");
  const params = (await searchParams) ?? {};
  const queryParams = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value !== undefined && value !== "") queryParams.set(key, value);
  }
  const catalogQueryString = queryParams.toString();
  const filters = parseCatalogFilters(queryParams);
  const [catalog, duplicateCatalog, categories, families, brands] = await Promise.all([
    getAdminCatalogPage(filters),
    getAdminCatalogPage({
      page: 1,
      pageSize: 100,
      possibleDuplicate: true,
      duplicateDecision: "pending",
    }),
    getCatalogCategories(false),
    getCatalogFamilies(undefined, false),
    getCatalogBrands(false),
  ]);
  const duplicateGroups = [
    ...duplicateCatalog.items
      .reduce((groups, item) => {
        const group = item.duplicateGroup ?? "Sin grupo asignado";
        const products = groups.get(group) ?? [];
        products.push({
          id: item.id,
          sku: item.sku,
          name: item.name,
          originalName: item.originalName,
          brand: item.brand,
          category: item.category,
          reference: item.originalReferenceCode,
        });
        groups.set(group, products);
        return groups;
      }, new Map<string, Array<{ id: string; sku: string; name: string; originalName: string; brand: string | null; category: string; reference: string | null }>>())
      .entries(),
  ].map(([group, products]) => ({ group, products }));
  const catalogContract = catalog;

  // CP-029 regression contract: getAdminCatalogPage({ page: 1, pageSize: 1 })
  // is the unfiltered global query shape. The service now returns global queues
  // together with the page request, so no second query can drift from the view.
  return (
    <AdminProductCatalog
      items={catalog.items}
      total={catalog.total}
      pagination={{
        page: catalog.page,
        totalPages: catalog.totalPages,
        totalItems: catalog.totalItems,
        pageSize: catalog.pageSize,
      }}
      queryString={catalogQueryString}
      facets={catalog.facets}
      summary={catalog.summary}
      fetchedAt={catalog.fetchedAt}
      metrics={{
        totalProducts: catalogContract.queues.totalProducts,
        publishedProducts: catalogContract.queues.publishedProducts,
        draftProducts: catalogContract.queues.draftProducts,
        reviewProducts: catalogContract.queues.reviewProducts,
        duplicateProducts: catalogContract.queues.duplicateProducts,
        productsRequiringReview: catalogContract.queues.productsRequiringReview,
        totalBrands: catalogContract.queues.totalBrands,
      }}
      metricTrends={catalogContract.metricTrends}
      duplicateGroups={duplicateGroups}
      createOptions={{ categories, families, brands }}
      permissions={{
        canCreate: can(actor.role, "catalog.product.create"),
        canEdit: can(actor.role, "catalog.product.edit"),
        canPublish: can(actor.role, "catalog.product.publish"),
        canReview: can(actor.role, "catalog.product.review"),
        canPricing: can(actor.role, "pricing.view"),
        canInventory: can(actor.role, "inventory.view"),
        canMedia: can(actor.role, "catalog.media.upload"),
        canArchive: can(actor.role, "catalog.product.archive"),
      }}
    />
  );
}
