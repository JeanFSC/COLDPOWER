import Link from "next/link";
import { ChevronRight, DatabaseZap, SearchX } from "lucide-react";
import type { CatalogCategory } from "@/lib/catalog-repository";
import { CategoryCard } from "@/components/home/CategoryCard";
import { SectionTitle } from "@/components/shared/SectionTitle";

const categoryImages: Array<[string, string]> = [
  ["compresor", "/images/cat-refrigeracion.svg"],
  ["refriger", "/images/cat-refrigeracion.svg"],
  ["lavador", "/images/cat-lavadora.svg"],
  ["aire", "/images/cat-extractor.svg"],
  ["extract", "/images/cat-extractor.svg"],
  ["bomba", "/images/cat-bomba-de-agua.svg"],
  ["motor", "/images/cat-motores-automotrices.svg"],
  ["herramient", "/images/cat-repuestos-y-accesorios-generales.svg"],
  ["accesorio", "/images/cat-repuestos-y-accesorios-generales.svg"],
  ["electro", "/images/cat-otros-electrodomesticos.svg"],
];
const priorityKeys = [
  "refriger",
  "compresor",
  "aire",
  "lavador",
  "motor",
  "bomba",
  "herramient",
  "electro",
  "repuesto",
];

function imageForCategory(category: CatalogCategory) {
  const normalized = category.name.toLowerCase();
  return categoryImages.find(([key]) => normalized.includes(key))?.[1];
}

function prioritizeCategories(categories: CatalogCategory[]) {
  return categories
    .filter((category) => category.productCount > 0)
    .sort((left, right) => {
      const leftName = left.name.toLowerCase();
      const rightName = right.name.toLowerCase();
      const leftPriority = priorityKeys.findIndex((key) => leftName.includes(key));
      const rightPriority = priorityKeys.findIndex((key) => rightName.includes(key));
      const leftRank = leftPriority === -1 ? priorityKeys.length : leftPriority;
      const rightRank = rightPriority === -1 ? priorityKeys.length : rightPriority;
      return leftRank - rightRank || left.name.localeCompare(right.name);
    });
}

export function CategoriesGrid({
  categories,
  catalogUnavailable = false,
}: {
  categories: CatalogCategory[];
  catalogUnavailable?: boolean;
}) {
  const visibleCategories = prioritizeCategories(categories);

  return (
    <section className="bg-surface-page py-10 sm:py-14" data-home-block="technical-families">
      <div className="cp-container">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SectionTitle
            eyebrow="Categorías principales"
            title="Encuentra por línea de producto"
            description="Explora las familias publicadas en el catálogo ColdPower."
          />
          <Link
            href="/catalogo"
            prefetch={false}
            className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-brand-secondary-600 hover:text-dark"
          >
            Ver todas <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        {catalogUnavailable ? (
          <div
            className="mt-7 flex items-start gap-3 rounded-xl border border-danger/25 bg-white px-5 py-4 text-sm text-text-secondary"
            role="alert"
          >
            <DatabaseZap className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
            <div>
              <h3 className="font-extrabold text-dark">
                El catálogo no está disponible temporalmente
              </h3>
              <p className="mt-1 leading-6">
                No mostramos categorías de respaldo para evitar presentar información no confirmada.
                Intenta nuevamente o abre el catálogo.
              </p>
            </div>
          </div>
        ) : visibleCategories.length > 0 ? (
          <div
            className={
              "mt-7 grid gap-3 " +
              (visibleCategories.length < 3
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7")
            }
          >
            {visibleCategories.slice(0, 7).map((category) => (
              <CategoryCard
                key={category.id}
                href={"/categoria/" + category.slug}
                name={category.name}
                count={category.productCount}
                imageSrc={imageForCategory(category)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-7 flex flex-col gap-4 rounded-xl border border-dashed border-border bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <SearchX className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-dark">
                  Aún no hay categorías publicadas
                </h3>
                <p className="mt-1 text-sm leading-5 text-text-secondary">
                  Las categorías aparecerán aquí cuando completen la revisión editorial.
                </p>
              </div>
            </div>
            <Link
              href="/catalogo"
              prefetch={false}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-border px-4 text-sm font-extrabold text-brand-primary-900 transition hover:border-brand-secondary-600 hover:text-brand-secondary-600"
            >
              Explorar catálogo
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
