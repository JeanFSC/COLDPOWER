import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppliedFilters } from "@/components/catalog/AppliedFilters";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { CatalogPagination } from "@/components/catalog/CatalogPagination";
import { CatalogUnavailable } from "@/components/catalog/CatalogUnavailable";
import { MobileFilterDrawer } from "@/components/catalog/MobileFilterDrawer";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { Button } from "@/components/shared/Button";
import type { CatalogFilters as CatalogFiltersType, ProductSort } from "@/lib/catalog";
import { resolveCatalogCategorySlug } from "@/lib/catalog-category-slugs";
import {
  getCatalogBrands,
  getCatalogCategoryBySlug,
  getCatalogFamilies,
  getCatalogProducts,
  type CatalogCategory,
} from "@/lib/catalog-repository";
import type { ProductStatus } from "@/types/product";

export const dynamic = "force-dynamic";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const category = await getCatalogCategoryBySlug(resolveCatalogCategorySlug(slug));
    return category
      ? {
          title: category.name,
          description: `Productos de ${category.name} disponibles en el catálogo ColdPower.`,
        }
      : { title: "Categoría no encontrada" };
  } catch (error) {
    console.warn("[ColdPower] Metadata de categoría no disponible.", error instanceof Error ? error.message : error);
    return { title: "Catálogo temporalmente no disponible", robots: { index: false, follow: false } };
  }
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug: requestedSlug } = await params;
  const category = await loadCategory(requestedSlug);

  if (category === null) {
    return (
      <CatalogUnavailable
        title="La categoría está temporalmente no disponible"
        description="No podemos mostrar esta categoría en este momento. Inténtalo nuevamente en unos minutos o solicita ayuda técnica."
      />
    );
  }
  if (!category) notFound();

  const paramsQuery = await searchParams;
  const filters = readCategoryFilters(paramsQuery);
  const catalogData = await loadCategoryCatalogData(category, filters, paramsQuery);

  if (!catalogData) {
    return (
      <CatalogUnavailable
        title="La categoría está temporalmente no disponible"
        description="No podemos mostrar esta categoría en este momento. Inténtalo nuevamente en unos minutos o solicita ayuda técnica."
      />
    );
  }

  const [catalog, brands, families] = catalogData;
  const publicBrands = brands.filter((brand) => brand.productCount > 0);
  const publicFamilies = families.filter((family) => family.productCount > 0);
  return (
    <section className="bg-surface-page py-8 sm:py-10">
      <div className="cp-container">
        <div className="border-b border-border pb-7">
          <Link
            href="/catalogo"
            className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-dark"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver al catálogo
          </Link>
          <h1 className="mt-5 font-display text-3xl font-black text-dark sm:text-4xl">{category.name}</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-text-secondary">
            {category.productCount} productos disponibles en esta categoría. La compatibilidad y el precio se confirman antes de cotizar.
          </p>
          <Button
            href="/catalogo"
            variant="outline"
            className="mt-6"
          >
            Ver todo el catálogo
          </Button>
        </div>
        <div className="mt-6 flex items-center justify-between gap-3 lg:hidden">
          <p className="text-sm font-bold text-dark">{catalog.total} referencias</p>
          <MobileFilterDrawer><CatalogFilters filters={filters} families={publicFamilies} brands={publicBrands} action={"/categoria/" + category.slug} showCategory={false} /></MobileFilterDrawer>
        </div>
        <div className="mt-7 grid gap-6 lg:grid-cols-[248px_minmax(0,1fr)]">
          <div className="hidden lg:block">
            <CatalogFilters
            filters={filters}
            families={publicFamilies}
            brands={publicBrands}
            action={`/categoria/${category.slug}`}
            showCategory={false}
            />
          </div>
          <div>
            <AppliedFilters filters={filters} action={`/categoria/${category.slug}`} />
            <p className="mb-5 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-brand-secondary-600">
              {catalog.total} referencias en {category.name}
            </p>
            <ProductGrid
              products={catalog.products}
              emptyTitle={`No hay referencias en ${category.name}`}
              emptyDescription="Prueba otra combinación o busca por código, modelo o marca."
            />
            <CatalogPagination
              basePath={`/categoria/${category.slug}`}
              page={catalog.page}
              totalPages={catalog.totalPages}
              searchParams={paramsQuery}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

async function loadCategory(requestedSlug: string): Promise<CatalogCategory | undefined | null> {
  try {
    return await getCatalogCategoryBySlug(resolveCatalogCategorySlug(requestedSlug));
  } catch (error) {
    console.warn("[ColdPower] Categoría persistente no disponible.", error instanceof Error ? error.message : error);
    return null;
  }
}

async function loadCategoryCatalogData(
  category: CatalogCategory,
  filters: CatalogFiltersType,
  paramsQuery: Record<string, string | string[] | undefined>,
) {
  try {
    return await Promise.all([
      getCatalogProducts({
        query: filters.query,
        categorySlug: category.slug,
        familySlug: firstFacet(filters.family),
        brandSlug: firstFacet(filters.brand),
        status: firstFacet(filters.status),
        page: numberParam(paramsQuery.pagina),
        pageSize: 24,
      }),
      getCatalogBrands(),
      getCatalogFamilies(category.id),
    ]);
  } catch (error) {
    console.warn("[ColdPower] Referencias de categoría no disponibles.", error instanceof Error ? error.message : error);
    return null;
  }
}

function readCategoryFilters(
  params: Record<string, string | string[] | undefined>,
): CatalogFiltersType {
  return {
    query: getFirst(params.q),
    family: getFacet(params.familia),
    brand: getFacet(params.marca),
    status: getFacet(params.disponibilidad) as ProductStatus | ProductStatus[] | "all" | undefined,
    sort: getFirst(params.orden) as ProductSort | undefined,
  };
}

function getFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getFacet(value: string | string[] | undefined) {
  return value === undefined ? undefined : Array.isArray(value) ? value : value.split(",");
}

function firstFacet(value: string | string[] | undefined) {
  const item = getFirst(value);
  return item && item !== "all" ? item : undefined;
}

function numberParam(value: string | string[] | undefined) {
  const parsed = Number(getFirst(value) ?? "1");
  return Number.isFinite(parsed) ? parsed : 1;
}
