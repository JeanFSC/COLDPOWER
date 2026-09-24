import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Headphones, ShieldCheck, Truck } from "lucide-react";
import { Button } from "@/components/shared/Button";
import type { CompanySettings } from "@/lib/company-settings";

type HeroProps = { settings?: CompanySettings };

export function Hero({ settings }: HeroProps) {
  const coverage = settings?.coverage?.trim() || "Despachos coordinados";

  return (
    <section className="relative isolate min-h-[430px] overflow-hidden border-b border-border bg-white" data-home-block="hero">
      <Image
        src="/images/home/home-v2-hero-hvac.webp"
        alt="Equipos de refrigeración y climatización en una instalación técnica"
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-[63%_center]"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white via-white/95 from-0% via-45% to-white/10 lg:to-transparent" aria-hidden="true" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-white/25 via-transparent to-white/20" aria-hidden="true" />

      <div className="cp-container flex min-h-[430px] items-center">
        <div className="max-w-[650px] py-12 lg:py-14">
          <p className="font-mono text-[11px] font-extrabold uppercase tracking-[0.18em] text-brand-secondary-600">Repuestos para un mundo en movimiento</p>
          <h1 className="mt-4 max-w-[620px] font-display text-[2.55rem] font-black leading-[1.03] tracking-[-0.04em] text-brand-primary-900 sm:text-5xl lg:text-[3.55rem]">
            Todo para refrigeración<br className="hidden sm:block" /> y aire acondicionado <span className="text-brand-secondary-600">en un solo lugar</span>
          </h1>

          <div className="mt-7 grid max-w-[620px] grid-cols-1 gap-3 text-xs font-semibold text-brand-primary-900 sm:grid-cols-3 sm:gap-4">
            <div className="flex items-center gap-2"><ShieldCheck className="h-6 w-6 shrink-0 text-brand-secondary-600" aria-hidden="true" /><span>Catálogo técnico especializado</span></div>
            <div className="flex items-center gap-2"><Truck className="h-6 w-6 shrink-0 text-brand-secondary-600" aria-hidden="true" /><span>{coverage}</span></div>
            <div className="flex items-center gap-2"><Headphones className="h-6 w-6 shrink-0 text-brand-secondary-600" aria-hidden="true" /><span>Asesoría especializada</span></div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/cotizacion" size="md">Solicitar cotización <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
            <Button href="/catalogo" variant="outline" size="md">Explorar catálogo</Button>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-7 right-4 hidden max-w-[250px] rounded-xl border border-white/70 bg-white/90 p-4 shadow-float backdrop-blur sm:block lg:right-[max(2rem,calc((100vw-1320px)/2))]">
          <p className="text-sm font-extrabold text-brand-secondary-600">Asesoría técnica</p>
          <p className="mt-1 text-xs leading-5 text-text-secondary">Para encontrar la referencia adecuada.</p>
        </div>
        <Link href="/contacto?motivo=proyecto" className="absolute right-5 top-8 hidden rotate-[-7deg] font-display text-xl font-black italic text-brand-secondary-600 sm:block lg:right-[max(4rem,calc((100vw-1180px)/2))]">
          Tu proyecto,<br />nuestro respaldo
        </Link>
      </div>
    </section>
  );
}
