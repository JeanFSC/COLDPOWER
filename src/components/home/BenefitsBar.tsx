import { Headset, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { benefits } from "@/data/benefits";

const iconMap = {
  ShieldCheck,
  Truck,
  Headset,
  PackageCheck,
} as const;

export function BenefitsBar() {
  return (
    <section className="bg-background py-8">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {benefits.map((benefit) => {
          const Icon = iconMap[benefit.icon] ?? ShieldCheck;

          return (
            <article
              key={benefit.id}
              className="rounded-md border border-border bg-white p-5 shadow-card transition hover:-translate-y-1 hover:shadow-hover"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-base font-extrabold text-dark">{benefit.title}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-text">{benefit.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
