import Link from "next/link";
import { ArrowRight, SearchX } from "lucide-react";
import type { CatalogBrand } from "@/lib/catalog-repository";
import { SectionTitle } from "@/components/shared/SectionTitle";

export function BrandsSection({ brands }: { brands: CatalogBrand[] }) {
  const publicBrands = brands.filter((brand) => brand.productCount > 0);
  return (
    <section className="bg-surface-page py-10 sm:py-14" data-home-block="brands">
      <div className="cp-container">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionTitle
            eyebrow="Marcas en el catálogo"
            title="Navega por fabricante"
            description="Mostramos únicamente marcas con referencias publicadas; no afirmamos distribución oficial sin respaldo documental."
          />
          <Link
            href="/catalogo?vista=marcas"
            prefetch={false}
            className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-brand-secondary-600 hover:text-brand-primary-900"
          >
            Ver marcas <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        {publicBrands.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {publicBrands.slice(0, 10).map((brand) => (
              <Link
                key={brand.id}
                href={"/catalogo?marca=" + encodeURIComponent(brand.slug)}
                prefetch={false}
                className="group rounded-xl border border-border bg-white p-4 transition hover:-translate-y-0.5 hover:border-brand-secondary-600 hover:shadow-card"
              >
                <span className="block truncate font-mono text-sm font-bold text-brand-primary-900 group-hover:text-brand-secondary-600">
                  {brand.name}
                </span>
                <span className="mt-2 block text-xs font-semibold text-text-secondary">
                  {brand.productCount} {brand.productCount === 1 ? "referencia" : "referencias"}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-8 flex items-start gap-3 rounded-xl border border-dashed border-border bg-white p-5 text-sm text-text-secondary">
            <SearchX className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span>Las marcas aparecerán aquí cuando existan referencias publicadas.</span>
          </div>
        )}
      </div>
    </section>
  );
}
