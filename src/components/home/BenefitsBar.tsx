import { Headset, PackageCheck, ShieldCheck, Truck } from "lucide-react";
const benefits = [
  { id: "search", title: "Busqueda tecnica", description: "Encuentra por codigo, modelo, marca o especificacion.", icon: "ShieldCheck" },
  { id: "advice", title: "Asesoria especializada", description: "Solicita apoyo para revisar compatibilidad y siguiente paso.", icon: "Headset" },
  { id: "quote", title: "Cotizacion asistida", description: "Registra tu solicitud y recibe confirmacion comercial.", icon: "PackageCheck" },
  { id: "delivery", title: "Entrega coordinada", description: "Cobertura y condiciones se confirman antes del despacho.", icon: "Truck" },
] as const;

const iconMap = {
  ShieldCheck,
  Truck,
  Headset,
  PackageCheck,
} as const;

export function BenefitsBar() {
  return (
    <section className="border-b border-border bg-white py-5">
      <div className="cp-container grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map((benefit) => {
          const Icon = iconMap[benefit.icon] ?? ShieldCheck;

          return (
            <article
              key={benefit.id}
              className="flex items-start gap-3 border-b border-border px-1 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:px-4 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-secondary-600/10 text-brand-secondary-600">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0"><h2 className="text-sm font-extrabold text-dark">{benefit.title}</h2>
              <p className="mt-1 text-xs leading-5 text-gray-text">{benefit.description}</p></div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
