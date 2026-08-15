import Link from "next/link";
import { ChevronRight, SearchX } from "lucide-react";
import type { CatalogCategory } from "@/lib/catalog-repository";
import { CategoryCard } from "@/components/home/CategoryCard";
import { SectionTitle } from "@/components/shared/SectionTitle";

const categoryImages: Array<[string, string]> = [
  ["refriger", "/images/cat-refrigeracion.svg"],
  ["lavador", "/images/cat-lavadora.svg"],
  ["aire", "/images/cat-extractor.svg"],
  ["motor", "/images/cat-motores-automotrices.svg"],
  ["herramient", "/images/cat-repuestos-y-accesorios-generales.svg"],
  ["electro", "/images/cat-otros-electrodomesticos.svg"],
];
const priorityKeys = ["refriger", "lavador", "aire", "motor", "herramient", "electro", "repuesto"];

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

export function CategoriesGrid({ categories }: { categories: CatalogCategory[] }) {
  const visibleCategories = prioritizeCategories(categories);

  return (
    <section className="bg-surface-page py-9 sm:py-12" data-home-block="technical-families">
      <div className="cp-container">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SectionTitle eyebrow="Categorías principales" title="Encuentra por línea de producto" description="Explora las familias más consultadas del catálogo." />
          <Link href="/catalogo" className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-brand-secondary-600 hover:text-dark">
            Ver todas <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        {visibleCategories.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {visibleCategories.slice(0, 6).map((category) => (
              <CategoryCard key={category.id} href={"/categoria/" + category.slug} name={category.name} count={category.productCount} imageSrc={imageForCategory(category)} />
            ))}
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-4 rounded-lg border border-dashed border-border bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <SearchX className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-dark">No hay categorías publicadas todavía</h3>
                <p className="mt-1 text-sm leading-5 text-text-secondary">Las categorías aparecerán aquí cuando completen la revisión editorial.</p>
              </div>
            </div>
            <Link href="/catalogo" className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-border px-4 text-sm font-extrabold text-brand-primary-900 transition hover:border-brand-secondary-600 hover:text-brand-secondary-600">
              Explorar catálogo
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
