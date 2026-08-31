import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function PromoBanner() {
  return (
    <section className="bg-surface-page py-6 sm:py-8" data-home-block="promo-banner">
      <div className="cp-container">
        <Link href="/catalogo?categoria=lavadoras" prefetch={false} className="group relative block min-h-[190px] overflow-hidden rounded-md bg-brand-primary-900 sm:min-h-[230px]">
          <Image src="/images/generated/coldpower-washing-parts-banner.png" alt="Repuestos y componentes para lavadoras" fill sizes="100vw" className="object-cover object-center transition duration-500 group-hover:scale-[1.02]" />
          <div className="absolute inset-0 bg-brand-primary-900/20" aria-hidden="true" />
          <div className="relative flex min-h-[190px] max-w-md flex-col justify-center px-6 py-7 sm:min-h-[230px] sm:px-10">
            <p className="font-mono text-[11px] font-extrabold uppercase tracking-[0.16em] text-orange-300">Línea blanca</p>
            <h2 className="mt-2 font-display text-2xl font-black leading-tight text-white sm:text-3xl">Repuestos para lavadoras LG y Samsung</h2>
            <p className="mt-2 text-sm text-gray-light">Motores · Tarjetas · Bombas · Switches</p>
            <span className="mt-5 inline-flex w-fit items-center gap-2 rounded-pill bg-primary px-4 py-2 text-sm font-extrabold text-white">Explorar productos <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
          </div>
        </Link>
      </div>
    </section>
  );
}
