import Link from "next/link";
import { ArrowRight, SearchX } from "lucide-react";
import type { CatalogBrand } from "@/lib/catalog-repository";

const brandColors = ["#0b64d8", "#b9381d", "#1554b5", "#264c9b", "#c82037", "#1164a5", "#153f94", "#0879a8", "#202d45", "#174c9f"];

export function BrandsSection({ brands }: { brands: CatalogBrand[] }) {
  const publicBrands = brands.filter((brand) => brand.productCount > 0).slice(0, 8);

  return (
    <section className="home-section home-section-white home-brands" data-home-block="brands">
      <div className="home-container">
        <div className="home-section-heading">
          <div>
            <h2 className="home-section-title">Navega por fabricante</h2>
            <p className="home-section-subtitle">Las mejores marcas del mercado</p>
          </div>
          <Link href="/catalogo?vista=marcas" prefetch={false} className="home-section-link">
            Ver todas <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        {publicBrands.length > 0 ? (
          <div className="home-brand-row">
            {publicBrands.map((brand, index) => (
              <Link key={brand.id} href={`/catalogo?marca=${encodeURIComponent(brand.slug)}`} prefetch={false} className="home-brand-tile" style={{ color: brandColors[index % brandColors.length] }}>
                <span>{brand.name}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-dashed border-border bg-white p-5 text-sm text-text-secondary">
            <SearchX className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span>Las marcas aparecerán aquí cuando existan referencias publicadas.</span>
          </div>
        )}
      </div>
    </section>
  );
}
