import Link from "next/link";
import type { CatalogBrand } from "@/lib/catalog-repository";

export function BrandsDirectory({ brands }: { brands: CatalogBrand[] }) {
  const publicBrands = brands.filter((brand) => brand.productCount > 0);

  if (publicBrands.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm leading-6 text-text-secondary">
        Las marcas aparecerán aquí cuando existan referencias publicadas.
        <Link href="/catalogo" className="mt-3 block w-fit font-extrabold text-primary hover:underline">Explorar catálogo</Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {publicBrands.map((brand) => (
        <Link key={brand.id} href={`/catalogo?marca=${encodeURIComponent(brand.slug)}`} className="group rounded-md border border-border bg-white p-4 transition hover:-translate-y-0.5 hover:border-brand-secondary-600 hover:shadow-card">
          <span className="block font-mono text-sm font-bold text-brand-primary-900 group-hover:text-brand-secondary-600">{brand.name}</span>
          <span className="mt-2 block text-xs font-semibold text-text-secondary">{brand.productCount} {brand.productCount === 1 ? "referencia" : "referencias"}</span>
        </Link>
      ))}
    </div>
  );
}
