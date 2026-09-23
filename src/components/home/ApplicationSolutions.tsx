import { ArrowUpRight, Building2, Home, Snowflake, Wrench } from "lucide-react";
import Link from "next/link";
import { SectionTitle } from "@/components/shared/SectionTitle";

const solutions = [
  {
    label: "Refrigeración comercial",
    description: "Explora referencias para equipos de frío.",
    icon: Building2,
    query: "refrigeracion-comercial",
  },
  {
    label: "Cámaras frigoríficas",
    description: "Busca componentes para temperatura controlada.",
    icon: Snowflake,
    query: "camaras-frigorificas",
  },
  {
    label: "Aire acondicionado",
    description: "Encuentra partes y herramientas de climatización.",
    icon: Home,
    query: "aire-acondicionado",
  },
  {
    label: "Mantenimiento e instalación",
    description: "Consulta herramientas y consumibles técnicos.",
    icon: Wrench,
    query: "mantenimiento",
  },
] as const;

export function ApplicationSolutions() {
  return (
    <section className="bg-surface-page py-10 sm:py-14" data-home-block="application-solutions">
      <div className="cp-container">
        <SectionTitle
          eyebrow="Soluciones por sector"
          title="Busca por el trabajo que necesitas resolver"
          description="Accesos directos a la búsqueda del catálogo y a la orientación comercial."
        />
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {solutions.map(({ label, description, icon: Icon, query }) => (
            <Link
              key={label}
              href={"/catalogo?aplicacion=" + query}
              prefetch={false}
              className="group flex min-h-32 items-start gap-4 rounded-xl border border-border bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand-secondary-600 hover:shadow-card"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-secondary-600/10 text-brand-secondary-600">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="flex items-start gap-2 text-base font-extrabold text-brand-primary-900">
                  <span>{label}</span>
                  <ArrowUpRight
                    className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-secondary-600"
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-2 block text-sm leading-5 text-text-secondary">
                  {description}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
