import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function PromoBanner() {
  return (
    <section className="bg-surface-page py-10 sm:py-14" data-home-block="promo-banner">
      <div className="cp-container">
        <Link
          href="/contacto?motivo=proyecto"
          prefetch={false}
          className="group relative block min-h-[250px] overflow-hidden rounded-2xl bg-brand-primary-900 sm:min-h-[290px]"
        >
          <Image
            src="/images/home/home-v2-brand-trust.webp"
            alt="Compresor hermético para un proyecto de climatización"
            fill
            sizes="100vw"
            className="object-cover object-center transition duration-500 group-hover:scale-[1.02]"
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-brand-primary-900 via-brand-primary-900/90 to-brand-primary-900/10"
            aria-hidden="true"
          />
          <div className="relative flex min-h-[250px] max-w-[610px] flex-col justify-center px-6 py-8 sm:min-h-[290px] sm:px-12">
            <p className="font-mono text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary">
              Proyectos y climatización
            </p>
            <h2 className="mt-3 font-display text-3xl font-black leading-tight text-white sm:text-4xl">
              Tu proyecto, nuestro respaldo
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-gray-light">
              Cuéntanos qué equipo necesitas resolver y recibe orientación comercial para el
              siguiente paso.
            </p>
            <span className="mt-6 inline-flex w-fit items-center gap-2 rounded-pill bg-primary px-5 py-3 text-sm font-extrabold text-white">
              Hablar con un asesor <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}
