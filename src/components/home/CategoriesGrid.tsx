import Link from "next/link";
import { ArrowRight, DatabaseZap, SearchX } from "lucide-react";
import type { CatalogCategory } from "@/lib/catalog-repository";
import { CategoryCard } from "@/components/home/CategoryCard";

const targetCategories = [
  { name: "Compresores", subtitle: "Herméticos y semiherméticos", keys: ["compresor"], query: "compresor", image: "category-compresores.webp" },
  { name: "Refrigeración", subtitle: "Válvulas, filtros y tuberías", keys: ["refriger"], query: "refrigeración", image: "category-refrigeracion.webp" },
  { name: "Aire acondicionado", subtitle: "Equipos y repuestos", keys: ["aire-acondicionado", "aire acondicionado"], query: "aire acondicionado", image: "category-aire-acondicionado.webp" },
  { name: "Motores y ventiladores", subtitle: "Motores, hélices y accesorios", keys: ["motor", "ventilador"], query: "ventilador", image: "category-motores-ventiladores.webp" },
  { name: "Controles", subtitle: "Termostatos y electrónicos", keys: ["control", "termostat"], query: "control", image: "category-controles.webp" },
  { name: "Herramientas", subtitle: "Equipos para instalación", keys: ["herramient"], query: "herramienta", image: "category-herramientas.webp" },
  { name: "Repuestos", subtitle: "Multimarcas", keys: ["repuesto", "accesorio"], query: "repuesto", image: "category-repuestos.webp" },
  { name: "Línea blanca", subtitle: "Repuestos para electrodomésticos", keys: ["linea-blanca", "lavadora", "electrodom"], query: "línea blanca", image: "category-linea-blanca.webp" },
] as const;

function selectCategories(categories: CatalogCategory[]) {
  const available = categories.filter((category) => category.name.trim().length > 0);
  return targetCategories.map((target) => {
    const category = available.find((candidate) => target.keys.some((key) => `${candidate.name} ${candidate.slug}`.toLowerCase().includes(key)));
    return {
      ...target,
      href: category ? `/catalogo?categoria=${encodeURIComponent(category.slug)}` : `/catalogo?q=${encodeURIComponent(target.query)}`,
    };
  });
}

export function CategoriesGrid({
  categories,
  catalogUnavailable = false,
}: {
  categories: CatalogCategory[];
  catalogUnavailable?: boolean;
}) {
  const visibleCategories = selectCategories(categories);

  return (
    <section className="home-section home-section-white" data-home-block="technical-families">
      <div className="home-container">
        <div className="home-section-heading home-section-heading-compact">
          <div>
            <h2 className="home-section-title">Encuentra por línea de producto</h2>
            <p className="home-section-subtitle">Explora nuestras principales categorías</p>
          </div>
          <Link href="/catalogo" prefetch={false} className="home-section-link">
            Ver todas las categorías <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {catalogUnavailable ? (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-danger/25 bg-white px-5 py-4 text-sm text-text-secondary" role="alert">
            <DatabaseZap className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
            <div>
              <h3 className="font-extrabold text-dark">El catálogo no está disponible temporalmente</h3>
              <p className="mt-1 leading-6">No mostramos categorías de respaldo para evitar presentar información no confirmada.</p>
            </div>
          </div>
        ) : visibleCategories.length > 0 ? (
          <div className="home-category-grid">
            {visibleCategories.map(({ name, subtitle, image, href }) => (
              <CategoryCard
                key={name}
                href={href}
                name={name}
                subtitle={subtitle}
                imageSrc={`/images/home-espejo/${image}`}
              />
            ))}
          </div>
        ) : (
          <div className="mt-5 flex flex-col gap-4 rounded-xl border border-dashed border-border bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <SearchX className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-dark">Aún no hay categorías publicadas</h3>
                <p className="mt-1 text-sm leading-5 text-text-secondary">Las categorías aparecerán aquí cuando completen la revisión editorial.</p>
              </div>
            </div>
            <Link href="/catalogo" prefetch={false} className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-border px-4 text-sm font-extrabold text-brand-primary-900 transition hover:border-brand-secondary-600 hover:text-brand-secondary-600">
              Explorar catálogo
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
