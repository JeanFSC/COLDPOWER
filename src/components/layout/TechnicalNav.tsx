import Link from "next/link";
import { Percent } from "lucide-react";
import type { CatalogCategory, CatalogFamily, CatalogProductType } from "@/lib/catalog-repository";
import { CategoryMegaMenu } from "@/components/layout/CategoryMegaMenu";

const technicalLinks = [
  { label: "Compresores", href: "/catalogo?familia=compresores" },
  { label: "Refrigeración", href: "/categoria/refrigeracion" },
  { label: "Aire acondicionado", href: "/catalogo?familia=aire-acondicionado" },
  { label: "Motores y ventiladores", href: "/catalogo?familia=motores-ventiladores" },
  { label: "Controles", href: "/catalogo?familia=controles" },
  { label: "Herramientas", href: "/catalogo?familia=herramientas" },
  { label: "Repuestos", href: "/categoria/repuestos-y-accesorios-generales" },
] as const;

export function TechnicalNav({ categories = [], families = [], productTypes = [] }: { categories?: CatalogCategory[]; families?: CatalogFamily[]; productTypes?: CatalogProductType[] }) {
  const dynamicLinks = categories
    .filter((category) => category.productCount > 0)
    .slice(0, 8)
    .map((category) => ({ label: category.name, href: `/categoria/${category.slug}` }));
  const links = [...technicalLinks, ...dynamicLinks.filter((link) => !technicalLinks.some((item) => item.href === link.href))].slice(0, 7);

  return (
    <nav aria-label="Navegación técnica" className="home-category-nav" data-testid="technical-nav">
      <div className="home-wide-container home-category-nav-inner">
        <CategoryMegaMenu categories={categories} families={families} productTypes={productTypes} />
        <div className="home-category-links">
          {links.map((link) => <Link key={link.href} href={link.href} prefetch={false}>{link.label}</Link>)}
          <Link href="/catalogo?vista=marcas" prefetch={false}>Marcas</Link>
        </div>
        <Link href="/catalogo?vista=ofertas" prefetch={false} className="home-offers-link"><span>Ofertas</span><Percent aria-hidden="true" /></Link>
      </div>
    </nav>
  );
}
