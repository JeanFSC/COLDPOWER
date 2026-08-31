import { ArrowRight, CheckCircle2, RefreshCw, Wrench } from "lucide-react";
import Link from "next/link";
import { SectionTitle } from "@/components/shared/SectionTitle";

const complementGroups = [
  { label: "Alternativas tecnicas", description: "Requieren validacion antes de sustituir una referencia.", icon: RefreshCw, href: "/catalogo?relacion=alternativa" },
  { label: "Compatibles", description: "Se revisan bajo condiciones verificables.", icon: CheckCircle2, href: "/catalogo?relacion=compatible" },
  { label: "Herramientas y consumibles", description: "Apoyan mantenimiento, vacio y carga.", icon: Wrench, href: "/catalogo?relacion=consumible" },
] as const;

export function ComplementsSection() {
  return (
    <section className="bg-white py-12 sm:py-16" data-home-block="complements">
      <div className="cp-container">
        <SectionTitle eyebrow="Kits y complementos" title="Completa una cotizacion con relaciones claras" description="Diferenciamos alternativas, compatibles y complementos para evitar combinaciones tecnicas incorrectas." />
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {complementGroups.map(({ label, description, icon: Icon, href }) => (
            <Link key={label} href={href} className="group rounded-md border border-border bg-surface-page p-5 transition hover:border-brand-secondary-600 hover:shadow-card">
              <Icon className="h-6 w-6 text-brand-secondary-600" aria-hidden="true" />
              <h3 className="mt-5 flex items-center gap-2 text-base font-semibold text-brand-primary-900">{label}<ArrowRight className="h-4 w-4 text-text-secondary transition group-hover:translate-x-1 group-hover:text-brand-secondary-600" aria-hidden="true" /></h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
