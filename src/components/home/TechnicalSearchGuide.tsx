import { ArrowRight, FileCheck2, MessageSquareText, Search, Truck } from "lucide-react";
import Link from "next/link";
import { SectionTitle } from "@/components/shared/SectionTitle";

const steps = [
  {
    label: "Encuentra",
    description: "Busca por código, modelo, marca o especificación.",
    icon: Search,
    href: "/catalogo",
  },
  {
    label: "Revisa la ficha",
    description: "Consulta SKU, familia y datos técnicos publicados.",
    icon: FileCheck2,
    href: "/catalogo",
  },
  {
    label: "Solicita cotización",
    description: "Agrega referencias a tu lista y envía la solicitud.",
    icon: MessageSquareText,
    href: "/cotizacion",
  },
  {
    label: "Coordina",
    description: "Confirma precio, disponibilidad y despacho con el equipo.",
    icon: Truck,
    href: "/contacto",
  },
] as const;

export function TechnicalSearchGuide() {
  return (
    <section className="bg-white py-10 sm:py-14" data-home-block="technical-search">
      <div className="cp-container">
        <SectionTitle
          eyebrow="Cómo comprar"
          title="Avanza con el dato que ya tienes"
          description="Un flujo simple para pasar de la búsqueda técnica a una cotización informada."
        />
        <div className="mt-8 grid gap-0 rounded-2xl border border-border bg-surface-page sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Link
                key={step.label}
                href={step.href}
                className="group relative flex gap-4 border-b border-border p-5 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-secondary-600 last:border-b-0 sm:nth-[2n]:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-secondary-600 text-white">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-secondary-600">
                    0{index + 1}
                  </p>
                  <h3 className="mt-1 text-base font-extrabold text-brand-primary-900">
                    {step.label}
                  </h3>
                  <p className="mt-1 text-sm leading-5 text-text-secondary">{step.description}</p>
                </div>
                <ArrowRight
                  className="absolute right-4 top-5 h-4 w-4 text-text-secondary transition group-hover:translate-x-1 group-hover:text-brand-secondary-600"
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
