import Image from "next/image";
import { MessageCircle, Search } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { SearchBar } from "@/components/shared/SearchBar";
import { WhatsAppLeadButton } from "@/components/shared/WhatsAppLeadButton";

export function Hero() {
  return (
    <section className="overflow-hidden border-b border-border bg-white" data-home-block="commercial-access">
      <div className="cp-container grid gap-5 py-7 sm:py-10 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:items-center lg:gap-5 lg:py-12">
        <div className="relative z-10 min-w-0 lg:pr-0">
          <p className="font-mono text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand-secondary-600">ColdPower · catálogo técnico</p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-black leading-[1.03] tracking-tight text-brand-primary-900 sm:text-5xl lg:text-[3.45rem]">
            Repuestos para refrigeración, línea blanca y HVAC
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-text-secondary sm:text-base">
            Encuentra por código, modelo, marca o especificación técnica.
          </p>
          <SearchBar id="hero-search" className="mt-5 max-w-xl" placeholder="Busca por código, modelo, marca o especificación..." />
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Button href="/catalogo" size="md"><Search className="h-4 w-4" aria-hidden="true" />Explorar catálogo</Button>
            <Button href="/cotizacion" variant="outline" size="md">Solicitar cotización</Button>
            <WhatsAppLeadButton title="Consulta desde portada" variant="whatsapp" size="md" className="hidden sm:inline-flex">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />WhatsApp
            </WhatsAppLeadButton>
          </div>
        </div>
        <div className="relative -mx-4 min-h-[260px] overflow-hidden sm:-mx-6 sm:min-h-[360px] lg:mx-0 lg:min-h-[440px]">
          <Image
            src="/images/generated/coldpower-hero-products.png"
            alt="Composición editorial de repuestos de refrigeración y HVAC"
            fill
            priority
            sizes="(min-width: 1024px) 62vw, 100vw"
            className="object-contain object-right lg:object-cover lg:object-right lg:scale-110 lg:origin-right"
          />
        </div>
      </div>
    </section>
  );
}
