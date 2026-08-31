import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import { getAdminCatalog, getAdminDuplicateGroups } from "@/lib/admin-catalog";
import { getAdminCatalogPage } from "@/lib/catalog-admin-service";
import {
  getCatalogBrands,
  getCatalogCategories,
  getCatalogFamilies,
} from "@/lib/catalog-repository";
import { CatalogPublicationControl } from "@/components/admin/CatalogPublicationControl";
import { DuplicateDecisionControl } from "@/components/admin/DuplicateDecisionControl";
import { ProductEditorialForm } from "@/components/admin/ProductEditorialForm";
import { ProductWorkspace } from "@/components/admin/AdminCategoryViews";
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
  const value = (key: string) => {
    const raw = params[key];
    return Array.isArray(raw) ? raw[0] : raw;
  };
  const publicationStatus = value("publicationStatus") as
    | "draft"
    | "review"
    | "published"
    | "hidden"
    | undefined;
  const requiresReview = value("requiresReview");
  const possibleDuplicate = value("possibleDuplicate");
  const catalogQueryParams = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    const entry = Array.isArray(raw) ? raw[0] : raw;
    if (entry !== undefined && entry !== "") catalogQueryParams.set(key, entry);
  }
  const catalogQueryString = catalogQueryParams.toString();
  const [catalog, catalogContract, duplicateGroups, categories, families, brands] = await Promise.all([
    getAdminCatalog({
      query: value("query"),
      sku: value("sku"),
      name: value("name"),
      categorySlug: value("category"),
      familySlug: value("family"),
      brandSlug: value("brand"),
      publicationStatus,
      requiresReview: requiresReview === undefined ? undefined : requiresReview === "true",
      possibleDuplicate: possibleDuplicate === undefined ? undefined : possibleDuplicate === "true",
      confidence: value("confidence"),
      sourceStatus: value("sourceStatus"),
      page: Number(value("page") || 1),
      pageSize: 48,
    }),
    // El contrato entrega queues globales; no heredan los filtros ni la página actual.
    getAdminCatalogPage({ page: 1, pageSize: 1 }),
    getAdminDuplicateGroups(),
    getCatalogCategories(false),
    getCatalogFamilies(undefined, false),
    getCatalogBrands(false),
  ]);
  return (
    <ProductWorkspace
      total={catalog.total}
      pagination={{ page: catalog.page, totalPages: catalog.totalPages, totalItems: catalog.total }}
      queryString={catalogQueryString}
      metrics={{
        totalProducts: catalogContract.queues.totalProducts,
        publishedProducts: catalogContract.queues.publishedProducts,
        draftProducts: catalogContract.queues.draftProducts,
        reviewProducts: catalogContract.queues.reviewProducts,
        duplicateProducts: catalogContract.queues.duplicateProducts,
        productsRequiringReview: catalogContract.queues.productsRequiringReview,
        totalBrands: catalogContract.queues.totalBrands,
      }}
      rows={catalog.rows.map((row) => ({
        id: row.id,
        name: row.name,
        sku: row.sku,
        brand: row.brand,
        family: row.family,
        publicationStatus: row.publicationStatus,
        requiresReview: row.requiresReview ?? false,
        possibleDuplicate: row.possibleDuplicate ?? false,
      }))}
      canCreate={can(actor.role, "catalog.product.create")}
      createOptions={{ categories, families, brands }}
      controls={
        <div className="space-y-4">
          <form method="get" className="grid gap-2 sm:grid-cols-2">
            <input
              name="query"
              defaultValue={value("query")}
              placeholder="Buscar SKU, nombre o familia..."
              className="h-9 rounded-lg border border-[#dce6ee] px-3 text-[10px]"
            />
            <select
              name="publicationStatus"
              defaultValue={publicationStatus ?? ""}
              className="h-9 rounded-lg border border-[#dce6ee] px-3 text-[10px]"
            >
              <option value="">Todos los estados</option>
              <option value="published">Publicado</option>
              <option value="draft">Borrador</option>
              <option value="review">Revision</option>
              <option value="hidden">Oculto</option>
            </select>
            <button
              type="submit"
              className="h-9 rounded-lg bg-[#102f51] px-3 text-[10px] font-extrabold text-white"
            >
              Aplicar filtros
            </button>
          </form>
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[10px] font-semibold leading-5 text-amber-900">Publicar requiere resolver los bloqueos editoriales, duplicados y revisión de cada referencia. Los productos en revisión no aparecen en el catálogo público.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {catalog.rows.slice(0, 12).map((row) => (
              <article key={row.id} className="rounded-lg border border-[#e3ebf2] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-extrabold text-[#304b66]">{row.name}</p>
                    <p className="mt-1 font-mono text-[9px] text-[#8296a9]">{row.sku}</p>
                  </div>
                  <CatalogPublicationControl
                    productId={row.id}
                    currentStatus={row.publicationStatus}
                  />
                </div>
                <ProductEditorialForm
                  productId={row.id}
                  initial={{
                    commercialName: row.commercialName,
                    editorialDescription: row.editorialDescription,
                    featured: row.featured,
                    editorialCategoryId: row.editorialCategoryId,
                    editorialFamilyId: row.editorialFamilyId,
                    editorialBrandId: row.editorialBrandId,
                  }}
                  categories={categories}
                  families={families}
                  brands={brands}
                />
              </article>
            ))}
          </div>
          {duplicateGroups.length ? (
            <details className="rounded-lg border border-[#e3ebf2] p-3">
              <summary className="cursor-pointer text-[10px] font-extrabold text-[#2277ee]">
                Duplicados pendientes ({duplicateGroups.length})
              </summary>
              <div className="mt-3 grid gap-3">
                {duplicateGroups.map((group) => (
                  <div key={group.group}>
                    <p className="font-mono text-[9px] text-[#8296a9]">{group.group}</p>
                    {group.products.map((product) => (
                      <div
                        key={product.id}
                        className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded border border-[#edf2f6] p-2 text-[10px]"
                      >
                        <span>
                          {product.name} · {product.sku}
                        </span>
                        <DuplicateDecisionControl
                          productId={product.id}
                          currentDecision={product.duplicateDecision}
                          currentCanonicalProductId={product.canonicalProductId}
                          candidates={group.products.map((candidate) => ({
                            id: candidate.id,
                            sku: candidate.sku,
                            name: candidate.name,
                          }))}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      }
    />
  );
}
