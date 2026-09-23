import { FileCheck2, Headphones, PackageCheck, Search, ShieldCheck, Truck } from "lucide-react";
import type { CompanySettings } from "@/lib/company-settings";

export function BenefitsBar({ settings }: { settings?: CompanySettings }) {
  const coverage = settings?.coverage?.trim() || "Despachos coordinados";
  const benefits = [
    {
      id: "search",
      title: "Búsqueda técnica",
      description: "Por código, modelo, marca o especificación.",
      icon: Search,
    },
    {
      id: "catalog",
      title: "Fichas por referencia",
      description: "SKU, familia y especificaciones visibles.",
      icon: FileCheck2,
    },
    {
      id: "advice",
      title: "Asesoría especializada",
      description: "Orientación para el siguiente paso.",
      icon: Headphones,
    },
    {
      id: "quote",
      title: "Cotización asistida",
      description: "Solicitud comercial con seguimiento.",
      icon: PackageCheck,
    },
    {
      id: "delivery",
      title: coverage,
      description: "Condiciones confirmadas antes del despacho.",
      icon: Truck,
    },
    {
      id: "traceability",
      title: "Compra informada",
      description: "Precio y disponibilidad se confirman.",
      icon: ShieldCheck,
    },
  ];

  return (
    <section
      className="border-y border-border bg-white py-8 sm:py-10"
      data-home-block="why-coldpower"
    >
      <div className="cp-container grid gap-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {benefits.map((benefit) => {
          const Icon = benefit.icon;
          return (
            <article
              key={benefit.id}
              className="flex items-start gap-3 border-b border-border px-1 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:px-4 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-secondary-600/10 text-brand-secondary-600">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-extrabold text-dark">{benefit.title}</h2>
                <p className="mt-1 text-xs leading-5 text-gray-text">{benefit.description}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
