import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { Button } from "@/components/shared/Button";
import { categories } from "@/data/categories";
import type { CatalogFilters as CatalogFiltersType, ProductSort } from "@/lib/catalog";
import { filterProducts, getCategoryBySlug } from "@/lib/catalog";
import type { ProductStatus } from "@/types/product";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export function generateStaticParams() {
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    return {
      title: "Categoría no encontrada",
    };
  }

  return {
    title: category.name,
    description: category.description,
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const query = await searchParams;
  const filters = readCategoryFilters(query, slug);
  const filteredProducts = filterProducts(filters);

  return (
    <section className="bg-background py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-dark px-6 py-9 text-white shadow-float sm:px-8">
          <Link
            href="/catalogo"
            className="inline-flex items-center gap-2 text-sm font-extrabold text-gray-light hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver al catálogo
          </Link>
          <h1 className="mt-5 font-display text-4xl font-black tracking-normal">{category.name}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-gray-light">
            {category.description}
          </p>
          <Button href="/catalogo" variant="outline" className="mt-6 w-full sm:w-auto">
            Ver todo el catálogo
          </Button>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
          <CatalogFilters
            filters={filters}
            action={`/categoria/${category.slug}`}
            showCategory={false}
          />
          <ProductGrid
            products={filteredProducts}
            emptyTitle={`Sin productos en ${category.name}`}
            emptyDescription="Puedes volver al catálogo general o solicitar una cotización asistida."
          />
        </div>
      </div>
    </section>
  );
}

function readCategoryFilters(
  params: Record<string, string | string[] | undefined>,
  category: string,
): CatalogFiltersType {
  return {
    query: getParam(params.q),
    category,
    brand: getParam(params.marca),
    status: getParam(params.disponibilidad) as ProductStatus | "all" | undefined,
    sort: getParam(params.orden) as ProductSort | undefined,
  };
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
