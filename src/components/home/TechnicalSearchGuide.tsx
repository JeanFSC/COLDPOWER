import { ArrowRight, Barcode, Boxes, Cable, ScanSearch } from "lucide-react";
import Link from "next/link";
import { SectionTitle } from "@/components/shared/SectionTitle";

const searchPaths = [
  {
    label: "Tengo un código",
    description: "SKU, MPN, OEM o modelo exacto.",
    icon: Barcode,
    href: "/buscar?modo=codigo",
  },
  {
    label: "Conozco mi equipo",
    description: "Encuentra la familia y aplicación.",
    icon: Boxes,
    href: "/catalogo?modo=equipo",
  },
  {
    label: "Tengo especificaciones",
    description: "Refrigerante, voltaje, capacidad y más.",
    icon: ScanSearch,
    href: "/catalogo?modo=especificaciones",
  },
  {
    label: "Busco un reemplazo",
    description: "Comparamos alternativas y compatibilidad.",
    icon: Cable,
    href: "/contacto?motivo=validacion",
  },
] as const;

export function TechnicalSearchGuide() {
  return (
    <section className="bg-white py-12 sm:py-16" data-home-block="technical-search">
      <div className="cp-container">
        <SectionTitle
          eyebrow="Búsqueda técnica"
          title="Empieza con el dato que ya tienes"
          description="No necesitas conocer el nombre comercial exacto. Conservamos el contexto para ayudarte a encontrar una coincidencia o pedir validación."
        />

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {searchPaths.map((path) => {
            const Icon = path.icon;

            return (
              <Link
                key={path.label}
                href={path.href}
                className="group rounded-md border border-border bg-surface-page p-5 transition hover:-translate-y-0.5 hover:border-brand-secondary-600 hover:shadow-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-secondary-600"
              >
                <div className="flex items-center justify-between">
                  <Icon className="h-6 w-6 text-brand-secondary-600" aria-hidden="true" />
                  <ArrowRight className="h-4 w-4 text-text-secondary transition group-hover:translate-x-1 group-hover:text-brand-secondary-600" aria-hidden="true" />
                </div>
                <h3 className="mt-8 text-base font-semibold text-brand-primary-900">{path.label}</h3>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{path.description}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
