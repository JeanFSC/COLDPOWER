import { ArrowUpRight, Home, Snowflake, Store, Wrench } from "lucide-react";
import Link from "next/link";
import { SectionTitle } from "@/components/shared/SectionTitle";

const solutions = [
  { label: "Refrigeracion comercial", description: "Componentes y repuestos para equipos de frio.", icon: Store, query: "refrigeracion-comercial" },
  { label: "Camaras frigorificas", description: "Referencias para temperatura controlada.", icon: Snowflake, query: "camaras-frigorificas" },
  { label: "Aire acondicionado", description: "Partes y herramientas para climatizacion.", icon: Home, query: "aire-acondicionado" },
  { label: "Mantenimiento e instalacion", description: "Herramientas y consumibles tecnicos.", icon: Wrench, query: "mantenimiento" },
] as const;

export function ApplicationSolutions() {
  return (
    <section className="bg-surface-page py-12 sm:py-16" data-home-block="application-solutions">
      <div className="cp-container">
        <SectionTitle eyebrow="Soluciones por aplicacion" title="Busca por el trabajo que necesitas resolver" description="Accesos rapidos hacia familias y filtros relevantes." />
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {solutions.map(({ label, description, icon: Icon, query }) => (
            <Link key={label} href={"/catalogo?aplicacion=" + query} className="group flex min-h-32 items-start gap-4 rounded-md border border-border bg-white p-5 transition hover:border-brand-secondary-600 hover:shadow-card">
              <Icon className="mt-1 h-6 w-6 shrink-0 text-brand-secondary-600" aria-hidden="true" />
              <span><span className="flex items-center gap-2 text-base font-semibold text-brand-primary-900">{label}<ArrowUpRight className="h-4 w-4 text-text-secondary transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-secondary-600" aria-hidden="true" /></span><span className="mt-2 block text-sm leading-6 text-text-secondary">{description}</span></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
