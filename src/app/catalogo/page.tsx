import type { Metadata } from "next";
import { AppliedFilters } from "@/components/catalog/AppliedFilters";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { CatalogPagination } from "@/components/catalog/CatalogPagination";
import { CatalogUnavailable } from "@/components/catalog/CatalogUnavailable";
import { EmptyState } from "@/components/catalog/EmptyState";
import { BrandsDirectory } from "@/components/catalog/BrandsDirectory";
import { MobileFilterDrawer } from "@/components/catalog/MobileFilterDrawer";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { CatalogHero } from "@/components/catalog/CatalogHero";
import type { CatalogFilters as CatalogFiltersType, ProductSort } from "@/lib/catalog";
import { getCatalogBrands, getCatalogCategories, getCatalogFamilies, getCatalogProducts } from "@/lib/catalog-repository";
import type { ProductStatus } from "@/types/product";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Catálogo técnico",
  description: "Explora equipos y repuestos ColdPower por código, marca, familia y especificaciones técnicas.",
};

type SearchParams = Record<string, string | string[] | undefined>;
type CatalogPageProps = { searchParams: Promise<SearchParams> };

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  if (getFirst(params.vista) === "marcas") {
    return <BrandsCatalogView />;
  }
  const relation = getRelation(params.relacion);
  if (relation) return <RelationCatalogView relation={relation} />;
  const filters = readCatalogFilters(params);
  const mode = getCatalogMode(getFirst(params.modo));
  const catalogData = await loadCatalogPageData(filters, params);

  if (!catalogData) return <CatalogUnavailable />;

  const [catalog, categories, families, brands] = catalogData;
  const publicCategories = categories.filter((category) => category.productCount > 0);
  const publicFamilies = families.filter((family) => family.productCount > 0);
  const publicBrands = brands.filter((brand) => brand.productCount > 0);
  return (
    <section className="bg-surface-page py-8 sm:py-10">
      <div className="cp-container">
        <CatalogHero
          eyebrow="Inicio / Catálogo"
          title={mode?.title ?? "Encuentra la referencia correcta"}
          description={mode?.description ?? "Busca por SKU, nombre, marca, familia o atributo técnico. La ficha muestra solo la información publicada."}
        />
        <div className="mt-6 flex items-center justify-between gap-3 lg:hidden">
          <p className="text-sm font-bold text-dark">{catalog.total} referencias encontradas</p>
          <MobileFilterDrawer>
            <CatalogFilters filters={filters} categories={publicCategories} families={publicFamilies} brands={publicBrands} />
          </MobileFilterDrawer>
        </div>
        <div className="mt-7 grid gap-6 lg:grid-cols-[248px_minmax(0,1fr)]">
          <div className="hidden lg:block">
            <CatalogFilters filters={filters} categories={publicCategories} families={publicFamilies} brands={publicBrands} />
          </div>
          <div>
            <AppliedFilters filters={filters} />
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="hidden font-mono text-xs font-semibold uppercase tracking-[0.12em] text-brand-secondary-600 lg:block">
                  {catalog.total} referencias disponibles
                </p>
                <h1 className="mt-1 font-display text-2xl font-black text-brand-primary-900">Listado de productos</h1>
              </div>
              <p className="text-sm text-text-secondary">Pagina {catalog.page} de {catalog.totalPages}</p>
            </div>
            <ProductGrid
              products={catalog.products}
              emptyTitle="No hay referencias con esos filtros"
              emptyDescription="Prueba otra combinacion o busca por SKU, modelo o nombre."
            />
            <CatalogPagination basePath="/catalogo" page={catalog.page} totalPages={catalog.totalPages} searchParams={params} />
          </div>
        </div>
      </div>
    </section>
  );
}

async function BrandsCatalogView() {
  const brands = await loadPublicBrands();
  if (!brands) return <CatalogUnavailable />;

  return (
    <section className="bg-surface-page py-8 sm:py-10">
      <div className="cp-container">
        <CatalogHero eyebrow="Inicio / Marcas" title="Marcas presentes en el catálogo" description="Explora fabricantes con referencias publicadas y filtra el catálogo por marca." image="/images/categories/repuestos.webp" />
        <div className="mt-7"><BrandsDirectory brands={brands} /></div>
      </div>
    </section>
  );
}

async function loadPublicBrands() {
  try {
    return await getCatalogBrands();
  } catch (error) {
    console.error("ColdPower: directorio de marcas no disponible", error);
    return null;
  }
}

async function loadCatalogPageData(filters: CatalogFiltersType, params: SearchParams) {
  try {
    return await Promise.all([
      getCatalogProducts({
        query: filters.query,
        categorySlug: firstFacet(filters.category),
        familySlug: firstFacet(filters.family),
        productType: filters.productType,
        brandSlug: firstFacet(filters.brand),
        status: firstFacet(filters.status),
        sort: filters.sort,
        page: numberParam(params.pagina),
        pageSize: 24,
      }),
      getCatalogCategories(),
      getCatalogFamilies(),
      getCatalogBrands(),
    ]);
  } catch (error) {
    console.error("ColdPower: catalogo persistente no disponible", error);
    return null;
  }
}

function readCatalogFilters(params: SearchParams): CatalogFiltersType {
  return {
    query: getFirst(params.q),
    category: getFacet(params.categoria),
    family: getFacet(params.familia),
    productType: getFirst(params.tipo),
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

const relationLabels = {
  alternativa: "Alternativas técnicas",
  compatible: "Relaciones compatibles",
  consumible: "Herramientas y consumibles",
} as const;

function getRelation(value: string | string[] | undefined) {
  const relation = getFirst(value);
  return relation && relation in relationLabels ? relation as keyof typeof relationLabels : undefined;
}

const catalogModes = {
  equipo: { title: "Encuentra piezas para tu equipo", description: "Explora familias y aplicaciones para partir del equipo que necesitas reparar." },
  especificaciones: { title: "Busca por especificaciones técnicas", description: "Filtra por código, modelo, refrigerante, voltaje, capacidad y otros datos disponibles." },
} as const;

function getCatalogMode(value: string | undefined) {
  return value && value in catalogModes ? catalogModes[value as keyof typeof catalogModes] : undefined;
}

function RelationCatalogView({ relation }: { relation: keyof typeof relationLabels }) {
  return (
    <section className="bg-surface-page py-8 sm:py-10">
      <div className="cp-container">
        <CatalogHero eyebrow="Inicio / Catálogo" title={relationLabels[relation]} description="Estas relaciones se mostrarán únicamente cuando estén verificadas y publicadas por el equipo técnico." />
        <div className="mt-7"><EmptyState title="Aún no hay relaciones publicadas" description="Puedes explorar el catálogo general o enviar una solicitud para que un asesor revise la combinación adecuada." /></div>
      </div>
    </section>
  );
}
