import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CatalogBrand } from "@/lib/catalog-repository";
import { SectionTitle } from "@/components/shared/SectionTitle";
import { BrandsDirectory } from "@/components/catalog/BrandsDirectory";

export function BrandsSection({ brands }: { brands: CatalogBrand[] }) {
  const hasPublicBrands = brands.some((brand) => brand.productCount > 0);
  return (
    <section className="bg-surface-page py-12 sm:py-16" data-home-block="brands">
      <div className="cp-container">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><SectionTitle eyebrow="Marcas" title="Navega por fabricante" description="Mostramos marcas presentes en el inventario; no afirmamos distribución oficial sin respaldo documental." /><Link href={hasPublicBrands ? "/catalogo?vista=marcas" : "/catalogo"} className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-brand-secondary-600 hover:text-brand-primary-900">{hasPublicBrands ? "Ver marcas" : "Explorar catálogo"} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div>
        <div className="mt-8"><BrandsDirectory brands={brands} /></div>
      </div>
    </section>
  );
}
